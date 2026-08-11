import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Download,
  ExternalLink,
  Headphones,
  UserRound,
} from "lucide-react";

import { SermonCard } from "@/components/cards/content-cards";
import { YouTubeEmbed } from "@/components/media/youtube-embed";
import { JsonLd } from "@/components/seo/json-ld";
import { ShareActions } from "@/components/share/share-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPublishedSermonBySlug,
  getRelatedSermons,
} from "@/lib/data/sermons";
import { getSiteConfig } from "@/lib/data/site-settings";
import {
  createBreadcrumbJsonLd,
  createSermonJsonLd,
} from "@/lib/seo/structured-data";

export const revalidate = 60;

type SermonDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: SermonDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const sermon = await getPublishedSermonBySlug(slug);

  if (!sermon) {
    return {
      title: "Khotbah Tidak Ditemukan",
    };
  }

  return {
    title: sermon.title,
    description: sermon.description,
    alternates: {
      canonical: `/khotbah/${sermon.slug}`,
    },
    openGraph: {
      title: sermon.title,
      description: sermon.description,
      url: `/khotbah/${sermon.slug}`,
      images: [
        {
          url: sermon.image,
          alt: `Thumbnail khotbah ${sermon.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: sermon.title,
      description: sermon.description,
      images: [sermon.image],
    },
  };
}

export default async function SermonDetail({ params }: SermonDetailProps) {
  const { slug } = await params;
  const [sermon, siteConfig] = await Promise.all([
    getPublishedSermonBySlug(slug),
    getSiteConfig(),
  ]);

  if (!sermon) {
    notFound();
  }

  const relatedSermons = await getRelatedSermons(
    sermon.id,
    sermon.category,
    3,
  );

  return (
    <>
      <JsonLd data={createSermonJsonLd(sermon, siteConfig)} />
      <JsonLd
        data={createBreadcrumbJsonLd(
          [
            { name: "Beranda", path: "/" },
            { name: "Khotbah", path: "/khotbah" },
            {
              name: sermon.title,
              path: `/khotbah/${sermon.slug}`,
            },
          ],
          siteConfig.url,
        )}
      />

      <section className="bg-primary pb-16 pt-36 text-white">
        <div className="container-site">
          <Badge className="bg-gold text-primary">{sermon.category}</Badge>

          <h1 className="heading-display mt-6 max-w-4xl text-5xl text-balance sm:text-6xl">
            {sermon.title}
          </h1>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/65">
            <span className="flex items-center gap-2">
              <UserRound className="size-4 text-gold" aria-hidden="true" />
              {sermon.speaker}
            </span>
            <span className="flex items-center gap-2">
              <CalendarDays
                className="size-4 text-gold"
                aria-hidden="true"
              />
              {sermon.date}
            </span>
            <span className="flex items-center gap-2">
              <BookOpen className="size-4 text-gold" aria-hidden="true" />
              {sermon.verse}
            </span>
          </div>
        </div>
      </section>

      <section className="section-pad bg-cream">
        <div className="container-site">
          {sermon.youtubeId ? (
            <YouTubeEmbed id={sermon.youtubeId} title={sermon.title} />
          ) : (
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-primary">
              <Image
                src={sermon.image}
                alt={`Thumbnail khotbah ${sermon.title}`}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-primary/45" />
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                <div>
                  <BookOpen className="mx-auto size-10 text-gold" />
                  <p className="mt-4 font-serif text-2xl">
                    Rekaman video belum tersedia
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <article className="rounded-2xl bg-white p-8 sm:p-10">
              <h2 className="font-serif text-3xl text-primary">
                Tentang khotbah ini
              </h2>

              <p className="mt-5 leading-8 text-muted">
                {sermon.description}
              </p>

              <blockquote className="mt-8 border-l-2 border-gold pl-5 font-serif text-2xl italic text-secondary">
                {sermon.verse}
              </blockquote>
            </article>

            <aside className="self-start rounded-2xl bg-primary p-6 text-white lg:sticky lg:top-28">
              <h2 className="font-serif text-2xl">Materi Khotbah</h2>

              <div className="mt-5 grid gap-3">
                {sermon.audioUrl && (
                  <Button asChild variant="outlineLight" className="w-full">
                    <Link
                      href={sermon.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Headphones className="size-4" />
                      Dengarkan Audio
                      <ExternalLink className="size-3" />
                    </Link>
                  </Button>
                )}

                {sermon.materialPdfUrl && (
                  <Button asChild variant="outlineLight" className="w-full">
                    <Link
                      href={sermon.materialPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="size-4" />
                      Buka Materi PDF
                    </Link>
                  </Button>
                )}

                {!sermon.audioUrl && !sermon.materialPdfUrl && (
                  <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/65">
                    Audio dan materi PDF belum tersedia untuk khotbah ini.
                  </p>
                )}
              </div>

              <ShareActions
                title={sermon.title}
                url={`${siteConfig.url}/khotbah/${sermon.slug}`}
                dark
              />
            </aside>
          </div>

          {relatedSermons.length > 0 && (
            <>
              <h2 className="mt-16 font-serif text-4xl text-primary">
                Khotbah terkait
              </h2>

              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {relatedSermons.map((item) => (
                  <SermonCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
