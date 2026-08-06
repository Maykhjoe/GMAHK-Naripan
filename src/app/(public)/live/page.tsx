import type { Metadata } from "next";
import { Clock3, ExternalLink, Play } from "lucide-react";

import { SermonCard } from "@/components/cards/content-cards";
import { LiveCountdown } from "@/components/live/live-countdown";
import { YouTubeEmbed } from "@/components/media/youtube-embed";
import { PageHero } from "@/components/sections/page-hero";
import { Button } from "@/components/ui/button";
import { getPublishedSermons } from "@/lib/data/sermons";
import { getSiteConfig } from "@/lib/data/site-settings";
import { extractYouTubeVideoId } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Live Streaming",
  description: "Siaran langsung dan rekaman ibadah GMAHK Jemaat Naripan.",
  alternates: { canonical: "/live" },
};

export const revalidate = 60;

export default async function LivePage() {
  const [site, sermons] = await Promise.all([
    getSiteConfig(),
    getPublishedSermons(3),
  ]);
  const liveDestination = site.liveUrl || site.youtube;
  const liveVideoId = extractYouTubeVideoId(site.liveUrl) || "ysz5S6PUM-U";

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
          <YouTubeEmbed id={liveVideoId} title={`Live ${site.shortName}`} />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <h2 className="font-serif text-3xl">Kebaktian Sabat</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Berakar dan Dibangun di Dalam Kristus
              <br />
              Sabtu, 08 Agustus 2026 · 09.00 WIB
            </p>

            <LiveCountdown
              startsAt="2026-08-08T09:00:00+07:00"
              endsAt="2026-08-08T11:30:00+07:00"
            />

            {liveDestination && (
              <Button asChild className="mt-7 w-full">
                <a
                  href={liveDestination}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Play className="size-4 fill-current" />
                  Buka Siaran
                </a>
              </Button>
            )}

            {site.youtube && site.youtube !== liveDestination && (
              <Button asChild variant="outlineLight" className="mt-3 w-full">
                <a
                  href={site.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Kanal YouTube
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="section-pad bg-cream">
        <div className="container-site">
          <h2 className="font-serif text-4xl text-primary">
            Jadwal live berikutnya
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {[
              "Kebaktian Sabat · Sabtu 09.00 WIB",
              "Pertemuan Doa Khusus · Rabu 19.00 WIB",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-white p-6 text-primary">
                <Clock3 className="text-gold" />
                <p className="mt-4 font-semibold">{item}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-16 font-serif text-4xl text-primary">
            Rekaman sebelumnya
          </h2>
          <div className="mt-7 grid gap-6 md:grid-cols-3">
            {sermons.map((item) => (
              <SermonCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
