"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Images, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { PublicGalleryAlbum } from "@/lib/data/gallery";

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

export function GalleryAlbumGrid({ albums }: { albums: PublicGalleryAlbum[] }) {
  const [category, setCategory] = useState("Semua Album");
  const [query, setQuery] = useState("");
  const categories = useMemo(
    () => ["Semua Album", ...new Set(albums.map((album) => album.category))],
    [albums],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id-ID");
    return albums.filter((album) => {
      if (category !== "Semua Album" && album.category !== category) return false;
      if (!needle) return true;
      return [album.title, album.description, album.category]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID")
        .includes(needle);
    });
  }, [albums, category, query]);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`min-h-11 rounded-full px-5 text-xs font-semibold transition ${
                category === item
                  ? "bg-primary text-white"
                  : "border border-primary/10 bg-white text-primary hover:border-gold"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari album..."
            className="bg-white pl-11"
          />
          <span className="sr-only">Cari album galeri</span>
        </label>
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {filtered.length} album
      </p>

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((album) => (
            <Link
              key={album.id}
              href={`/galeri/${album.slug}`}
              className="group overflow-hidden rounded-[1.75rem] border border-primary/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-primary/5">
                {album.cover ? (
                  <Image
                    src={album.cover}
                    alt={`Cover album ${album.title}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-primary/35">
                    <Images className="size-14" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/65 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-primary backdrop-blur">
                  {album.category}
                </span>
                <span className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-primary/85 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  <Images className="size-3.5" /> {album.imageCount} foto
                </span>
              </div>
              <div className="p-6">
                <h2 className="font-serif text-2xl font-semibold text-primary">
                  {album.title}
                </h2>
                {album.description && (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
                    {album.description}
                  </p>
                )}
                {formatDate(album.eventDate) && (
                  <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-secondary">
                    <CalendarDays className="size-4" /> {formatDate(album.eventDate)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center text-sm text-muted">
          Tidak ada album yang sesuai dengan filter ini.
        </div>
      )}
    </>
  );
}
