import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { getAccessibleGalleryAlbum } from "@/lib/admin/gallery-access";
import {
  mediaStoragePath,
  safeOriginalFileName,
  validateUploadFile,
} from "@/lib/admin/media";
import { revalidatePublicContent } from "@/lib/cache/public-content";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { requestBodyExceeds } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidSchema = z.uuid();
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function publicUrl(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  bucket: string,
  storagePath: string,
) {
  return admin.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

async function ensureAlbum(
  albumId: string,
  auth: Awaited<ReturnType<typeof requireAdminPermission>>,
) {
  if (isAuthorizationFailure(auth)) return null;
  return getAccessibleGalleryAlbum(auth, albumId);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ albumId: string }> },
) {
  const { albumId } = await params;
  if (!uuidSchema.safeParse(albumId).success) {
    return NextResponse.json({ message: "ID album tidak valid" }, { status: 400 });
  }

  const auth = await requireAdminPermission("gallery.manage");
  if (isAuthorizationFailure(auth)) return auth;

  const album = await ensureAlbum(albumId, auth);
  if (!album) {
    return NextResponse.json(
      { message: "Album tidak ditemukan atau tidak dapat diakses" },
      { status: 404 },
    );
  }

  const limited = await enforceRateLimit({
    key: `admin-gallery-images:${albumId}:${auth.user.id}`,
    limit: 180,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { message: "Layanan galeri belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const { data: images, error: imageError } = await admin
    .from("gallery_images")
    .select(
      "id, album_id, media_id, title, description, display_order, status, created_at, updated_at",
    )
    .eq("album_id", albumId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imageError) {
    console.error("[admin:gallery] image list failed", {
      code: imageError.code,
      message: imageError.message,
    });
    return NextResponse.json(
      { message: "Foto album tidak dapat dimuat" },
      { status: 500 },
    );
  }

  const mediaIds = (images ?? []).map((image) => image.media_id);
  const mediaMap = new Map<
    string,
    {
      id: string;
      bucket: string;
      storage_path: string;
      file_name: string;
      alt_text: string | null;
      mime_type: string;
    }
  >();

  if (mediaIds.length > 0) {
    const { data: mediaRows, error: mediaError } = await admin
      .from("media_files")
      .select("id, bucket, storage_path, file_name, alt_text, mime_type")
      .in("id", mediaIds)
      .is("deleted_at", null);

    if (mediaError) {
      console.error("[admin:gallery] image media list failed", {
        code: mediaError.code,
        message: mediaError.message,
      });
    }

    for (const media of mediaRows ?? []) {
      mediaMap.set(media.id, media);
    }
  }

  const data = (images ?? []).flatMap((image) => {
    const media = mediaMap.get(image.media_id);
    if (!media || media.bucket !== "public-media") return [];

    return [
      {
        ...image,
        file_name: media.file_name,
        alt_text: media.alt_text,
        mime_type: media.mime_type,
        url: publicUrl(admin, media.bucket, media.storage_path),
      },
    ];
  });

  return NextResponse.json({ data, album });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ albumId: string }> },
) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  }

  const { albumId } = await params;
  if (!uuidSchema.safeParse(albumId).success) {
    return NextResponse.json({ message: "ID album tidak valid" }, { status: 400 });
  }

  const auth = await requireAdminPermission("gallery.manage");
  if (isAuthorizationFailure(auth)) return auth;

  const album = await ensureAlbum(albumId, auth);
  if (!album) {
    return NextResponse.json(
      { message: "Album tidak ditemukan atau tidak dapat diakses" },
      { status: 404 },
    );
  }

  const limited = await enforceRateLimit({
    key: `admin-gallery-upload:${auth.user.id}`,
    limit: 60,
    windowMs: 10 * 60_000,
    message: "Terlalu banyak upload galeri. Silakan tunggu beberapa menit.",
  });
  if (limited) return limited;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { message: "Layanan galeri belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "JSON tidak valid" }, { status: 400 });
    }

    const parsed = z
      .object({
        mediaId: z.uuid(),
        title: z.string().trim().max(140).optional(),
        description: z.string().trim().max(600).optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Data media tidak valid" },
        { status: 422 },
      );
    }

    const { data: media, error: mediaError } = await admin
      .from("media_files")
      .select(
        "id, bucket, storage_path, file_name, alt_text, mime_type, created_by, status",
      )
      .eq("id", parsed.data.mediaId)
      .eq("bucket", "public-media")
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();

    if (
      mediaError ||
      !media ||
      !IMAGE_TYPES.includes(media.mime_type as (typeof IMAGE_TYPES)[number])
    ) {
      return NextResponse.json(
        { message: "Media gambar tidak ditemukan" },
        { status: 404 },
      );
    }

    const { data: canManageFiles } = await auth.supabase.rpc("has_permission", {
      permission_code: "files.manage",
    });

    if (!auth.isSuperAdmin && !canManageFiles && media.created_by !== auth.user.id) {
      return NextResponse.json(
        { message: "Media tersebut tidak dapat digunakan oleh akun ini" },
        { status: 403 },
      );
    }

    const { data: existing } = await admin
      .from("gallery_images")
      .select("id, status")
      .eq("album_id", albumId)
      .eq("media_id", media.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json(
          { message: "Foto sudah ada di album ini" },
          { status: 409 },
        );
      }

      const { error: restoreError } = await auth.supabase
        .from("gallery_images")
        .update({ status: "active" })
        .eq("id", existing.id)
        .eq("album_id", albumId);

      if (restoreError) {
        return NextResponse.json(
          { message: "Foto tidak dapat dipulihkan ke album" },
          { status: 500 },
        );
      }

      if (!album.cover_id) {
        await auth.supabase
          .from("gallery_albums")
          .update({ cover_id: media.id })
          .eq("id", albumId);
      }

      revalidatePublicContent("galeri", album);
      return NextResponse.json({ restored: true }, { status: 200 });
    }

    const { data: lastImage } = await admin
      .from("gallery_images")
      .select("display_order")
      .eq("album_id", albumId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: insertError } = await auth.supabase
      .from("gallery_images")
      .insert({
        album_id: albumId,
        media_id: media.id,
        title: parsed.data.title || null,
        description: parsed.data.description || null,
        display_order: (lastImage?.display_order ?? -1) + 1,
        status: "active",
        created_by: auth.user.id,
      });

    if (insertError) {
      console.error("[admin:gallery] attach media failed", {
        code: insertError.code,
        message: insertError.message,
      });
      return NextResponse.json(
        { message: "Media tidak dapat ditambahkan ke album" },
        { status: 500 },
      );
    }

    if (!album.cover_id) {
      await auth.supabase
        .from("gallery_albums")
        .update({ cover_id: media.id })
        .eq("id", albumId);
    }

    revalidatePublicContent("galeri", album);
    return NextResponse.json({ attached: true }, { status: 201 });
  }

  if (requestBodyExceeds(request, MAX_IMAGE_BYTES + 256 * 1024)) {
    return NextResponse.json(
      { message: "Ukuran foto maksimal 5 MB" },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Form upload tidak valid" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: "Pilih foto untuk diunggah" },
      { status: 400 },
    );
  }

  const validation = await validateUploadFile(file, {
    allowedTypes: IMAGE_TYPES,
    maxBytes: MAX_IMAGE_BYTES,
  });

  if (!validation.success) {
    return NextResponse.json(
      { message: validation.message },
      { status: 422 },
    );
  }

  const title = String(form.get("title") ?? "").trim().slice(0, 140);
  const description = String(form.get("description") ?? "").trim().slice(0, 600);
  const altText =
    String(form.get("altText") ?? "").trim().slice(0, 250) ||
    title ||
    `Dokumentasi ${album.title}`;

  const bucket = "public-media";
  const storagePath = mediaStoragePath(auth.user.id, file.name);
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(storagePath, file, {
      contentType: validation.mimeType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("[admin:gallery] storage upload failed", {
      code: uploadError.name,
      message: uploadError.message,
    });
    return NextResponse.json(
      { message: "Foto tidak dapat diunggah" },
      { status: 500 },
    );
  }

  const { data: media, error: mediaError } = await admin
    .from("media_files")
    .insert({
      bucket,
      storage_path: storagePath,
      file_name: safeOriginalFileName(file.name),
      mime_type: validation.mimeType,
      size_bytes: file.size,
      alt_text: altText,
      status: "active",
      created_by: auth.user.id,
      metadata: { usage: "gallery-image", albumId },
    })
    .select("id, file_name, bucket, storage_path, alt_text, mime_type")
    .single();

  if (mediaError || !media) {
    await admin.storage.from(bucket).remove([storagePath]);
    console.error("[admin:gallery] media metadata insert failed", {
      code: mediaError?.code,
      message: mediaError?.message,
    });
    return NextResponse.json(
      { message: "Metadata foto tidak dapat disimpan" },
      { status: 500 },
    );
  }

  const { data: lastImage } = await admin
    .from("gallery_images")
    .select("display_order")
    .eq("album_id", albumId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: galleryImage, error: galleryError } = await auth.supabase
    .from("gallery_images")
    .insert({
      album_id: albumId,
      media_id: media.id,
      title: title || null,
      description: description || null,
      display_order: (lastImage?.display_order ?? -1) + 1,
      status: "active",
      created_by: auth.user.id,
    })
    .select(
      "id, album_id, media_id, title, description, display_order, status, created_at, updated_at",
    )
    .single();

  if (galleryError || !galleryImage) {
    await admin.from("media_files").delete().eq("id", media.id);
    await admin.storage.from(bucket).remove([storagePath]);
    console.error("[admin:gallery] gallery image insert failed", {
      code: galleryError?.code,
      message: galleryError?.message,
    });
    return NextResponse.json(
      { message: "Foto tidak dapat ditambahkan ke album" },
      { status: 500 },
    );
  }

  if (!album.cover_id) {
    await auth.supabase
      .from("gallery_albums")
      .update({ cover_id: media.id })
      .eq("id", albumId);
  }

  revalidatePublicContent("galeri", album);

  return NextResponse.json(
    {
      data: {
        ...galleryImage,
        file_name: media.file_name,
        alt_text: media.alt_text,
        mime_type: media.mime_type,
        url: publicUrl(admin, media.bucket, media.storage_path),
      },
    },
    { status: 201 },
  );
}
