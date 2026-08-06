"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { wrapGalleryIndex } from "@/lib/gallery";

type GalleryImage = { src: string; alt: string; category: string };
export function GalleryLightbox({ images }: { images: GalleryImage[] }) {
  const [category, setCategory] = useState("Semua Album"); const [selectedIndex, setSelectedIndex] = useState<number | null>(null); const touchStart = useRef<number | null>(null);
  const categories = ["Semua Album", ...new Set(images.map((item) => item.category))];
  const filtered = category === "Semua Album" ? images : images.filter((item) => item.category === category);
  const move = useCallback((offset: number) => { setSelectedIndex((current) => current === null ? null : wrapGalleryIndex(current + offset, filtered.length)); }, [filtered.length]);
  useEffect(() => {
    if (selectedIndex === null) return;
    function keydown(event: KeyboardEvent) { if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); }
    window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown);
  }, [move, selectedIndex]);
  const selected = selectedIndex === null ? null : filtered[selectedIndex];
  return <><div className="flex flex-wrap gap-2">{categories.map((item) => <button key={item} onClick={() => { setCategory(item); setSelectedIndex(null); }} aria-pressed={category === item} className={`min-h-11 rounded-full px-5 text-xs font-semibold transition ${category === item ? "bg-primary text-white" : "bg-white text-primary hover:bg-primary/5"}`}>{item}</button>)}</div>
    <p className="mt-6 text-sm text-muted" aria-live="polite">{filtered.length} foto</p>
    <div className="mt-6 grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((item, index) => <button key={`${item.src}-${item.category}`} onClick={() => setSelectedIndex(index)} className={`group relative overflow-hidden rounded-2xl text-left ${index % 5 === 0 ? "sm:row-span-2" : ""}`} aria-label={`Buka foto: ${item.alt}`}><Image src={item.src} alt={item.alt} fill sizes="(max-width:768px) 100vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" /><span className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent opacity-70" /><span className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-sm font-semibold text-white"><span>{item.alt}</span><ZoomIn className="size-5 shrink-0" /></span></button>)}</div>
    {!filtered.length && <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center text-sm text-muted">Belum ada foto pada album ini.</div>}
    <Dialog.Root open={selected !== null} onOpenChange={(value) => { if (!value) setSelectedIndex(null); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md" /><Dialog.Content onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current; if (Math.abs(distance) > 50) move(distance > 0 ? -1 : 1); touchStart.current = null; }} className="fixed inset-0 z-[111] flex items-center justify-center p-4 sm:p-10"><Dialog.Title className="sr-only">Pratinjau galeri</Dialog.Title><Dialog.Description className="sr-only">Gunakan tombol panah atau geser untuk berpindah foto.</Dialog.Description>{selected && <><div className="relative h-full w-full max-w-6xl"><Image src={selected.src} alt={selected.alt} fill sizes="100vw" className="object-contain" priority /></div><div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm text-white sm:bottom-6"><p className="font-semibold">{selected.alt}</p><p className="mt-1 text-white/65">{(selectedIndex ?? 0) + 1} / {filtered.length}</p></div><button onClick={() => move(-1)} className="absolute left-3 grid size-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 sm:left-7" aria-label="Foto sebelumnya"><ChevronLeft className="size-6" /></button><button onClick={() => move(1)} className="absolute right-3 grid size-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 sm:right-7" aria-label="Foto berikutnya"><ChevronRight className="size-6" /></button></>}<Dialog.Close className="absolute right-4 top-4 grid size-12 place-items-center rounded-full bg-white text-primary sm:right-7 sm:top-7" aria-label="Tutup lightbox"><X className="size-6" /></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}
