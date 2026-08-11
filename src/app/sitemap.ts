import type { MetadataRoute } from "next";

import { getPublishedEvents } from "@/lib/data/events";
import { getPublishedMinistries } from "@/lib/data/ministries";
import { getPublishedPosts } from "@/lib/data/posts";
import { getPublishedSermons } from "@/lib/data/sermons";
import { getSiteConfig } from "@/lib/data/site-settings";

function safeLastModified(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, events, sermons, posts, ministries] = await Promise.all([
    getSiteConfig(),
    getPublishedEvents(),
    getPublishedSermons(),
    getPublishedPosts(),
    getPublishedMinistries(),
  ]);

  const base = site.url.replace(/\/+$/, "");

  const pages: Array<{
    path: string;
    changeFrequency: "weekly" | "monthly";
    priority: number;
  }> = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/tentang", changeFrequency: "monthly", priority: 0.8 },
    { path: "/jadwal-ibadah", changeFrequency: "weekly", priority: 0.85 },
    { path: "/kegiatan", changeFrequency: "weekly", priority: 0.85 },
    { path: "/khotbah", changeFrequency: "weekly", priority: 0.85 },
    { path: "/live", changeFrequency: "weekly", priority: 0.85 },
    { path: "/pelayanan", changeFrequency: "monthly", priority: 0.8 },
    { path: "/berita", changeFrequency: "weekly", priority: 0.85 },
    { path: "/galeri", changeFrequency: "monthly", priority: 0.7 },
    { path: "/pengunjung-baru", changeFrequency: "monthly", priority: 0.7 },
    { path: "/kontak", changeFrequency: "monthly", priority: 0.7 },
    { path: "/kebijakan-privasi", changeFrequency: "monthly", priority: 0.3 },
  ];

  return [
    ...pages.map((page) => ({
      url: `${base}${page.path}`,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...events.map((item) => ({
      url: `${base}/kegiatan/${item.slug}`,
      lastModified: safeLastModified(item.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...sermons.map((item) => ({
      url: `${base}/khotbah/${item.slug}`,
      lastModified: safeLastModified(item.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...posts.map((item) => ({
      url: `${base}/berita/${item.slug}`,
      lastModified: safeLastModified(item.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...ministries.map((item) => ({
      url: `${base}/pelayanan/${item.slug}`,
      lastModified: safeLastModified(item.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  ];
}
