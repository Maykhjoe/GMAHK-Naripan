import "server-only";

import type { AuthorizedAdmin } from "@/lib/admin/auth";

export type GalleryAlbumAccess = {
  id: string;
  slug: string;
  title: string;
  cover_id: string | null;
};

export async function getAccessibleGalleryAlbum(
  auth: AuthorizedAdmin,
  albumId: string,
): Promise<GalleryAlbumAccess | null> {
  const { data, error } = await auth.supabase
    .from("gallery_albums")
    .select("id, slug, title, cover_id")
    .eq("id", albumId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[admin:gallery] album access lookup failed", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data as GalleryAlbumAccess | null;
}
