import type { MetadataRoute } from "next";

import { getSiteConfig } from "@/lib/data/site-settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteConfig();

  const base = site.url.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
