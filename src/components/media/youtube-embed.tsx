"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

export function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  const [activated, setActivated] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-xl">
      {activated ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <>
          <Image
            src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
            alt={`Pratinjau video ${title}`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />
          <button
            type="button"
            onClick={() => setActivated(true)}
            className="group absolute inset-0 grid cursor-pointer place-items-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gold"
            aria-label={`Putar video ${title}`}
          >
            <span className="grid size-20 place-items-center rounded-full bg-gold text-primary shadow-2xl transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105">
              <Play className="ml-1 size-8 fill-current" aria-hidden="true" />
            </span>
          </button>
          <span className="pointer-events-none absolute bottom-5 left-5 right-5 line-clamp-2 text-sm font-semibold text-white drop-shadow-md sm:text-base">
            {title}
          </span>
        </>
      )}
    </div>
  );
}
