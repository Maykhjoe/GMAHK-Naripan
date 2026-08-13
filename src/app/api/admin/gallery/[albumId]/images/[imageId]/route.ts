import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { getAccessibleGalleryAlbum } from "@/lib/admin/gallery-access";
import { revalidatePublicContent } from "@/lib/cache/public-content";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidSchema = z.uuid();
const payloadSchema = z
  .object({
    title: z.string().trim().max(140).nullable().optional(),
    description: z.string().trim().max(600).nullable().optional(),
    alt_text: z.string().trim().max(250).nullable().optional(),
    display_order: z.number().int().min(0).max(10000).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    set_cover: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan");

async function context(albumId: string, imageId: string) {
  if (
    !uuidSchema.safeParse(albumId).success ||
    !uuidSchema.safeParse(imageId).success
  ) {
    return { response: NextResponse.json({ message: "ID tidak valid" }, { status: 400 }) };
  }

  const auth = await requireAdminPermission("gallery.manage");
  if (isAuthorizationFailure(auth)) return { response: auth };

  const album = await getAccessibleGalleryAlbum(auth, albumId);
  if (!album) {
    return {
      response: NextResponse.json(
        { message: "Album tidak ditemukan atau tidak dapat diakses" },
        { status: 404 },
      ),
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      response: NextResponse.json(
        { message: "Layanan galeri belum dikonfigurasi" },
        { status: 503 },
      ),
    };
  }

  const { data: image, error } = await admin
    .from("gallery_images")
    .select("id, album_id, media_id, status, display_order")
    .eq("id", imageId)
    .eq("album_id", albumId)
    .maybeSingle();

  if (error || !image) {
    return {
      response: NextResponse.json(
        { message: "Foto album tidak ditemukan" },
        { status: 404 },
      ),
    };
  }

  return { auth, album, admin, image };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ albumId: string; imageId: string }> },
) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  }

  const { albumId, imageId } = await params;
  const ctx = await context(albumId, imageId);
  if ("response" in ctx) return ctx.response;

  const limited = await enforceRateLimit({
    key: `admin-gallery-image-update:${ctx.auth.user.id}`,
    limit: 240,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON tidak valid" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data foto tidak valid" },
      { status: 422 },
    );
  }

  const { set_cover: setCover, alt_text: altTextInput, ...updates } = parsed.data;
  if (updates.title === "") updates.title = null;
  if (updates.description === "") updates.description = null;

  if (altTextInput !== undefined) {
    const { data: canManageFiles } = await ctx.auth.supabase.rpc("has_permission", {
      permission_code: "files.manage",
    });
    const { data: media } = await ctx.admin
      .from("media_files")
      .select("created_by")
      .eq("id", ctx.image.media_id)
      .maybeSingle();

    if (!media || (!ctx.auth.isSuperAdmin && !canManageFiles && media.created_by !== ctx.auth.user.id)) {
      return NextResponse.json(
        { message: "Alt text media tersebut tidak dapat diubah oleh akun ini" },
        { status: 403 },
      );
    }

    const { error: altError } = await ctx.admin
      .from("media_files")
      .update({ alt_text: altTextInput === "" ? null : altTextInput })
      .eq("id", ctx.image.media_id);

    if (altError) {
      return NextResponse.json(
        { message: "Alt text foto tidak dapat diperbarui" },
        { status: 500 },
      );
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await ctx.auth.supabase
      .from("gallery_images")
      .update(updates)
      .eq("id", imageId)
      .eq("album_id", albumId);

    if (updateError) {
      console.error("[admin:gallery] image update failed", {
        code: updateError.code,
        message: updateError.message,
      });
      return NextResponse.json(
        { message: "Foto tidak dapat diperbarui" },
        { status: 500 },
      );
    }
  }

  if (setCover) {
    if (updates.status === "inactive" || ctx.image.status === "inactive") {
      return NextResponse.json(
        { message: "Foto nonaktif tidak dapat dijadikan cover" },
        { status: 422 },
      );
    }

    const { error: coverError } = await ctx.auth.supabase
      .from("gallery_albums")
      .update({ cover_id: ctx.image.media_id })
      .eq("id", albumId);

    if (coverError) {
      return NextResponse.json(
        { message: "Cover album tidak dapat diperbarui" },
        { status: 500 },
      );
    }
  }

  if (updates.status === "inactive" && ctx.album.cover_id === ctx.image.media_id) {
    const { data: replacement } = await ctx.admin
      .from("gallery_images")
      .select("media_id")
      .eq("album_id", albumId)
      .eq("status", "active")
      .neq("id", imageId)
      .order("display_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    await ctx.auth.supabase
      .from("gallery_albums")
      .update({ cover_id: replacement?.media_id ?? null })
      .eq("id", albumId);
  }

  revalidatePublicContent("galeri", ctx.album);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ albumId: string; imageId: string }> },
) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  }

  const { albumId, imageId } = await params;
  const ctx = await context(albumId, imageId);
  if ("response" in ctx) return ctx.response;

  const { error } = await ctx.auth.supabase
    .from("gallery_images")
    .update({ status: "inactive" })
    .eq("id", imageId)
    .eq("album_id", albumId);

  if (error) {
    return NextResponse.json(
      { message: "Foto tidak dapat dinonaktifkan" },
      { status: 500 },
    );
  }

  if (ctx.album.cover_id === ctx.image.media_id) {
    const { data: replacement } = await ctx.admin
      .from("gallery_images")
      .select("media_id")
      .eq("album_id", albumId)
      .eq("status", "active")
      .neq("id", imageId)
      .order("display_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    await ctx.auth.supabase
      .from("gallery_albums")
      .update({ cover_id: replacement?.media_id ?? null })
      .eq("id", albumId);
  }

  revalidatePublicContent("galeri", ctx.album);
  return NextResponse.json({ success: true });
}
