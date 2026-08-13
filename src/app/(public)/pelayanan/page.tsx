import type { Metadata } from "next";

import { MinistryCard } from "@/components/cards/content-cards";
import { MotionGrid } from "@/components/motion/motion-grid";
import { PublicContentFilters } from "@/components/content/public-content-filters";
import { PageHero } from "@/components/sections/page-hero";
import { QueryPagination } from "@/components/ui/query-pagination";
import { getPublishedMinistriesPage } from "@/lib/data/ministries";
import { normalizeSearch, safePage } from "@/lib/data/pagination";

export const metadata: Metadata = {
  title: "Pelayanan",
  description: "Departemen dan pelayanan GMAHK Jemaat Naripan.",
  alternates: { canonical: "/pelayanan" },
  openGraph: {
    type: "website",
    title: "Pelayanan",
    description: "Departemen dan pelayanan GMAHK Jemaat Naripan.",
    url: "/pelayanan",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pelayanan",
    description: "Departemen dan pelayanan GMAHK Jemaat Naripan.",
    images: ["/opengraph-image"],
  },
};

export const revalidate = 60;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MinistriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const query = normalizeSearch(firstValue(raw.q));
  const page = safePage(firstValue(raw.page));
  const result = await getPublishedMinistriesPage({ page, query });
  const queryParams = { q: query || undefined };

  return (
    <>
      <PageHero
        eyebrow="Melayani Bersama"
        title="Setiap talenta memiliki tempat"
        description="Kenali departemen pelayanan dan temukan ruang untuk bertumbuh, berkarya, serta menjadi berkat."
      />

      <section className="section-pad bg-cream">
        <div className="container-site">
          <PublicContentFilters
            key={query}
            query={query}
            placeholder="Cari pelayanan, koordinator, program, atau jadwal…"
          />

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              <strong className="text-primary">{result.total}</strong> pelayanan
              ditemukan
            </p>
            <p className="text-xs text-muted">
              Halaman {result.page} dari {result.pageCount}
            </p>
          </div>

          {result.items.length > 0 ? (
            <MotionGrid className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {result.items.map((item) => (
                <MinistryCard key={item.id} item={item} />
              ))}
            </MotionGrid>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center">
              <p className="font-serif text-2xl text-primary">
                Pelayanan tidak ditemukan
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Coba nama, program, koordinator, atau kata kunci lain.
              </p>
            </div>
          )}

          <QueryPagination
            pathname="/pelayanan"
            page={result.page}
            pageCount={result.pageCount}
            params={queryParams}
          />
        </div>
      </section>
    </>
  );
}
