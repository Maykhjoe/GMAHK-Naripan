import "server-only";

import { sermons as fallbackSermons } from "@/lib/constants/site-data";
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
