import { NextResponse } from "next/server";

import { createIcsEvent } from "@/lib/calendar";
import { siteConfig } from "@/lib/constants/site-data";
import { getPublishedEventBySlug } from "@/lib/data/events";

export const revalidate = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    return NextResponse.json(
      { message: "Kegiatan tidak ditemukan" },
      { status: 404 },
    );
  }

  const ics = createIcsEvent({
    uid: `${event.slug}@gmahk-naripan`,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    url: `${siteConfig.url}/kegiatan/${event.slug}`,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
