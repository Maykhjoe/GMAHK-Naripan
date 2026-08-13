import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireAdminPermission,
} from "@/lib/admin/auth";
import { getAccessibleGalleryAlbum } from "@/lib/admin/gallery-access";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidSchema = z.uuid();
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function GET(request: Request) {
  const auth = await requireAdminPermission("gallery.manage");
  if (isAuthorizationFailure(auth)) return auth;

  const url = new URL(request.url);
  const albumId = url.searchParams.get("albumId") ?? "";
  const search = url.searchParams.get("q")?.trim().slice(0, 80) ?? "";

  if (!uuidSchema.safeParse(albumId).success) {
    return NextResponse.json({ message: "ID album tidak valid" }, { status: 400 });
  }

  const album = await getAccessibleGalleryAlbum(auth, albumId);
  if (!album) {
    return NextResponse.json(
      { message: "Album tidak ditemukan atau tidak dapat diakses" },
      { status: 404 },
    );
  }

  const limited = await enforceRateLimit({
    key: `admin-gallery-library:${auth.user.id}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { message: "Layanan media belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const { data: canManageFiles } = await auth.supabase.rpc("has_permission", {
    permission_code: "files.manage",
  });

  let mediaQuery = admin
    .from("media_files")
    .select("id, bucket, storage_path, file_name, alt_text, mime_type, created_by, created_at")
    .eq("bucket", "public-media")
    .eq("status", "active")
    .in("mime_type", IMAGE_TYPES)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(60);

  if (!auth.isSuperAdmin && !canManageFiles) {
    mediaQuery = mediaQuery.eq("created_by", auth.user.id);
  }

  if (search) {
    mediaQuery = mediaQuery.ilike("file_name", `%${search}%`);
  }

  const [{ data: mediaRows, error: mediaError }, { data: attachedRows }] =
    await Promise.all([
      mediaQuery,
      admin
        .from("gallery_images")
        .select("media_id, status")
        .eq("album_id", albumId),
    ]);

  if (mediaError) {
    return NextResponse.json(
      { message: "Pustaka media tidak dapat dimuat" },
      { status: 500 },
    );
  }

  const attached = new Map(
    (attachedRows ?? []).map((row) => [row.media_id, row.status]),
  );

  const data = (mediaRows ?? []).map((media) => ({
    id: media.id,
    file_name: media.file_name,
    alt_text: media.alt_text,
    created_at: media.created_at,
    attached_status: attached.get(media.id) ?? null,
    url: admin.storage
      .from(media.bucket)
      .getPublicUrl(media.storage_path).data.publicUrl,
  }));

  return NextResponse.json({ data, album });
}
