export type CalendarEvent = { uid: string; title: string; description?: string; location?: string; startsAt: string; endsAt: string; url?: string };
function utcStamp(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal kalender tidak valid");
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function escapeIcs(value: string) { return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
export function createIcsEvent(event: CalendarEvent, createdAt: Date = new Date()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GMAHK Naripan//Kalender Kegiatan//ID", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${escapeIcs(event.uid)}`, `DTSTAMP:${utcStamp(createdAt)}`, `DTSTART:${utcStamp(event.startsAt)}`, `DTEND:${utcStamp(event.endsAt)}`, `SUMMARY:${escapeIcs(event.title)}`];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
  if (event.url) lines.push(`URL:${escapeIcs(event.url)}`);
  lines.push("END:VEVENT", "END:VCALENDAR", "");
  return lines.join("\r\n");
}
export function createGoogleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${utcStamp(event.startsAt)}/${utcStamp(event.endsAt)}`, details: event.description ?? "", location: event.location ?? "" });
  if (event.url) params.set("sprop", event.url);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
