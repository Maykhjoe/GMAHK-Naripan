import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  Play,
  Radio,
  Video,
} from "lucide-react";

import { SermonCard } from "@/components/cards/content-cards";
import { LiveCountdown } from "@/components/live/live-countdown";
import { LiveStatusBadge } from "@/components/live/live-status-badge";
import { YouTubeEmbed } from "@/components/media/youtube-embed";
import { PageHero } from "@/components/sections/page-hero";
import { Button } from "@/components/ui/button";
import { getLivestreamOverview } from "@/lib/data/livestreams";
import { getPublishedSermons } from "@/lib/data/sermons";
import { getSiteConfig } from "@/lib/data/site-settings";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();

  return {
    title: "Live Streaming",
    description: `Siaran langsung dan rekaman ibadah ${site.name}.`,
    alternates: { canonical: "/live" },
    openGraph: {
      title: `Live Streaming | ${site.shortName}`,
      description: `Siaran langsung dan rekaman ibadah ${site.name}.`,
      url: `${site.url}/live`,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Live Streaming | ${site.shortName}`,
      description: `Siaran langsung dan rekaman ibadah ${site.name}.`,
      images: ["/opengraph-image"],
    },
  };
}

export default async function LivePage() {
  const [site, overview, sermons] = await Promise.all([
    getSiteConfig(),
    getLivestreamOverview(),
    getPublishedSermons(3),
  ]);

  const featured = overview.featured;
  const fallbackSermon = sermons[0] ?? null;
  const videoId = featured?.youtubeId || fallbackSermon?.youtubeId || "";
  const playerTitle =
    featured?.title || fallbackSermon?.title || `Live ${site.shortName}`;
  const playerThumbnail =
    featured?.thumbnailUrl || fallbackSermon?.image || "";
  const primaryDestination =
    featured?.youtubeUrl || site.liveUrl || site.youtube || "";

  return (
    <>
      <PageHero
        eyebrow="Ibadah Online"
        title="Live Streaming"
        description="Terhubung dalam ibadah, di mana pun Anda berada."
        image="https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1800&q=90"
      />

      <section className="section-pad bg-primary text-white">
        <div className="container-site grid gap-8 lg:grid-cols-[1.55fr_.65fr]">
          {videoId ? (
            <YouTubeEmbed
              id={videoId}
              title={playerTitle}
              thumbnailUrl={playerThumbnail}
            />
          ) : (
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl">
              {playerThumbnail ? (
                <>
                  <Image
                    src={playerThumbnail}
                    alt={`Poster ${playerTitle}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 70vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
                  <p className="absolute bottom-6 left-6 right-6 font-serif text-2xl">
                    {playerTitle}
                  </p>
                </>
              ) : (
                <div className="grid size-full place-items-center p-8 text-center">
                  <div>
                    <Radio className="mx-auto size-14 text-gold" />
                    <h2 className="mt-5 font-serif text-3xl">
                      Belum ada siaran terjadwal
                    </h2>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/60">
                      Jadwal dan tautan siaran akan tampil di sini setelah
                      dipublikasikan melalui admin.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            {featured ? (
              <>
                <LiveStatusBadge status={featured.displayStatus} />
                <h1 className="mt-5 font-serif text-3xl">{featured.title}</h1>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  {featured.theme}
                </p>

                <div className="mt-5 space-y-2 text-sm text-white/70">
                  <p>{featured.speaker}</p>
                  {featured.scriptureReference && (
                    <p className="flex items-center gap-2 text-gold">
                      <BookOpen className="size-4" aria-hidden="true" />
                      {featured.scriptureReference}
                    </p>
                  )}
                  <p>
                    {featured.dateLabel} · {featured.timeLabel}
                  </p>
                </div>

                {featured.displayStatus !== "ended" ? (
                  <LiveCountdown
                    startsAt={featured.startsAt}
                    endsAt={featured.endsAt}
                  />
                ) : (
                  <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
                    Siaran telah selesai. Rekaman dapat diputar kembali bila
                    video masih tersedia.
                  </div>
                )}

                {featured.displayStatus === "scheduled" && (
                  <p className="mt-4 text-xs leading-5 text-white/50">
                    {featured.offlineMessage}
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/70">
                  <Radio className="size-3.5" aria-hidden="true" />
                  Offline
                </span>
                <h1 className="mt-5 font-serif text-3xl">
                  Siaran belum dijadwalkan
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Silakan lihat jadwal ibadah atau kunjungi kanal YouTube resmi
                  untuk rekaman terbaru.
                </p>
              </>
            )}

            <div className="mt-7 grid gap-3">
              {primaryDestination && (
                <Button asChild className="w-full">
                  <a
                    href={primaryDestination}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Play className="size-4 fill-current" />
                    {overview.isLive ? "Bergabung Sekarang" : "Buka YouTube"}
                  </a>
                </Button>
              )}

              {featured?.zoomUrl && (
                <Button asChild variant="outlineLight" className="w-full">
                  <a
                    href={featured.zoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Bergabung melalui Zoom
                  </a>
                </Button>
              )}

              <Button asChild variant="outlineLight" className="w-full">
                <Link href="/jadwal-ibadah">
                  <CalendarDays className="size-4" />
                  Jadwal Ibadah
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad bg-cream">
        <div className="container-site">
          <div className="flex items-end justify-between gap-6">
            <div>
              <span className="eyebrow text-secondary">Agenda Online</span>
              <h2 className="mt-4 font-serif text-4xl text-primary">
                Jadwal live berikutnya
              </h2>
            </div>
          </div>

          {overview.upcoming.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {overview.upcoming.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-primary/10 bg-white p-6 text-primary"
                >
                  <LiveStatusBadge status="scheduled" />
                  <h3 className="mt-5 font-serif text-2xl">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.theme}
                  </p>
                  <p className="mt-5 text-sm font-semibold">
                    {item.dateLabel}
                  </p>
                  <p className="mt-1 text-sm text-muted">{item.timeLabel}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-primary/10 bg-white p-8 text-center">
              <Video className="mx-auto size-9 text-secondary" />
              <p className="mt-4 font-serif text-2xl text-primary">
                Belum ada live berikutnya
              </p>
              <p className="mt-2 text-sm text-muted">
                Jadwal baru akan tampil otomatis setelah dipublikasikan.
              </p>
            </div>
          )}

          <h2 className="mt-16 font-serif text-4xl text-primary">
            Rekaman khotbah terbaru
          </h2>

          {sermons.length > 0 ? (
            <div className="mt-7 grid gap-6 md:grid-cols-3">
              {sermons.map((item) => (
                <SermonCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-primary/10 bg-white p-8 text-center">
              <p className="font-serif text-2xl text-primary">
                Belum ada rekaman khotbah
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
