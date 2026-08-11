import type { Metadata } from "next";

import { ArticleCard } from "@/components/cards/content-cards";
import { PublicContentFilters } from "@/components/content/public-content-filters";
import { PageHero } from "@/components/sections/page-hero";
import { QueryPagination } from "@/components/ui/query-pagination";
import {
  getPostFilterOptions,
  getPublishedPostsPage,
} from "@/lib/data/posts";
import {
  normalizeChoice,
  normalizeSearch,
  safePage,
} from "@/lib/data/pagination";

export const metadata: Metadata = {
  title: "Berita & Renungan",
  description: "Berita jemaat, renungan, dan artikel inspiratif.",
  alternates: { canonical: "/berita" },
  openGraph: {
    type: "website",
    title: "Berita & Renungan",
    description: "Berita jemaat, renungan, dan artikel inspiratif.",
    url: "/berita",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Berita & Renungan",
    description: "Berita jemaat, renungan, dan artikel inspiratif.",
    images: ["/opengraph-image"],
  },
};

export const revalidate = 60;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const query = normalizeSearch(firstValue(raw.q));
  const category = normalizeChoice(firstValue(raw.category));
  const year = normalizeChoice(firstValue(raw.year), 4);
  const page = safePage(firstValue(raw.page));
  const [result, options] = await Promise.all([
    getPublishedPostsPage({ page, query, category, year }),
    getPostFilterOptions(),
  ]);
  const queryParams = {
    q: query || undefined,
    category: category || undefined,
    year: year || undefined,
  };

  return (
    <>
      <PageHero
        eyebrow="Kabar & Inspirasi"
        title="Berita dan renungan"
        description="Cerita pelayanan, kabar jemaat, dan bahan perenungan untuk menguatkan kehidupan sehari-hari."
      />

      <section className="section-pad bg-cream">
        <div className="container-site">
          <PublicContentFilters
            key={`${query}-${category}-${year}`}
            query={query}
            placeholder="Cari judul, penulis, atau isi artikel…"
            selects={[
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
              <strong className="text-primary">{result.total}</strong> artikel
              ditemukan
            </p>
            <p className="text-xs text-muted">
              Halaman {result.page} dari {result.pageCount}
            </p>
          </div>

          {result.items.length > 0 ? (
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {result.items.map((post) => (
                <ArticleCard key={post.id} item={post} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center">
              <p className="font-serif text-2xl text-primary">
                Artikel tidak ditemukan
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Coba kata kunci, kategori, atau tahun publikasi yang berbeda.
              </p>
            </div>
          )}

          <QueryPagination
            pathname="/berita"
            page={result.page}
            pageCount={result.pageCount}
            params={queryParams}
          />
        </div>
      </section>
    </>
  );
}
