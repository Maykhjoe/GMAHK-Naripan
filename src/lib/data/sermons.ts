import "server-only";

import { sermons as fallbackSermons } from "@/lib/constants/site-data";
import {
  createPagination,
  fallbackPagination,
  normalizeChoice,
  normalizeSearch,
  recentYearOptions,
  safePage,
  safePageSize,
  type PaginatedResult,
  type PublicPageFilters,
  type SelectOption,
} from "@/lib/data/pagination";
import { createPublicClient } from "@/lib/supabase/public";
import type { Sermon } from "@/types/content";

const DEFAULT_SERMON_IMAGE =
  "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=85";
const DEFAULT_CATEGORY = "Khotbah";
const DEFAULT_SPEAKER = "Pembicara Jemaat";
const DEFAULT_VERSE = "Firman Tuhan";
const JAKARTA_TIME_ZONE = "Asia/Jakarta";

type NamedRelation =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

type SermonRow = {
  id: string;
  slug: string;
  title: string;
  sermon_date: string;
  main_verse: string | null;
  description: string | null;
  youtube_id: string | null;
  seo: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category: NamedRelation;
  speaker: NamedRelation;
};

export type PublicSermon = Sermon & {
  sermonDate: string;
  description: string;
  audioUrl: string | null;
  materialPdfUrl: string | null;
  publishedAt: string;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function relationName(value: NamedRelation): string | null {
  if (Array.isArray(value)) {
    return value[0]?.name?.trim() || null;
  }

  return value?.name?.trim() || null;
}

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string) {
  const date = validDate(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date);
}

function mapFallbackSermon(sermon: Sermon): PublicSermon {
  const now = new Date().toISOString();

  return {
    ...sermon,
    sermonDate: sermon.date,
    description: `${sermon.title} oleh ${sermon.speaker}.`,
    audioUrl: null,
    materialPdfUrl: null,
    publishedAt: now,
    updatedAt: now,
  };
}

function mapDatabaseSermon(row: SermonRow): PublicSermon {
  const seo = isRecord(row.seo) ? row.seo : {};
  const speaker =
    relationName(row.speaker) ||
    stringValue(seo, "speaker") ||
    DEFAULT_SPEAKER;
  const description =
    row.description?.trim() ||
    stringValue(seo, "description") ||
    `${row.title} oleh ${speaker}.`;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    speaker,
    date: formatDate(row.sermon_date),
    sermonDate: row.sermon_date,
    verse: row.main_verse?.trim() || DEFAULT_VERSE,
    category: relationName(row.category) || DEFAULT_CATEGORY,
    image: stringValue(seo, "image") || DEFAULT_SERMON_IMAGE,
    youtubeId: row.youtube_id?.trim() || undefined,
    description,
    audioUrl: stringValue(seo, "audio"),
    materialPdfUrl: stringValue(seo, "materialPdf"),
    publishedAt: row.published_at || row.created_at,
    updatedAt: row.updated_at,
  };
}

function fallbackPublishedSermons() {
  return fallbackSermons.map(mapFallbackSermon);
}

const sermonSelect = `
  id,
  slug,
  title,
  sermon_date,
  main_verse,
  description,
  youtube_id,
  seo,
  published_at,
  created_at,
  updated_at,
  category:sermon_categories!sermons_category_id_fkey (
    name
  ),
  speaker:speakers!sermons_speaker_id_fkey (
    name
  )
`;

export async function getPublishedSermons(
  limit?: number,
): Promise<PublicSermon[]> {
  const supabase = createPublicClient();

  if (!supabase) {
    const fallback = fallbackPublishedSermons();
    return typeof limit === "number" ? fallback.slice(0, limit) : fallback;
  }

  let query = supabase
    .from("sermons")
    .select(sermonSelect)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .order("sermon_date", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "Gagal mengambil khotbah publik dari Supabase:",
      error.message,
    );

    const fallback = fallbackPublishedSermons();
    return typeof limit === "number" ? fallback.slice(0, limit) : fallback;
  }

  return (data as unknown as SermonRow[]).map(mapDatabaseSermon);
}

export async function getPublishedSermonBySlug(
  slug: string,
): Promise<PublicSermon | null> {
  const supabase = createPublicClient();

  if (!supabase) {
    const fallback = fallbackSermons.find((sermon) => sermon.slug === slug);
    return fallback ? mapFallbackSermon(fallback) : null;
  }

  const { data, error } = await supabase
    .from("sermons")
    .select(sermonSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error(
      `Gagal mengambil khotbah publik dengan slug "${slug}":`,
      error.message,
    );

    const fallback = fallbackSermons.find((sermon) => sermon.slug === slug);
    return fallback ? mapFallbackSermon(fallback) : null;
  }

  return data ? mapDatabaseSermon(data as unknown as SermonRow) : null;
}

