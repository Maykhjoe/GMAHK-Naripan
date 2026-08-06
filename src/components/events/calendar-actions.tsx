import { CalendarPlus, ExternalLink } from "lucide-react";
import type { EventItem } from "@/types/content";
import { createGoogleCalendarUrl } from "@/lib/calendar";
import { siteConfig } from "@/lib/constants/site-data";
import { Button } from "@/components/ui/button";

export function CalendarActions({ event }: { event: EventItem }) {
  const calendarEvent = { uid: `${event.slug}@gmahk-naripan`, title: event.title, description: event.description, location: event.location, startsAt: event.startsAt, endsAt: event.endsAt, url: `${siteConfig.url}/kegiatan/${event.slug}` };
  return <div className="mt-3 grid gap-3"><Button asChild variant="outlineLight" className="w-full"><a href={`/api/calendar/events/${event.slug}`} download><CalendarPlus className="size-4" />Unduh Kalender (.ics)</a></Button><Button asChild variant="outlineLight" className="w-full"><a href={createGoogleCalendarUrl(calendarEvent)} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />Google Calendar</a></Button></div>;
}
