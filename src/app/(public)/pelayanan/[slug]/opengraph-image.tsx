import { notFound } from "next/navigation";

import { getPublishedMinistryBySlug } from "@/lib/data/ministries";
import {
  createContentOpenGraphImage,
  openGraphImageSize,
} from "@/lib/seo/open-graph-image";

export const alt = "Pratinjau pelayanan GMAHK Naripan";
export const size = openGraphImageSize;
export const contentType = "image/png";
export const revalidate = 60;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ministry = await getPublishedMinistryBySlug(slug);

  if (!ministry) {
    notFound();
  }

  return createContentOpenGraphImage({
    title: ministry.name,
    eyebrow: "Departemen Pelayanan",
    description: ministry.shortDescription,
    image: ministry.image ?? undefined,
  });
}
