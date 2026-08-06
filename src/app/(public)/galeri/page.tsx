import type { Metadata } from "next";
import { PageHero } from "@/components/sections/page-hero";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { galleryImages } from "@/lib/constants/site-data";

export const metadata: Metadata = { title: "Galeri", description: "Album foto kegiatan dan kehidupan jemaat GMAHK Naripan.", alternates: { canonical: "/galeri" } };
const categories = ["Ibadah", "Pemuda", "Anak", "Pelayanan Masyarakat", "Kesehatan"];
const labels = ["Persekutuan dan ibadah jemaat", "Kebersamaan Pemuda Advent", "Kegiatan pelayanan anak", "Pelayanan kasih bagi masyarakat", "Seminar dan pelayanan kesehatan"];
const images = galleryImages.map((src, index) => ({ src, category: categories[index] ?? "Ibadah", alt: labels[index] ?? "Dokumentasi kegiatan jemaat" }));
export default function GalleryPage() { return <><PageHero eyebrow="Momen Kebersamaan" title="Cerita yang tertangkap dalam gambar" description="Melihat kembali sukacita, pelayanan, pembelajaran, dan persekutuan keluarga jemaat." /><section className="section-pad bg-cream"><div className="container-site"><GalleryLightbox images={images} /><div className="mt-12 rounded-2xl bg-white p-7"><h2 className="font-serif text-2xl text-primary">Album: Kehidupan Jemaat 2026</h2><p className="mt-3 text-sm leading-6 text-muted">Pilih foto untuk membuka lightbox. Gunakan tombol panah keyboard, tombol navigasi, atau geser pada layar sentuh.</p></div></div></section></>; }
