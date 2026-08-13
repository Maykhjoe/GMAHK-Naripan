import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Images } from "lucide-react";

import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { MotionSection } from "@/components/motion/motion-section";
import { PageHero } from "@/components/sections/page-hero";
import { getPublishedGalleryAlbumBySlug } from "@/lib/data/gallery";

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const album = await getPublishedGalleryAlbumBySlug(slug);
  if (!album) return { title: "Album tidak ditemukan" };

  return {
    title: album.title,
    description:
      album.description || `Album foto ${album.title} GMAHK Jemaat Naripan.`,
    alternates: { canonical: `/galeri/${album.slug}` },
    openGraph: album.cover ? { images: [{ url: album.cover }] } : undefined,
  };
}

export default async function GalleryAlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await getPublishedGalleryAlbumBySlug(slug);
  if (!album) notFound();

  const date = formatDate(album.eventDate);
  const images = album.images.map((image) => ({
    src: image.src,
    alt: image.alt,
    category: album.category,
    title: image.title,
    description: image.description,
  }));

  return (
    <>
      <PageHero
        eyebrow={album.category}
        title={album.title}
        description={
          album.description || "Dokumentasi kegiatan dan kebersamaan keluarga jemaat."
        }
      />
      <MotionSection className="section-pad bg-cream">
        <div className="container-site">
          <Link
            href="/galeri"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/15 bg-white px-5 text-sm font-semibold text-primary transition hover:border-gold"
          >
            <ArrowLeft className="size-4" /> Kembali ke semua album
          </Link>

          <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-secondary">
            {date && (
              <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2">
                <CalendarDays className="size-4" /> {date}
              </span>
            )}
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2">
              <Images className="size-4" /> {album.imageCount} foto
            </span>
          </div>

          <div className="mt-8">
            <GalleryLightbox images={images} showCategoryFilter={false} />
          </div>
        </div>
      </MotionSection>
    </>
  );
}
