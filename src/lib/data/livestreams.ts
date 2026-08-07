import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import {
  deriveLivestreamDisplayStatus,
  effectiveLivestreamEnd,
  type LivestreamDisplayStatus,
} from "@/lib/live/status";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export type { LivestreamDisplayStatus } from "@/lib/live/status";

type LivestreamRow = {
  id: string;
  title: string;
  theme: string | null;
  speaker_name: string | null;
  scripture_reference: string | null;
  starts_at: string;
  ends_at: string | null;
  youtube_id: string | null;
  zoom_url: string | null;
  thumbnail_url: string | null;
  offline_message: string | null;
  live_status: LivestreamDisplayStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicLivestream = {
  id: string;
  title: string;
  theme: string;
  speaker: string;
  scriptureReference: string;
  startsAt: string;
  endsAt: string;
  youtubeId: string;
  youtubeUrl: string;
  zoomUrl: string;
  thumbnailUrl: string;
  offlineMessage: string;
  liveStatus: LivestreamDisplayStatus;
  displayStatus: LivestreamDisplayStatus;
  dateLabel: string;
  timeLabel: string;
  publishedAt: string;
  updatedAt: string;
};

export type LivestreamOverview = {
  featured: PublicLivestream | null;
  current: PublicLivestream | null;
  upcoming: PublicLivestream[];
  recentEnded: PublicLivestream | null;
  isLive: boolean;
};

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
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date);
}

function formatTime(value: string) {
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
    .replace(".", ":");
}

function mapLivestream(row: LivestreamRow, now: Date): PublicLivestream {
  const endsAt = effectiveLivestreamEnd(row.starts_at, row.ends_at);
  const startDate = validDate(row.starts_at);
  const endDate = validDate(endsAt);
  const sameDay =
    startDate &&
    endDate &&
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: JAKARTA_TIME_ZONE,
    }).format(startDate) ===
      new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: JAKARTA_TIME_ZONE,
      }).format(endDate);

  return {
    id: row.id,
    title: row.title,
    theme: row.theme?.trim() || "Ibadah dan pelayanan Firman",
    speaker: row.speaker_name?.trim() || "Pembicara akan diumumkan",
    scriptureReference: row.scripture_reference?.trim() || "",
    startsAt: row.starts_at,
    endsAt,
    youtubeId: row.youtube_id?.trim() || "",
    youtubeUrl: row.youtube_id?.trim()
      ? `https://www.youtube.com/watch?v=${row.youtube_id.trim()}`
      : "",
    zoomUrl: row.zoom_url?.trim() || "",
    thumbnailUrl: row.thumbnail_url?.trim() || "",
    offlineMessage:
      row.offline_message?.trim() ||
      "Siaran belum dimulai. Silakan kembali sesuai jadwal yang tertera.",
    liveStatus: row.live_status,
    displayStatus: deriveLivestreamDisplayStatus(row, now),
    dateLabel: formatDate(row.starts_at),
    timeLabel: sameDay
      ? `${formatTime(row.starts_at)}–${formatTime(endsAt)} WIB`
      : `${formatTime(row.starts_at)} WIB`,
    publishedAt: row.published_at || row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPublishedLivestreams(): Promise<PublicLivestream[]> {
  const supabase = createPublicClient();

  if (!supabase) {
    return [];
  }

  const now = new Date();
  const historyStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("livestreams")
    .select(
      "id,title,theme,speaker_name,scripture_reference,starts_at,ends_at,youtube_id,zoom_url,thumbnail_url,offline_message,live_status,published_at,created_at,updated_at",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", now.toISOString())
    .gte("starts_at", historyStart.toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error(
      "Gagal mengambil data live streaming dari Supabase:",
      error.message,
    );
    return [];
  }

  return (data as LivestreamRow[])
    .map((row) => mapLivestream(row, now))
    .filter((item) => item.displayStatus !== "cancelled");
}

export async function getLivestreamOverview(): Promise<LivestreamOverview> {
  const livestreams = await getPublishedLivestreams();
  const current =
    livestreams.find((item) => item.displayStatus === "live") ?? null;
  const upcoming = livestreams
    .filter((item) => item.displayStatus === "scheduled")
    .slice(0, 3);
  const recentEnded =
    [...livestreams]
      .filter((item) => item.displayStatus === "ended")
      .sort(
        (first, second) =>
          new Date(second.startsAt).getTime() -
          new Date(first.startsAt).getTime(),
      )[0] ?? null;

  return {
    current,
    upcoming,
    recentEnded,
    featured: current ?? upcoming[0] ?? recentEnded,
    isLive: Boolean(current),
  };
}
