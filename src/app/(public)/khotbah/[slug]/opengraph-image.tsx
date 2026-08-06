import { notFound } from "next/navigation";

import { getPublishedSermonBySlug } from "@/lib/data/sermons";
import {
  createContentOpenGraphImage,
  openGraphImageSize,
} from "@/lib/seo/open-graph-image";

export const alt = "Pratinjau khotbah GMAHK Naripan";
export const size = openGraphImageSize;
export const contentType = "image/png";
export const revalidate = 60;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sermon = await getPublishedSermonBySlug(slug);

  if (!sermon) {
    notFound();
  }

  return createContentOpenGraphImage({
    title: sermon.title,
    eyebrow: sermon.category,
    description: `${sermon.speaker} · ${sermon.date} · ${sermon.verse}`,
    image: sermon.image,
  });
}
