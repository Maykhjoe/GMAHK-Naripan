import { notFound } from "next/navigation";

import { getPublishedEventBySlug } from "@/lib/data/events";
import {
  createContentOpenGraphImage,
  openGraphImageSize,
} from "@/lib/seo/open-graph-image";

export const alt = "Pratinjau kegiatan GMAHK Naripan";
export const size = openGraphImageSize;
export const contentType = "image/png";
export const revalidate = 60;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return createContentOpenGraphImage({
    title: event.title,
    eyebrow: event.category,
    description: `${event.date} · ${event.time} · ${event.location}`,
    image: event.image,
  });
}
