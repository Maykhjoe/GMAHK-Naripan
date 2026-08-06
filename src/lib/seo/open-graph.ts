import {
  allMinistries,
  events,
  posts,
  sermons,
} from "@/lib/constants/site-data";

export type OpenGraphContent = {
  title: string;
  eyebrow: string;
  description: string;
  image?: string;
};

export type OpenGraphContentKind =
  | "event"
  | "article"
  | "sermon"
  | "ministry";

export function getOpenGraphContent(
  kind: OpenGraphContentKind,
  slug: string,
): OpenGraphContent | null {
  if (kind === "event") {
    const event = events.find((item) => item.slug === slug);

    return event
      ? {
          title: event.title,
          eyebrow: event.category,
          description: `${event.date} · ${event.time} · ${event.location}`,
          image: event.image,
        }
      : null;
  }

  if (kind === "article") {
    const post = posts.find((item) => item.slug === slug);

    return post
      ? {
          title: post.title,
          eyebrow: post.category,
          description: post.excerpt,
          image: post.image,
        }
      : null;
  }

  if (kind === "sermon") {
    const sermon = sermons.find((item) => item.slug === slug);

    return sermon
      ? {
          title: sermon.title,
          eyebrow: sermon.category,
          description: `${sermon.speaker} · ${sermon.date} · ${sermon.verse}`,
          image: sermon.image,
        }
      : null;
  }

  const ministry = allMinistries.find((item) => item.slug === slug);

  return ministry
    ? {
        title: ministry.name,
        eyebrow: "Departemen Pelayanan",
        description: ministry.description,
      }
    : null;
}
