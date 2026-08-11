import type { Metadata } from "next";

import { SermonCard } from "@/components/cards/content-cards";
import { PublicContentFilters } from "@/components/content/public-content-filters";
import { PageHero } from "@/components/sections/page-hero";
import { QueryPagination } from "@/components/ui/query-pagination";
import {
  getPublishedSermonsPage,
  getSermonFilterOptions,
} from "@/lib/data/sermons";
import {
  normalizeChoice,
  normalizeSearch,
  safePage,
} from "@/lib/data/pagination";

export const metadata: Metadata = {
  title: "Arsip Khotbah",
  description: "Khotbah, renungan, seminar, dan kesaksian GMAHK Jemaat Naripan.",
  alternates: { canonical: "/khotbah" },
  openGraph: {
    type: "website",
    title: "Arsip Khotbah",
    description: "Khotbah, renungan, seminar, dan kesaksian GMAHK Jemaat Naripan.",
    url: "/khotbah",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arsip Khotbah",
    description: "Khotbah, renungan, seminar, dan kesaksian GMAHK Jemaat Naripan.",
    images: ["/opengraph-image"],
  },
};

export const revalidate = 60;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SermonsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const query = normalizeSearch(firstValue(raw.q));
  const category = normalizeChoice(firstValue(raw.category));
  const speaker = normalizeChoice(firstValue(raw.speaker));
  const year = normalizeChoice(firstValue(raw.year), 4);
  const page = safePage(firstValue(raw.page));
  const [result, options] = await Promise.all([
    getPublishedSermonsPage({ page, query, category, speaker, year }),
    getSermonFilterOptions(),
  ]);
  const queryParams = {
    q: query || undefined,
    category: category || undefined,
    speaker: speaker || undefined,
    year: year || undefined,
  };

  return (
    <>
      <PageHero
        eyebrow="Arsip Firman"
        title="Dengarkan, renungkan, dan bertumbuh"
        description="Kumpulan khotbah dan renungan untuk menyertai perjalanan iman Anda."
      />

      <section className="section-pad bg-cream">
        <div className="container-site">
          <PublicContentFilters
            key={`${query}-${category}-${speaker}-${year}`}
            query={query}
            placeholder="Cari judul, pembicara, ayat, atau ringkasan…"
            selects={[
              {
                name: "speaker",
                label: "Semua pembicara",
                value: speaker,
                options: options.speakers,
              },
              {
                name: "category",
                label: "Semua kategori",
                value: category,
                options: options.categories,
              },
              {
                name: "year",
                label: "Semua tahun",
                value: year,
                options: options.years,
              },
            ]}
          />

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              <strong className="text-primary">{result.total}</strong> khotbah
              ditemukan
            </p>
            <p className="text-xs text-muted">
              Halaman {result.page} dari {result.pageCount}
            </p>
          </div>

          {result.items.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {result.items.map((sermon) => (
                <SermonCard key={sermon.id} item={sermon} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center">
              <p className="font-serif text-2xl text-primary">
                Khotbah tidak ditemukan
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Coba pembicara, kategori, tahun, atau kata kunci lain.
              </p>
            </div>
          )}

          <QueryPagination
            pathname="/khotbah"
            page={result.page}
            pageCount={result.pageCount}
            params={queryParams}
          />
        </div>
      </section>
    </>
  );
}
