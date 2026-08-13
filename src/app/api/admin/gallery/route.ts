import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireAdminPermission,
} from "@/lib/admin/auth";
import {
  getResourceCapabilities,
  getResourceScope,
} from "@/lib/admin/access-control";
import { getAdminResource } from "@/lib/admin/resources";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdminPermission("gallery.manage");
  if (isAuthorizationFailure(auth)) return auth;

  const limited = await enforceRateLimit({
    key: `admin-gallery-summary:${auth.user.id}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const resource = getAdminResource("galeri");
  if (!resource) {
    return NextResponse.json(
      { message: "Konfigurasi galeri tidak ditemukan" },
      { status: 500 },
    );
  }

  const scope = getResourceScope("galeri", auth);
  const capabilities = getResourceCapabilities("galeri", resource, auth);

  let albumQuery = auth.supabase
    .from("gallery_albums")
    .select("*")
    .is("deleted_at", null)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (scope.kind === "owner") {
    albumQuery = albumQuery.eq(scope.column, auth.user.id);
  }

  const { data: albums, error: albumError } = await albumQuery;
  if (albumError) {
    console.error("[admin:gallery] summary album query failed", {
      code: albumError.code,
      message: albumError.message,
    });
    return NextResponse.json(
      { message: "Album galeri tidak dapat dimuat" },
      { status: 500 },
    );
  }

  const albumRows = albums ?? [];
  if (albumRows.length === 0) {
    return NextResponse.json({ data: [], capabilities });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { message: "Layanan galeri belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const albumIds = albumRows.map((album) => album.id);
  const { data: imageRows, error: imageError } = await admin
    .from("gallery_images")
    .select("album_id, media_id, status")
    .in("album_id", albumIds);

  if (imageError) {
    console.error("[admin:gallery] summary image query failed", {
      code: imageError.code,
      message: imageError.message,
    });
  }

  const coverIds = albumRows
    .map((album) => album.cover_id)
    .filter((value): value is string => typeof value === "string");

  const mediaById = new Map<string, { bucket: string; storage_path: string }>();
  if (coverIds.length > 0) {
    const { data: mediaRows, error: mediaError } = await admin
      .from("media_files")
      .select("id, bucket, storage_path")
      .in("id", coverIds)
      .eq("bucket", "public-media")
      .is("deleted_at", null);

    if (mediaError) {
      console.error("[admin:gallery] cover media query failed", {
        code: mediaError.code,
        message: mediaError.message,
      });
    }

    for (const media of mediaRows ?? []) {
      mediaById.set(media.id, media);
    }
  }

  const countByAlbum = new Map<string, number>();
  for (const image of imageRows ?? []) {
    if (image.status !== "active") continue;
    countByAlbum.set(
      image.album_id,
      (countByAlbum.get(image.album_id) ?? 0) + 1,
    );
  }

  const data = albumRows.map((album) => {
    const media = album.cover_id ? mediaById.get(album.cover_id) : undefined;
    const coverUrl = media
      ? admin.storage.from(media.bucket).getPublicUrl(media.storage_path).data
          .publicUrl
      : null;

    return {
      ...album,
      image_count: countByAlbum.get(album.id) ?? 0,
      cover_url: coverUrl,
    };
  });

  return NextResponse.json({ data, capabilities });
}
