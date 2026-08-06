import { describe, expect, it } from "vitest";
import { createGoogleCalendarUrl, createIcsEvent } from "./calendar";

const event = { uid: "seminar@example.test", title: "Seminar, Keluarga", description: "Baris satu\nBaris dua", location: "Aula; Naripan", startsAt: "2026-08-15T14:00:00+07:00", endsAt: "2026-08-15T16:00:00+07:00" };
describe("calendar exports", () => {
  it("creates a UTC ICS event with escaped content and CRLF lines", () => {
    const ics = createIcsEvent(event);
    expect(ics).toContain("DTSTART:20260815T070000Z\r\nDTEND:20260815T090000Z");
    expect(ics).toContain("SUMMARY:Seminar\\, Keluarga");
    expect(ics).toContain("LOCATION:Aula\\; Naripan");
    expect(ics).toContain("DESCRIPTION:Baris satu\\nBaris dua");
  });
  it("creates a Google Calendar template URL", () => {
    const url = new URL(createGoogleCalendarUrl(event));
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20260815T070000Z/20260815T090000Z");
    expect(url.searchParams.get("text")).toBe(event.title);
  });
});
