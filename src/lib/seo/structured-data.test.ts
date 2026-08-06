import { describe, expect, it } from "vitest";
import { events, posts, sermons, siteConfig } from "@/lib/constants/site-data";
import {
  createArticleJsonLd,
  createBreadcrumbJsonLd,
  createChurchJsonLd,
  createEventJsonLd,
  createSermonJsonLd,
  createWebsiteJsonLd,
  serializeJsonLd,
} from "./structured-data";

describe("structured data", () => {
  it("escapes script-breaking characters during serialization", () => {
    const serialized = serializeJsonLd({ value: "</script><script>alert(1)</script>" });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
  });

  it("creates Church schema with official contact data and excludes placeholders", () => {
    const schema = createChurchJsonLd(siteConfig);

    expect(schema).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Church",
      "@id": `${siteConfig.url}/#church`,
      name: siteConfig.name,
      url: siteConfig.url,
      address: {
        "@type": "PostalAddress",
        streetAddress: siteConfig.address,
      },
      email: siteConfig.email,
    });

    expect(schema).not.toHaveProperty("telephone");
  });

  it("creates WebSite schema linked to the church publisher", () => {
    const schema = createWebsiteJsonLd(siteConfig);
    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: "id-ID",
      publisher: { "@id": `${siteConfig.url}/#church` },
    });
  });

  it("creates Event schema with canonical URL, ISO dates, and registration offer", () => {
    const event = events[0];
    const schema = createEventJsonLd(event, siteConfig);
    expect(schema).toMatchObject({
      "@type": "Event",
      name: event.title,
      startDate: event.startsAt,
      endDate: event.endsAt,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      url: `${siteConfig.url}/kegiatan/${event.slug}`,
      location: { "@type": "Place", name: event.location },
      offers: { "@type": "Offer", price: 0, priceCurrency: "IDR", availability: "https://schema.org/InStock" },
    });
  });

  it("creates Article schema with normalized Indonesian publication date", () => {
    const post = posts[0];
    const schema = createArticleJsonLd(post, siteConfig);
    expect(schema).toMatchObject({
      "@type": "Article",
      headline: post.title,
      datePublished: "2026-08-03",
      mainEntityOfPage: `${siteConfig.url}/berita/${post.slug}`,
      author: { "@type": "Organization", name: post.author },
    });
  });

  it("creates VideoObject schema for sermons", () => {
    const sermon = sermons[0];
    const schema = createSermonJsonLd(sermon, siteConfig);
    expect(schema).toMatchObject({
      "@type": "VideoObject",
      name: sermon.title,
      uploadDate: "2026-08-01",
      embedUrl: `https://www.youtube-nocookie.com/embed/${sermon.youtubeId}`,
      mainEntityOfPage: `${siteConfig.url}/khotbah/${sermon.slug}`,
    });
  });

  it("creates ordered BreadcrumbList entries with absolute URLs", () => {
    const schema = createBreadcrumbJsonLd([
      { name: "Beranda", path: "/" },
      { name: "Kegiatan", path: "/kegiatan" },
      { name: "Seminar", path: "/kegiatan/seminar" },
    ], siteConfig.url);
    expect(schema.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Beranda", item: `${siteConfig.url}/` },
      { "@type": "ListItem", position: 2, name: "Kegiatan", item: `${siteConfig.url}/kegiatan` },
      { "@type": "ListItem", position: 3, name: "Seminar", item: `${siteConfig.url}/kegiatan/seminar` },
    ]);
  });
});
