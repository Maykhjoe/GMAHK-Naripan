import type { Metadata } from "next";

import { GalleryAlbumGrid } from "@/components/gallery/gallery-album-grid";
import { MotionSection } from "@/components/motion/motion-section";
import { PageHero } from "@/components/sections/page-hero";
import { getPublishedGalleryAlbums } from "@/lib/data/gallery";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Album foto kegiatan dan kehidupan jemaat GMAHK Naripan.",
  alternates: { canonical: "/galeri" },
};

export const revalidate = 60;

export default async function GalleryPage() {
  const albums = await getPublishedGalleryAlbums();

  return (
    <>
      <PageHero
        eyebrow="Momen Kebersamaan"
        title="Cerita yang tertangkap dalam gambar"
        description="Melihat kembali sukacita, pelayanan, pembelajaran, dan persekutuan keluarga jemaat."
      />
      <MotionSection className="section-pad bg-cream">
        <div className="container-site">
          <GalleryAlbumGrid albums={albums} />
        </div>
      </MotionSection>
    </>
  );
}
