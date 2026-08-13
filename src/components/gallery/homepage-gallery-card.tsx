import Image from "next/image";
import Link from "next/link";

import type { PublicGalleryImage } from "@/lib/data/gallery";

export function HomepageGalleryCard({
  item,
  albumSlug,
  albumTitle,
  index,
}: {
  item: PublicGalleryImage;
  albumSlug: string;
  albumTitle: string;
  index: number;
}) {
  return (
    <Link
      href={`/galeri/${albumSlug}`}
      className={`group relative overflow-hidden rounded-2xl ${
        index === 0 ? "md:col-span-2 md:row-span-2" : ""
      }`}
      aria-label={`Buka album ${albumTitle}`}
    >
      <Image
        src={item.src}
        alt={item.alt}
        fill
        className="object-cover transition duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, 40vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-transparent to-transparent opacity-85" />
      <div className="absolute inset-x-5 bottom-5 text-white">
        <p className="line-clamp-1 text-sm font-semibold">{item.title || albumTitle}</p>
        {item.title && (
          <p className="mt-1 line-clamp-1 text-[11px] text-white/70">{albumTitle}</p>
        )}
      </div>
    </Link>
  );
}
