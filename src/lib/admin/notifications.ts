export const ADMIN_NOTIFICATIONS_CHANGED_EVENT = "admin-notifications-changed";

export const notificationTypes = [
  "system",
  "prayer",
  "visitor",
  "contact",
  "registration",
  "event_reminder",
  "livestream_reminder",
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type NotificationReadFilter = "all" | "unread" | "read";
export type NotificationStatusFilter = "active" | "archived";

export type AdminNotification = {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  status: "active" | "archived" | string;
  type: NotificationType | string;
  source_type: string | null;
  source_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
};

export const notificationTypeLabels: Record<NotificationType, string> = {
  system: "Sistem",
  prayer: "Permohonan doa",
  visitor: "Pengunjung baru",
  contact: "Pesan masuk",
  registration: "Pendaftaran kegiatan",
  event_reminder: "Pengingat kegiatan",
  livestream_reminder: "Pengingat live",
};

export function isNotificationType(value: string): value is NotificationType {
  return notificationTypes.includes(value as NotificationType);
}

export function normalizeNotificationType(value: string | null | undefined) {
  return value && isNotificationType(value) ? value : "system";
}

export function sanitizeNotificationSearch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function parseNotificationListParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const requestedPageSize = Number(searchParams.get("pageSize"));
  const pageSize = [8, 10, 20, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 20;
  const requestedType = searchParams.get("type")?.trim() ?? "";
  const type = isNotificationType(requestedType) ? requestedType : "";
  const requestedRead = searchParams.get("read")?.trim();
  const read: NotificationReadFilter =
    requestedRead === "unread" || requestedRead === "read"
      ? requestedRead
      : "all";
  const status: NotificationStatusFilter =
    searchParams.get("status") === "archived" ? "archived" : "active";
  const q = sanitizeNotificationSearch(searchParams.get("q"));

  return { page, pageSize, type, read, status, q };
}

export function notificationPageCount(count: number, pageSize: number) {
  return Math.max(1, Math.ceil(Math.max(0, count) / Math.max(1, pageSize)));
}

export function formatNotificationTime(
  value: string,
  now = new Date(),
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Waktu tidak diketahui";
  }

  const deltaSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(deltaSeconds);
  const relative = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return relative.format(deltaSeconds, "second");
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);

  if (Math.abs(deltaMinutes) < 60) {
    return relative.format(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (Math.abs(deltaHours) < 24) {
    return relative.format(deltaHours, "hour");
  }

  const deltaDays = Math.round(deltaHours / 24);

  if (Math.abs(deltaDays) <= 7) {
    return relative.format(deltaDays, "day");
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
