import "server-only";

import { specialWorshipCategories } from "@/lib/constants/worship-schedules";
import { createPublicClient } from "@/lib/supabase/public";
import type { ServiceSchedule } from "@/types/content";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const DEFAULT_LOCATION = "GMAHK Jemaat Naripan";

type ScheduleRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  zoom_url: string | null;
  youtube_url: string | null;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
};

export type PublicSpecialWorshipSchedule = ServiceSchedule & {
  slug: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  zoomUrl: string | null;
  youtubeUrl: string | null;
};

function toDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localDateKey(value: string) {
  const date = toDate(value);

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

function formatDay(value: string) {
  const date = toDate(value);

  if (!date) {
    return "Tanggal khusus";
  }

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date);
}

function formatDate(value: string) {
  const date = toDate(value);

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

function formatDateRange(startsAt: string, endsAt: string | null) {
  if (!endsAt || localDateKey(startsAt) === localDateKey(endsAt)) {
    return formatDate(startsAt);
  }

  return `${formatDate(startsAt)} – ${formatDate(endsAt)}`;
}

function formatClock(value: string) {
  const date = toDate(value);

  if (!date) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: JAKARTA_TIME_ZONE,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  return hour && minute ? `${hour}:${minute}` : value;
}

function formatTimeRange(startsAt: string, endsAt: string | null) {
  const start = formatClock(startsAt);

  if (!endsAt || localDateKey(startsAt) !== localDateKey(endsAt)) {
    return `${start} WIB`;
  }

  const end = formatClock(endsAt);
  return start === end ? `${start} WIB` : `${start}–${end} WIB`;
}

function hasEnded(row: ScheduleRow, now: number) {
  const boundary =
    toDate(row.ends_at)?.getTime() ?? toDate(row.starts_at)?.getTime();

  return boundary ? boundary < now : true;
}

function mapSchedule(row: ScheduleRow): PublicSpecialWorshipSchedule {
  return {
    id: row.slug || row.id,
    slug: row.slug,
    title: row.title,
    day: formatDay(row.starts_at),
    date: formatDateRange(row.starts_at, row.ends_at),
    time: formatTimeRange(row.starts_at, row.ends_at),
    location: row.location?.trim() || DEFAULT_LOCATION,
    category: row.category,
    featured: row.is_featured,
    description: row.description?.trim() || null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    zoomUrl: row.zoom_url,
    youtubeUrl: row.youtube_url,
  };
}

export async function getUpcomingSpecialWorshipSchedules(
  limit?: number,
): Promise<PublicSpecialWorshipSchedule[]> {
  const supabase = createPublicClient();

  if (!supabase) {
    return [];
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_schedules")
    .select(
      "id, slug, title, category, description, starts_at, ends_at, location, zoom_url, youtube_url, is_featured, published_at, created_at",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .in("category", [...specialWorshipCategories])
    .lte("published_at", nowIso)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error(
      "Gagal mengambil ibadah khusus dari Supabase:",
      error.message,
    );
    return [];
  }

  const now = Date.now();
  const schedules = ((data ?? []) as ScheduleRow[])
    .filter((row) => !hasEnded(row, now))
    .map(mapSchedule);

  return typeof limit === "number" ? schedules.slice(0, limit) : schedules;
}
