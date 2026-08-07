import Image from "next/image";
import Link from "next/link";
import { BookOpen, ExternalLink, Play, Radio } from "lucide-react";

import { LiveCountdown } from "@/components/live/live-countdown";
import { LiveStatusBadge } from "@/components/live/live-status-badge";
import { YouTubeEmbed } from "@/components/media/youtube-embed";
import { MotionSection } from "@/components/motion/motion-section";
import { SectionHeading } from "@/components/sections/section-heading";
import { Button } from "@/components/ui/button";
import type { LivestreamOverview } from "@/lib/data/livestreams";
import type { PublicSermon } from "@/lib/data/sermons";
import type { SiteConfig } from "@/lib/site/config";

export function LiveHomepageSection({
  site,
  overview,
  fallbackSermon,
}: {
  site: SiteConfig;
  overview: LivestreamOverview;
  fallbackSermon: PublicSermon | null;
}) {
  const featured = overview.featured;
  const videoId = featured?.youtubeId || fallbackSermon?.youtubeId || "";
  const title =
    featured?.title || fallbackSermon?.title || "Live Streaming GMAHK Naripan";
  const theme =
    featured?.theme ||
    fallbackSermon?.description ||
    "Ikuti siaran ibadah dan pelayanan Firman bersama kami.";
  const speaker = featured?.speaker || fallbackSermon?.speaker || "";
  const destination =
    featured?.youtubeUrl || site.liveUrl || site.youtube || "/live";

  return (
    <MotionSection className="section-pad relative overflow-hidden bg-primary text-white">
      <div className="absolute -right-32 -top-32 size-96 rounded-full border border-gold/10" />

      <div className="container-site">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <SectionHeading
            eyebrow="Live Streaming"
            title="Beribadah bersama, di mana pun Anda berada."
            description="Saksikan siaran langsung atau putar kembali rekaman Firman terbaru."
            light
          />

          {featured ? (
            <LiveStatusBadge status={featured.displayStatus} />
          ) : (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/70">
              <Radio className="size-3.5" aria-hidden="true" />
              Belum ada jadwal
            </span>
          )}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_.8fr]">
          {videoId ? (
            <YouTubeEmbed
              id={videoId}
              title={title}
              thumbnailUrl={featured?.thumbnailUrl || fallbackSermon?.image}
            />
          ) : (
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {featured?.thumbnailUrl ? (
                <Image
                  src={featured.thumbnailUrl}
                  alt={`Poster ${title}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 65vw"
                />
              ) : (
                <div className="grid size-full place-items-center p-8 text-center text-white/60">
                  <div>
                    <Radio className="mx-auto size-12 text-gold" />
                    <p className="mt-4 font-serif text-2xl text-white">
                      Siaran belum tersedia
                    </p>
                    <p className="mt-2 text-sm">
                      Jadwal dan tautan siaran akan diumumkan di halaman Live.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/5 p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
              {featured?.scriptureReference || "Ibadah Online"}
            </p>
            <h3 className="mt-4 font-serif text-3xl">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/60">{theme}</p>

            {speaker && <p className="mt-4 text-sm text-white/75">{speaker}</p>}

            {featured && (
              <p className="mt-2 text-sm text-white/60">
                {featured.dateLabel} · {featured.timeLabel}
              </p>
            )}

            {featured && featured.displayStatus !== "ended" && (
              <LiveCountdown
                startsAt={featured.startsAt}
                endsAt={featured.endsAt}
              />
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <a
                  href={destination}
                  target={destination.startsWith("http") ? "_blank" : undefined}
                  rel={
                    destination.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                >
                  <Play className="size-4 fill-current" />
                  {overview.isLive ? "Bergabung Sekarang" : "Buka Siaran"}
                </a>
              </Button>

              <Button asChild variant="outlineLight">
                <Link href="/live">
                  <ExternalLink className="size-4" />
                  Detail Live
                </Link>
              </Button>

              {!featured && fallbackSermon && (
                <Button asChild variant="outlineLight">
                  <Link href={`/khotbah/${fallbackSermon.slug}`}>
                    <BookOpen className="size-4" />
                    Detail Khotbah
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
