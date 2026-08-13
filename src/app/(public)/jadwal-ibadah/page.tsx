import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ExternalLink, Sparkles } from "lucide-react";

import { ServiceScheduleCard } from "@/components/cards/content-cards";
import { PageHero } from "@/components/sections/page-hero";
import { SectionHeading } from "@/components/sections/section-heading";
import { Button } from "@/components/ui/button";
import { regularWorshipScheduleCards } from "@/lib/constants/worship-schedules";
import { getUpcomingSpecialWorshipSchedules } from "@/lib/data/schedules";

export const metadata: Metadata = {
  title: "Jadwal Ibadah",
  description: "Jadwal ibadah rutin dan ibadah khusus GMAHK Jemaat Naripan.",
  alternates: { canonical: "/jadwal-ibadah" },
};

export const revalidate = 60;

export default async function SchedulePage() {
  const specialSchedules = await getUpcomingSpecialWorshipSchedules();

  return (
    <>
      <PageHero
        eyebrow="Waktu Bersama Tuhan"
        title="Jadwal ibadah dan persekutuan"
        description="Jadwal rutin kami tetap setiap minggu. Ibadah khusus akan diumumkan melalui halaman ini."
        image="/images/jadwal-hero.png"
      />

      <section className="section-pad bg-cream">
        <div className="container-site">
          <SectionHeading
            eyebrow="Jadwal Tetap"
            title="Ibadah rutin setiap minggu"
            description="Tiga jadwal berikut berlangsung rutin. Perubahan mendadak akan diinformasikan melalui pengumuman resmi gereja."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {regularWorshipScheduleCards.map((item) => (
              <ServiceScheduleCard key={item.id} item={item} />
            ))}
          </div>

          <div className="mt-10 flex items-start gap-4 rounded-2xl border border-primary/10 bg-white p-6 text-sm leading-7 text-muted">
            <CalendarDays
              className="mt-1 size-5 shrink-0 text-gold"
              aria-hidden="true"
            />
            <p>
              Ibadah Vesper dilaksanakan setiap Jumat pukul 19:00–20:00 WIB.
              Ibadah Sabat berlangsung setiap Sabtu pukul 09:00–12:00 WIB.
            </p>
          </div>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-site">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Agenda Khusus"
              title="Ibadah dan program khusus"
              description="Ibadah Tahun Baru, KKR, Pekan Doa, dan agenda khusus lainnya akan tampil di sini setelah diumumkan."
            />

            <Button asChild variant="secondary">
              <Link href="/kontak">Hubungi gereja</Link>
            </Button>
          </div>

          {specialSchedules.length > 0 ? (
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {specialSchedules.map((item) => (
                <div key={item.id} className="space-y-3">
                  <ServiceScheduleCard item={item} />

                  {(item.zoomUrl || item.youtubeUrl) && (
                    <div className="flex flex-wrap gap-2 px-1">
                      {item.zoomUrl && (
                        <a
                          href={item.zoomUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-semibold text-primary transition-colors hover:text-gold"
                        >
                          Buka Zoom
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      )}

                      {item.youtubeUrl && (
                        <a
                          href={item.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-semibold text-primary transition-colors hover:text-gold"
                        >
                          Buka YouTube
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-3xl border border-primary/10 bg-cream p-8 text-center sm:p-12">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold/15 text-gold">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 font-serif text-2xl text-primary">
                Belum ada ibadah khusus yang diumumkan
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
                Jadwal rutin tetap berjalan seperti biasa. Pengumuman KKR, Pekan
                Doa, ibadah Tahun Baru, dan program khusus lainnya akan tampil
                otomatis di bagian ini.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
