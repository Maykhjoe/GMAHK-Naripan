import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentBrowser } from "@/components/content/content-browser";
import { EventCard } from "@/components/cards/content-cards";
import { PageHero } from "@/components/sections/page-hero";
import { getPublishedEvents } from "@/lib/data/events";

export const metadata: Metadata = {
  title: "Kegiatan",
  description: "Agenda dan kegiatan terbaru GMAHK Jemaat Naripan.",
  alternates: {
    canonical: "/kegiatan",
  },
};

export const revalidate = 60;

export default async function EventsPage() {
  const events = await getPublishedEvents();
  const upcomingEvents = events
    .filter((event) => !event.isPast)
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
    );
  const pastEvents = events
    .filter((event) => event.isPast)
    .sort(
      (first, second) =>
        new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime(),
    )
    .slice(0, 6);

  return (
    <>
      <PageHero
        eyebrow="Agenda Jemaat"
        title="Bertumbuh melalui kebersamaan"
        description="Temukan kegiatan rohani, kesehatan, pelayanan masyarakat, dan program bagi seluruh keluarga."
      />

      <section className="section-pad bg-cream">
        <div className="container-site">
          <h2 className="mb-7 font-serif text-3xl text-primary">
            Kegiatan mendatang
          </h2>

          {upcomingEvents.length > 0 ? (
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-2xl bg-white" />
              }
            >
              <ContentBrowser kind="events" items={upcomingEvents} />
            </Suspense>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center text-sm text-muted">
              Belum ada kegiatan mendatang yang dipublikasikan.
            </div>
          )}

          <h2 className="mt-16 font-serif text-3xl text-primary">
            Kegiatan selesai
          </h2>

          {pastEvents.length > 0 ? (
            <div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => (
                <EventCard key={event.id} item={event} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center text-sm text-muted">
              Arsip kegiatan selesai akan tampil di sini setelah kegiatan
              dipublikasikan melalui dashboard admin.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
