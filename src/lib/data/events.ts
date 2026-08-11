import "server-only";

import { cache } from "react";

import { eventCategories } from "@/lib/constants/content-options";
import { events as fallbackEvents } from "@/lib/constants/site-data";
import {
  createPagination,
  fallbackPagination,
  jakartaDayEnd,
  jakartaDayStart,
  normalizeChoice,
  normalizeDateInput,
  normalizeSearch,
  safePage,
  safePageSize,
  type PaginatedResult,
  type PublicPageFilters,
  type SelectOption,
} from "@/lib/data/pagination";
import { createPublicClient } from "@/lib/supabase/public";
import type { EventItem } from "@/types/content";

const DEFAULT_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85";
const DEFAULT_LOCATION = "Lokasi akan diumumkan";
const JAKARTA_TIME_ZONE = "Asia/Jakarta";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  short_description: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  rundown: unknown;
  zoom_url: string | null;
  youtube_url: string | null;
  registration_enabled: boolean;
  capacity: number | null;
  registration_deadline: string | null;
  seo: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicEvent = EventItem & {
  details: string[];
  rundown: string[];
  capacity: number | null;
  registrationDeadline: string | null;
  registrationOpen: boolean;
  zoomUrl: string | null;
  youtubeUrl: string | null;
  publishedAt: string;
  updatedAt: string;
  isPast: boolean;
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

function splitParagraphs(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parseRundown(value: unknown): string[] {
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

      const time = stringValue(item, "time");
      const label =
        stringValue(item, "item") ??
        stringValue(item, "title") ??
        stringValue(item, "name");

      if (time && label) {
        return `${time} — ${label}`;
      }

      return label ?? "";
    })
    .filter(Boolean);
}

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fallbackEndDate(startsAt: string) {
  const start = validDate(startsAt);

  if (!start) {
    return startsAt;
  }

  return new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString();
}

function localDateKey(value: string) {
  const date = validDate(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date);
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

function formatDateRange(startsAt: string, endsAt: string) {
  if (localDateKey(startsAt) === localDateKey(endsAt)) {
    return formatDate(startsAt);
  }

  return `${formatDate(startsAt)} – ${formatDate(endsAt)}`;
}

function formatClock(value: string) {
  const date = validDate(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: JAKARTA_TIME_ZONE,
  })
    .format(date)
    .replace(":", ".");
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const start = formatClock(startsAt);

  if (localDateKey(startsAt) !== localDateKey(endsAt)) {
    return `${start} WIB`;
  }

  const end = formatClock(endsAt);
  return start === end ? `${start} WIB` : `${start}–${end} WIB`;
}

function isExpired(value: string | null) {
  if (!value) {
    return false;
  }

  const date = validDate(value);
  return date ? date.getTime() < Date.now() : false;
}

function mapFallbackEvent(event: EventItem): PublicEvent {
  const isPast = isExpired(event.endsAt);

  return {
    ...event,
    details: [event.description],
    rundown: [],
    capacity: null,
    registrationDeadline: null,
    registrationOpen: Boolean(event.registration) && !isPast,
    zoomUrl: null,
    youtubeUrl: null,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPast,
  };
}

function mapDatabaseEvent(row: EventRow): PublicEvent {
  const seo = isRecord(row.seo) ? row.seo : {};
  const endsAt = row.ends_at || fallbackEndDate(row.starts_at);
  const isPast = isExpired(endsAt);
  const description =
    row.short_description?.trim() ||
    row.description?.trim() ||
    "Ikuti kegiatan terbaru bersama keluarga GMAHK Naripan.";
  const details = splitParagraphs(row.description);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: formatDateRange(row.starts_at, endsAt),
    time: formatTimeRange(row.starts_at, endsAt),
    startsAt: row.starts_at,
    endsAt,
    location: row.location?.trim() || DEFAULT_LOCATION,
    description,
    image: stringValue(seo, "image") || DEFAULT_EVENT_IMAGE,
    registration: row.registration_enabled,
    details: details.length ? details : [description],
    rundown: parseRundown(row.rundown),
    capacity: row.capacity,
    registrationDeadline: row.registration_deadline,
    registrationOpen:
      row.registration_enabled &&
      !isPast &&
      !isExpired(row.registration_deadline),
    zoomUrl: row.zoom_url,
    youtubeUrl: row.youtube_url,
    publishedAt: row.published_at || row.created_at,
    updatedAt: row.updated_at,
    isPast,
  };
}

function fallbackPublishedEvents() {
  return fallbackEvents.map(mapFallbackEvent);
}

export async function getPublishedEvents(): Promise<PublicEvent[]> {
  const supabase = createPublicClient();

  if (!supabase) {
    return fallbackPublishedEvents();
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, title, category, short_description, description, starts_at, ends_at, location, rundown, zoom_url, youtube_url, registration_enabled, capacity, registration_deadline, seo, published_at, created_at, updated_at",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    console.error(
      "Gagal mengambil kegiatan publik dari Supabase:",
      error.message,
    );

    return fallbackPublishedEvents();
  }

  return (data as EventRow[]).map(mapDatabaseEvent);
}

