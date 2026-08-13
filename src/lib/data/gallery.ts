import "server-only";

import { cache } from "react";

import { galleryImages as fallbackGalleryImages } from "@/lib/constants/site-data";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicGalleryImage = {
  id: string;
  mediaId: string;
  src: string;
  alt: string;
  title: string | null;
  description: string | null;
  displayOrder: number;
};

export type PublicGalleryAlbum = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  category: string;
  cover: string | null;
  imageCount: number;
  images: PublicGalleryImage[];
  publishedAt: string;
  updatedAt: string;
};

type AlbumRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_date: string | null;
  category: string | null;
  cover_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type ImageRow = {
  id: string;
  album_id: string;
  media_id: string;
  title: string | null;
  description: string | null;
  display_order: number;
};

type MediaRow = {
  id: string;
  bucket: string;
  storage_path: string;
  file_name: string;
  alt_text: string | null;
  mime_type: string;
};

const FALLBACK_CATEGORY = "Kehidupan Jemaat";

function fallbackAlbum(): PublicGalleryAlbum {
  const now = new Date().toISOString();
  const images = fallbackGalleryImages.map((src, index) => ({
    id: `fallback-${index + 1}`,
    mediaId: `fallback-media-${index + 1}`,
    src,
    alt: `Dokumentasi kehidupan jemaat ${index + 1}`,
    title: null,
    description: null,
    displayOrder: index,
  }));

  return {
    id: "fallback-gallery",
    slug: "kehidupan-jemaat",
    title: "Kehidupan Jemaat",
    description:
      "Momen kebersamaan, ibadah, pelayanan, dan pertumbuhan keluarga jemaat.",
    eventDate: null,
    category: FALLBACK_CATEGORY,
    cover: images[0]?.src ?? null,
    imageCount: images.length,
    images,
    publishedAt: now,
    updatedAt: now,
  };
}

function publicUrl(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  media: MediaRow,
) {
  return admin.storage.from(media.bucket).getPublicUrl(media.storage_path).data
    .publicUrl;
}

async function loadAlbums(): Promise<PublicGalleryAlbum[]> {
  const admin = createAdminClient();
  if (!admin) return [fallbackAlbum()];

  const now = new Date().toISOString();
  const { data: albums, error: albumError } = await admin
    .from("gallery_albums")
    .select(
      "id, slug, title, description, event_date, category, cover_id, published_at, created_at, updated_at",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", now)
    .order("display_order", { ascending: true })
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (albumError) {
    console.error("Gagal mengambil album galeri publik:", albumError.message);
    return [fallbackAlbum()];
  }

  const albumRows = (albums ?? []) as AlbumRow[];
  if (albumRows.length === 0) {
    const { count } = await admin
      .from("gallery_albums")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    return count && count > 0 ? [] : [fallbackAlbum()];
  }

  const albumIds = albumRows.map((album) => album.id);
  const { data: galleryImages, error: imageError } = await admin
    .from("gallery_images")
    .select(
      "id, album_id, media_id, title, description, display_order",
    )
    .in("album_id", albumIds)
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imageError) {
    console.error("Gagal mengambil foto galeri publik:", imageError.message);
    return albumRows.map((album) => ({
      id: album.id,
      slug: album.slug,
      title: album.title,
      description: album.description,
      eventDate: album.event_date,
      category: album.category?.trim() || FALLBACK_CATEGORY,
      cover: null,
      imageCount: 0,
      images: [],
      publishedAt: album.published_at || album.created_at,
      updatedAt: album.updated_at,
    }));
  }

  const imageRows = (galleryImages ?? []) as ImageRow[];
  const mediaIds = [
    ...new Set([
      ...imageRows.map((image) => image.media_id),
      ...albumRows
        .map((album) => album.cover_id)
        .filter((id): id is string => Boolean(id)),
    ]),
  ];

  const mediaMap = new Map<string, MediaRow>();
  if (mediaIds.length > 0) {
    const { data: mediaRows, error: mediaError } = await admin
      .from("media_files")
      .select("id, bucket, storage_path, file_name, alt_text, mime_type")
      .in("id", mediaIds)
      .eq("bucket", "public-media")
      .eq("status", "active")
      .is("deleted_at", null);

    if (mediaError) {
      console.error("Gagal mengambil media galeri publik:", mediaError.message);
    }

    for (const media of (mediaRows ?? []) as MediaRow[]) {
      if (media.mime_type.startsWith("image/")) mediaMap.set(media.id, media);
    }
  }

  const imagesByAlbum = new Map<string, PublicGalleryImage[]>();
  for (const image of imageRows) {
    const media = mediaMap.get(image.media_id);
    if (!media) continue;

    const mapped: PublicGalleryImage = {
      id: image.id,
      mediaId: image.media_id,
      src: publicUrl(admin, media),
      alt:
        media.alt_text?.trim() ||
        image.title?.trim() ||
        media.file_name ||
        "Dokumentasi kegiatan jemaat",
      title: image.title?.trim() || null,
      description: image.description?.trim() || null,
      displayOrder: image.display_order,
    };

    const current = imagesByAlbum.get(image.album_id) ?? [];
    current.push(mapped);
    imagesByAlbum.set(image.album_id, current);
  }

  return albumRows.map((album) => {
    const images = imagesByAlbum.get(album.id) ?? [];
    const coverMedia = album.cover_id ? mediaMap.get(album.cover_id) : null;
    const cover = coverMedia
      ? publicUrl(admin, coverMedia)
      : images[0]?.src ?? null;

    return {
      id: album.id,
      slug: album.slug,
      title: album.title,
      description: album.description,
      eventDate: album.event_date,
      category: album.category?.trim() || FALLBACK_CATEGORY,
      cover,
      imageCount: images.length,
      images,
      publishedAt: album.published_at || album.created_at,
      updatedAt: album.updated_at,
    };
  });
}

export async function getPublishedGalleryAlbums() {
  return loadAlbums();
}

async function loadAlbumBySlug(slug: string) {
  const albums = await loadAlbums();
  return albums.find((album) => album.slug === slug) ?? null;
}

export const getPublishedGalleryAlbumBySlug = cache(loadAlbumBySlug);

export async function getGalleryHomepagePreview(limit = 5) {
  const albums = await loadAlbums();
  const items = albums.flatMap((album) =>
    album.images.map((image) => ({
      ...image,
      albumSlug: album.slug,
      albumTitle: album.title,
      category: album.category,
    })),
  );

  return items.slice(0, Math.max(1, limit));
}
