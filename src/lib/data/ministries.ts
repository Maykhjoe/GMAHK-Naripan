import "server-only";

import { allMinistries as fallbackMinistries } from "@/lib/constants/site-data";
import { createPublicClient } from "@/lib/supabase/public";
import type { Ministry } from "@/types/content";

const DEFAULT_ICON = "Heart";
const DEFAULT_PROGRAMS = [
  "Kelas dan pembinaan rutin",
  "Persekutuan dan pendampingan",
  "Kegiatan pelayanan masyarakat",
  "Kolaborasi antar-departemen",
];

const SUPPORTED_ICONS = new Set([
  "BookOpen",
  "Users",
  "Heart",
  "Flower2",
  "Music2",
  "Activity",
]);

type MinistryRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  contact: string | null;
  programs: unknown;
  seo: unknown;
  display_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicMinistry = Ministry & {
  id: string;
  shortName: string | null;
  shortDescription: string;
  details: string[];
  coordinator: string | null;
  contact: string | null;
  email: string | null;
  schedule: string | null;
  location: string | null;
  image: string | null;
  programs: string[];
  displayOrder: number;
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

function splitParagraphs(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parsePrograms(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (!isRecord(item)) {
        return "";
      }

      return (
        stringValue(item, "name") ||
        stringValue(item, "title") ||
        stringValue(item, "item") ||
        ""
      );
    })
    .filter(Boolean);
}

function safeIcon(value: string | null, fallback = DEFAULT_ICON) {
  return value && SUPPORTED_ICONS.has(value) ? value : fallback;
}

function mapFallbackMinistry(
  ministry: Ministry,
  index: number,
): PublicMinistry {
  const now = new Date().toISOString();

  return {
    ...ministry,
    id: `fallback-${ministry.slug}`,
    shortName: null,
    shortDescription: ministry.description,
    details: [ministry.description],
    coordinator: null,
    contact: null,
    email: null,
    schedule: null,
    location: null,
    image: ministry.image ?? null,
    programs: DEFAULT_PROGRAMS,
    displayOrder: index,
    publishedAt: now,
    updatedAt: now,
  };
}

function mapDatabaseMinistry(row: MinistryRow): PublicMinistry {
  const seo = isRecord(row.seo) ? row.seo : {};
  const shortDescription =
    row.short_description?.trim() ||
    stringValue(seo, "description") ||
    row.description?.trim() ||
    "Temukan ruang untuk bertumbuh dan melayani bersama GMAHK Naripan.";
  const details = splitParagraphs(row.description);
  const programs = parsePrograms(row.programs);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: shortDescription,
    icon: safeIcon(stringValue(seo, "icon")),
    shortName: stringValue(seo, "shortName"),
    shortDescription,
    details: details.length ? details : [shortDescription],
    coordinator: stringValue(seo, "coordinator"),
    contact: row.contact?.trim() || null,
    email: stringValue(seo, "email"),
    schedule: stringValue(seo, "schedule"),
    location: stringValue(seo, "location"),
    image: stringValue(seo, "image"),
    programs: programs.length ? programs : DEFAULT_PROGRAMS,
    displayOrder: row.display_order,
    publishedAt: row.published_at || row.created_at,
    updatedAt: row.updated_at,
  };
}

function fallbackPublishedMinistries() {
  return fallbackMinistries.map(mapFallbackMinistry);
}

export async function getPublishedMinistries(
  limit?: number,
): Promise<PublicMinistry[]> {
  const supabase = createPublicClient();

  if (!supabase) {
    const fallback = fallbackPublishedMinistries();
    return typeof limit === "number" ? fallback.slice(0, limit) : fallback;
  }

  let query = supabase
    .from("ministries")
    .select(
      "id, slug, name, short_description, description, contact, programs, seo, display_order, published_at, created_at, updated_at",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "Gagal mengambil pelayanan publik dari Supabase:",
      error.message,
    );

    const fallback = fallbackPublishedMinistries();
    return typeof limit === "number" ? fallback.slice(0, limit) : fallback;
  }

  if (!data?.length) {
    const fallback = fallbackPublishedMinistries();
    return typeof limit === "number" ? fallback.slice(0, limit) : fallback;
  }

  return (data as MinistryRow[]).map(mapDatabaseMinistry);
}

export async function getPublishedMinistryBySlug(
  slug: string,
): Promise<PublicMinistry | null> {
  const supabase = createPublicClient();

  if (!supabase) {
    const fallback = fallbackMinistries.find(
      (ministry) => ministry.slug === slug,
    );

    return fallback
      ? mapFallbackMinistry(
          fallback,
          fallbackMinistries.findIndex((item) => item.slug === slug),
        )
      : null;
  }

  const { data, error } = await supabase
    .from("ministries")
    .select(
      "id, slug, name, short_description, description, contact, programs, seo, display_order, published_at, created_at, updated_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error(
      `Gagal mengambil pelayanan publik dengan slug "${slug}":`,
      error.message,
    );
  }

  if (data) {
    return mapDatabaseMinistry(data as MinistryRow);
  }

  const fallback = fallbackMinistries.find(
    (ministry) => ministry.slug === slug,
  );

  return fallback
    ? mapFallbackMinistry(
        fallback,
        fallbackMinistries.findIndex((item) => item.slug === slug),
      )
    : null;
}
