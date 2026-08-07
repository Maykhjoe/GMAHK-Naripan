import type { Metadata } from "next";

import { EventCard } from "@/components/cards/content-cards";
import { PublicContentFilters } from "@/components/content/public-content-filters";
import { PageHero } from "@/components/sections/page-hero";
import { QueryPagination } from "@/components/ui/query-pagination";
import {
  getEventFilterOptions,
  getPublishedEventsPage,
} from "@/lib/data/events";
import {
  normalizeChoice,
  normalizeDateInput,
  normalizeSearch,
  safePage,
} from "@/lib/data/pagination";

export const metadata: Metadata = {
  title: "Kegiatan",
  description: "Agenda dan kegiatan terbaru GMAHK Jemaat Naripan.",
  alternates: {
    canonical: "/kegiatan",
  },
};

export const revalidate = 60;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const query = normalizeSearch(firstValue(raw.q));
  const category = normalizeChoice(firstValue(raw.category));
  const rawScope = normalizeChoice(firstValue(raw.scope));
  const scope =
    rawScope === "past" || rawScope === "all" ? rawScope : "upcoming";
  const dateFrom = normalizeDateInput(firstValue(raw.dateFrom));
  const dateTo = normalizeDateInput(firstValue(raw.dateTo));
  const page = safePage(firstValue(raw.page));
  const options = getEventFilterOptions();
  const result = await getPublishedEventsPage({
    page,
    query,
    category,
    scope,
    dateFrom,
    dateTo,
  });
  const queryParams = {
    q: query || undefined,
    category: category || undefined,
    scope: scope !== "upcoming" ? scope : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  return (
    <>
      <PageHero
        eyebrow="Agenda Jemaat"
        title="Bertumbuh melalui kebersamaan"
        description="Temukan kegiatan rohani, kesehatan, pelayanan masyarakat, dan program bagi seluruh keluarga."
      />

      <section className="section-pad bg-cream">
        <div className="container-site">
          <PublicContentFilters
            key={`${query}-${category}-${scope}-${dateFrom}-${dateTo}`}
            query={query}
            placeholder="Cari kegiatan, lokasi, atau deskripsi…"
            selects={[
              {
                name: "scope",
                label: "Waktu kegiatan",
                value: scope,
                options: options.scopes,
                defaultValue: "upcoming",
              },
              {
                name: "category",
                label: "Semua kategori",
                value: category,
                options: options.categories,
              },
            ]}
            dates={[
              {
                name: "dateFrom",
                label: "Mulai tanggal",
                value: dateFrom,
              },
              {
                name: "dateTo",
                label: "Sampai tanggal",
                value: dateTo,
              },
            ]}
          />

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              <strong className="text-primary">{result.total}</strong> kegiatan
              ditemukan
            </p>
            <p className="text-xs text-muted">
              Halaman {result.page} dari {result.pageCount}
            </p>
          </div>

          {result.items.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {result.items.map((event) => (
                <EventCard key={event.id} item={event} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center">
              <p className="font-serif text-2xl text-primary">
                Kegiatan tidak ditemukan
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Ubah rentang tanggal, kategori, atau pilihan waktu kegiatan.
              </p>
            </div>
          )}

          <QueryPagination
            pathname="/kegiatan"
            page={result.page}
            pageCount={result.pageCount}
            params={queryParams}
          />
        </div>
      </section>
    </>
  );
}
