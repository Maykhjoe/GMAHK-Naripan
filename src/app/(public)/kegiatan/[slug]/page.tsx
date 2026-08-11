import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  Users,
  Video,
} from "lucide-react";

import { CalendarActions } from "@/components/events/calendar-actions";
import { EventRegistrationForm } from "@/components/events/event-registration-form";
import { JsonLd } from "@/components/seo/json-ld";
import { ShareActions } from "@/components/share/share-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublishedEventBySlug } from "@/lib/data/events";
import { getSiteConfig } from "@/lib/data/site-settings";
import {
  createBreadcrumbJsonLd,
  createEventJsonLd,
} from "@/lib/seo/structured-data";

export const revalidate = 60;

type EventDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: EventDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    return {
      title: "Kegiatan Tidak Ditemukan",
    };
  }

  return {
    title: event.title,
    description: event.description,
    alternates: {
      canonical: `/kegiatan/${event.slug}`,
    },
    openGraph: {
      title: event.title,
      description: event.description,
      url: `/kegiatan/${event.slug}`,
      images: [
        {
          url: event.image,
          alt: `Poster ${event.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.description,
      images: [event.image],
    },
  };
}

export default async function EventDetail({ params }: EventDetailProps) {
  const { slug } = await params;
  const [event, siteConfig] = await Promise.all([
    getPublishedEventBySlug(slug),
    getSiteConfig(),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <>
      <JsonLd data={createEventJsonLd(event, siteConfig)} />
      <JsonLd
        data={createBreadcrumbJsonLd(
          [
            { name: "Beranda", path: "/" },
            { name: "Kegiatan", path: "/kegiatan" },
            {
              name: event.title,
              path: `/kegiatan/${event.slug}`,
            },
          ],
          siteConfig.url,
        )}
      />

      <section className="bg-primary pb-16 pt-36 text-white">
        <div className="container-site">
          <Badge className="bg-gold text-primary">{event.category}</Badge>

          <h1 className="heading-display mt-6 max-w-4xl text-5xl text-balance sm:text-6xl">
            {event.title}
          </h1>

          <p className="mt-5 max-w-2xl leading-7 text-white/65">
            {event.description}
          </p>
        </div>
      </section>

      <section className="section-pad bg-cream">
        <div className="container-site grid gap-10 lg:grid-cols-[1.3fr_.7fr]">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
              <Image
                src={event.image}
                alt={`Poster ${event.title}`}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 70vw"
              />
            </div>

            <div className="mt-8 rounded-2xl bg-white p-8 sm:p-10">
              <h2 className="font-serif text-3xl text-primary">
                Tentang kegiatan
              </h2>

              <div className="mt-5 space-y-5">
                {event.details.map((paragraph, index) => (
                  <p
                    key={`${event.id}-detail-${index}`}
                    className="leading-8 text-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {event.rundown.length > 0 && (
                <>
                  <h3 className="mt-9 font-serif text-2xl text-primary">
                    Rundown
                  </h3>

                  <ol className="mt-4 space-y-3 text-sm text-muted">
                    {event.rundown.map((item, index) => (
                      <li
                        key={`${event.id}-rundown-${index}`}
                        className="flex gap-3 rounded-xl bg-cream px-4 py-3"
                      >
                        <span className="font-semibold text-secondary">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </div>

          <aside className="self-start rounded-2xl bg-primary p-7 text-white lg:sticky lg:top-28">
            <h2 className="font-serif text-2xl">Informasi Kegiatan</h2>

            <div className="mt-6 space-y-4 text-sm text-white/70">
              <p className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>{event.date}</span>
              </p>

              <p className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>{event.time}</span>
              </p>

              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>{event.location}</span>
              </p>

              <p className="flex items-start gap-3">
                <Users className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>
                  {event.capacity
                    ? `Kuota: ${event.capacity} peserta`
                    : "Tidak ada batas kuota yang diumumkan"}
                </span>
              </p>
            </div>

            {(event.zoomUrl || event.youtubeUrl) && (
              <div className="mt-7 grid gap-3">
                {event.zoomUrl && (
                  <Button asChild className="w-full">
                    <Link
                      href={event.zoomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Video className="size-4" />
                      Buka Zoom
                    </Link>
                  </Button>
                )}

                {event.youtubeUrl && (
                  <Button asChild variant="outlineLight" className="w-full">
                    <Link
                      href={event.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      Buka YouTube
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {event.registrationOpen ? (
              <EventRegistrationForm
                eventSlug={event.slug}
                eventTitle={event.title}
              />
            ) : event.registration ? (
              <p className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/65">
                Pendaftaran untuk kegiatan ini sudah ditutup.
              </p>
            ) : null}

            <CalendarActions event={event} />

            <ShareActions
              title={event.title}
              url={`${siteConfig.url}/kegiatan/${event.slug}`}
              dark
            />
          </aside>
        </div>
      </section>
    </>
  );
}