export async function getRelatedSermons(
  currentId: string,
  category: string,
  limit = 3,
): Promise<PublicSermon[]> {
  const sermons = await getPublishedSermons();
  const otherSermons = sermons.filter((sermon) => sermon.id !== currentId);
  const sameCategory = otherSermons.filter(
    (sermon) => sermon.category === category,
  );
  const remaining = otherSermons.filter(
    (sermon) => sermon.category !== category,
  );

  return [...sameCategory, ...remaining].slice(0, limit);
}


export async function getSermonFilterOptions(): Promise<{
  categories: SelectOption[];
  speakers: SelectOption[];
  years: SelectOption[];
}> {
  const supabase = createPublicClient();
  const fallbackSpeakers = [...new Set(fallbackSermons.map((item) => item.speaker))]
    .sort((first, second) => first.localeCompare(second, "id-ID"))
    .map((label) => ({ value: label, label }));

  if (!supabase) {
    const categories = [
      ...new Set(fallbackSermons.map((item) => item.category)),
    ]
      .sort((first, second) => first.localeCompare(second, "id-ID"))
      .map((label) => ({ value: label, label }));

    return {
      categories,
      speakers: fallbackSpeakers,
      years: recentYearOptions(),
    };
  }

  const [categoryResult, speakerResult] = await Promise.all([
    supabase
      .from("sermon_categories")
      .select("slug, name")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase.rpc("public_sermon_speaker_options"),
  ]);

  if (categoryResult.error) {
    console.error(
      "Kategori khotbah tidak dapat dimuat:",
      categoryResult.error.message,
    );
  }

  if (speakerResult.error) {
    console.error(
      "Daftar pembicara khotbah tidak dapat dimuat:",
      speakerResult.error.message,
    );
  }

  const speakers = speakerResult.error
    ? fallbackSpeakers
    : ((speakerResult.data ?? []) as { value: string }[]).map((item) => ({
        value: item.value,
        label: item.value,
      }));

  return {
    categories: (categoryResult.data ?? []).map((item) => ({
      value: item.slug,
      label: item.name,
    })),
    speakers,
    years: recentYearOptions(),
  };
}

export async function getPublishedSermonsPage(
  filters: PublicPageFilters,
): Promise<PaginatedResult<PublicSermon>> {
  const page = safePage(filters.page);
  const pageSize = safePageSize(filters.pageSize, 9, [9]);
  const queryText = normalizeSearch(filters.query);
  const category = normalizeChoice(filters.category);
  const speaker = normalizeChoice(filters.speaker);
  const year = normalizeChoice(filters.year, 4);
  const fallback = fallbackPublishedSermons();

  function fallbackResult() {
    const normalizedQuery = queryText.toLocaleLowerCase("id-ID");
    const filtered = fallback.filter((sermon) => {
      const haystack = [
        sermon.title,
        sermon.speaker,
        sermon.category,
        sermon.verse,
        sermon.description,
      ]
        .join(" ")
        .toLocaleLowerCase("id-ID");

      if (normalizedQuery && !haystack.includes(normalizedQuery)) {
        return false;
      }

      if (
        category &&
        sermon.category.toLocaleLowerCase("id-ID") !==
          category.toLocaleLowerCase("id-ID")
      ) {
        return false;
      }

      if (speaker && sermon.speaker !== speaker) {
        return false;
      }

      if (year && !sermon.date.includes(year)) {
        return false;
      }

      return true;
    });

    return fallbackPagination(filtered, page, pageSize);
  }

  const supabase = createPublicClient();

  if (!supabase) {
    return fallbackResult();
  }

  let categoryId: string | null = null;

  if (category) {
    const { data: categoryRow, error: categoryError } = await supabase
      .from("sermon_categories")
      .select("id")
      .eq("slug", category)
      .eq("status", "active")
      .maybeSingle();

    if (categoryError) {
      console.error(
        "Filter kategori khotbah gagal dimuat:",
        categoryError.message,
      );
      return fallbackResult();
    }

    if (!categoryRow) {
      return createPagination([], 0, page, pageSize);
    }

    categoryId = categoryRow.id;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let databaseQuery = supabase
    .from("sermons")
    .select(sermonSelect, { count: "exact" })
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString());

  if (queryText) {
    databaseQuery = databaseQuery.ilike("search_text", `%${queryText}%`);
  }

  if (categoryId) {
    databaseQuery = databaseQuery.eq("category_id", categoryId);
  }

  if (speaker) {
    databaseQuery = databaseQuery.contains("seo", { speaker });
  }

  if (/^\d{4}$/.test(year)) {
    databaseQuery = databaseQuery
      .gte("sermon_date", `${year}-01-01`)
      .lt("sermon_date", `${Number(year) + 1}-01-01`);
  }

  const { data, error, count } = await databaseQuery
    .order("sermon_date", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Daftar khotbah tidak dapat dimuat:", error.message);
    return fallbackResult();
  }

  return createPagination(
    (data as unknown as SermonRow[]).map(mapDatabaseSermon),
    count ?? 0,
    page,
    pageSize,
  );
}
