import type { MetadataRoute } from "next";

import { getPublishedEvents } from "@/lib/data/events";
import { getPublishedMinistries } from "@/lib/data/ministries";
import { getPublishedPosts } from "@/lib/data/posts";
import { getPublishedSermons } from "@/lib/data/sermons";
import { getSiteConfig } from "@/lib/data/site-settings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, events, sermons, posts, ministries] = await Promise.all([
    getSiteConfig(),
    getPublishedEvents(),
    getPublishedSermons(),
    getPublishedPosts(),
    getPublishedMinistries(),
  ]);
  const pages = [
    "",
    "/tentang",
    "/jadwal-ibadah",
    "/kegiatan",
    "/khotbah",
    "/live",
    "/pelayanan",
    "/berita",
    "/galeri",
    "/permohonan-doa",
    "/pengunjung-baru",
    "/kontak",
    "/kebijakan-privasi",
  ];

  return [
    ...pages.map((path) => ({
      url: `${site.url}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.7,
    })),
    ...events.map((item) => ({
      url: `${site.url}/kegiatan/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...sermons.map((item) => ({
      url: `${site.url}/khotbah/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...posts.map((item) => ({
      url: `${site.url}/berita/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...ministries.map((item) => ({
      url: `${site.url}/pelayanan/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
