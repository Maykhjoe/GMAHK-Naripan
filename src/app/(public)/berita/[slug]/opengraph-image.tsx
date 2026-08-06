import { notFound } from "next/navigation";

import { getPublishedPostBySlug } from "@/lib/data/posts";
import {
  createContentOpenGraphImage,
  openGraphImageSize,
} from "@/lib/seo/open-graph-image";

export const alt = "Pratinjau berita GMAHK Naripan";
export const size = openGraphImageSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return createContentOpenGraphImage({
    title: post.title,
    eyebrow: post.category,
    description: post.excerpt,
    image: post.image,
  });
}