export async function getUpcomingEvents(
  limit?: number,
): Promise<PublicEvent[]> {
  const events = (await getPublishedEvents())
    .filter((event) => !event.isPast)
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
    );

  return typeof limit === "number" ? events.slice(0, limit) : events;
}

export async function getPastEvents(
  limit?: number,
): Promise<PublicEvent[]> {
  const events = (await getPublishedEvents())
    .filter((event) => event.isPast)
    .sort(
      (first, second) =>
        new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime(),
    );

  return typeof limit === "number" ? events.slice(0, limit) : events;
}

async function loadPublishedEventBySlug(
  slug: string,
): Promise<PublicEvent | null> {
  const supabase = createPublicClient();

  if (!supabase) {
    const fallback = fallbackEvents.find((event) => event.slug === slug);
    return fallback ? mapFallbackEvent(fallback) : null;
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, title, category, short_description, description, starts_at, ends_at, location, rundown, zoom_url, youtube_url, registration_enabled, capacity, registration_deadline, seo, published_at, created_at, updated_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error(
      `Gagal mengambil kegiatan publik dengan slug "${slug}":`,
      error.message,
    );

    const fallback = fallbackEvents.find((event) => event.slug === slug);
    return fallback ? mapFallbackEvent(fallback) : null;
  }

  return data ? mapDatabaseEvent(data as EventRow) : null;
}


export const getPublishedEventBySlug = cache(loadPublishedEventBySlug);

export function getEventFilterOptions(): {
  categories: SelectOption[];
  scopes: SelectOption[];
} {
  return {
    categories: eventCategories.map((category) => ({
      value: category,
      label: category,
    })),
    scopes: [
      { value: "upcoming", label: "Kegiatan mendatang" },
      { value: "past", label: "Kegiatan selesai" },
      { value: "all", label: "Semua kegiatan" },
    ],
  };
}

export async function getPublishedEventsPage(
  filters: PublicPageFilters,
): Promise<PaginatedResult<PublicEvent>> {
  const page = safePage(filters.page);
  const pageSize = safePageSize(filters.pageSize, 9, [9]);
  const queryText = normalizeSearch(filters.query);
  const category = normalizeChoice(filters.category);
  const scope =
    filters.scope === "past" || filters.scope === "all"
      ? filters.scope
      : "upcoming";
  const dateFrom = normalizeDateInput(filters.dateFrom);
  const dateTo = normalizeDateInput(filters.dateTo);

  function fallbackResult() {
    const normalizedQuery = queryText.toLocaleLowerCase("id-ID");
    const now = Date.now();
    const filtered = fallbackPublishedEvents()
      .filter((event) => {
        const startsAt = new Date(event.startsAt).getTime();
        const haystack = [
          event.title,
          event.category,
          event.description,
          event.location,
          event.details.join(" "),
        ]
          .join(" ")
          .toLocaleLowerCase("id-ID");

        if (normalizedQuery && !haystack.includes(normalizedQuery)) {
          return false;
        }

        if (category && event.category !== category) {
          return false;
        }

        if (scope === "upcoming" && startsAt < now) {
          return false;
        }

        if (scope === "past" && startsAt >= now) {
          return false;
        }

        if (
          dateFrom &&
          startsAt < new Date(jakartaDayStart(dateFrom)).getTime()
        ) {
          return false;
        }

        if (dateTo && startsAt > new Date(jakartaDayEnd(dateTo)).getTime()) {
          return false;
        }

        return true;
      })
      .sort((first, second) => {
        const firstDate = new Date(first.startsAt).getTime();
        const secondDate = new Date(second.startsAt).getTime();
        return scope === "upcoming"
          ? firstDate - secondDate
          : secondDate - firstDate;
      });

    return fallbackPagination(filtered, page, pageSize);
  }

  const supabase = createPublicClient();

  if (!supabase) {
    return fallbackResult();
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const now = new Date().toISOString();
  let databaseQuery = supabase
    .from("events")
    .select(
      "id, slug, title, category, short_description, description, starts_at, ends_at, location, rundown, zoom_url, youtube_url, registration_enabled, capacity, registration_deadline, seo, published_at, created_at, updated_at",
      { count: "exact" },
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", now);

  if (queryText) {
    databaseQuery = databaseQuery.ilike("search_text", `%${queryText}%`);
  }

  if (category) {
    databaseQuery = databaseQuery.eq("category", category);
  }

  if (scope === "upcoming") {
    databaseQuery = databaseQuery.gte("starts_at", now);
  } else if (scope === "past") {
    databaseQuery = databaseQuery.lt("starts_at", now);
  }

  if (dateFrom) {
    databaseQuery = databaseQuery.gte("starts_at", jakartaDayStart(dateFrom));
  }

  if (dateTo) {
    databaseQuery = databaseQuery.lte("starts_at", jakartaDayEnd(dateTo));
  }

  const { data, error, count } = await databaseQuery
    .order("starts_at", { ascending: scope === "upcoming" })
    .range(from, to);

  if (error) {
    console.error("Daftar kegiatan tidak dapat dimuat:", error.message);
    return fallbackResult();
  }

  return createPagination(
    (data as EventRow[]).map(mapDatabaseEvent),
    count ?? 0,
    page,
    pageSize,
  );
}
