import type { EventItem, Post, Sermon } from "@/types/content";

type SiteConfig = {
  name: string;
  shortName: string;
  description: string;
  url: string;
  address: string;
  phone: string;
  email: string;
  youtube: string;
  instagram: string;
};

type BreadcrumbItem = { name: string; path: string };

type ArticleSeoInput = Post & {
  publishedAt?: string;
  updatedAt?: string;
};

type SermonSeoInput = Sermon & {
  publishedAt?: string;
  updatedAt?: string;
};

type EventSeoInput = EventItem & {
  zoomUrl?: string | null;
  youtubeUrl?: string | null;
};

type MinistrySeoInput = {
  slug: string;
  name: string;
  shortDescription: string;
  image?: string | null;
  coordinator?: string | null;
  email?: string | null;
};

const INDONESIAN_MONTHS: Record<string, string> = {
  Januari: "01",
  Februari: "02",
  Maret: "03",
  April: "04",
  Mei: "05",
  Juni: "06",
  Juli: "07",
  Agustus: "08",
  September: "09",
  Oktober: "10",
  November: "11",
  Desember: "12",
};

function baseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function absoluteUrl(base: string, path: string) {
  const normalized = baseUrl(base);
  return path === "/" ? `${normalized}/` : new URL(path, `${normalized}/`).toString();
}

function isOfficialValue(value: string) {
  const normalized = value.trim().toLowerCase();

  const placeholderValues = new Set([
    "-",
    "—",
    "n/a",
    "na",
    "null",
    "undefined",
    "belum tersedia",
  ]);

  return (
    Boolean(normalized) &&
    !placeholderValues.has(normalized) &&
    !(normalized.startsWith("[") && normalized.endsWith("]")) &&
    !normalized.includes("placeholder")
  );
}

function normalizeIndonesianDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return value;
  const [, day, month, year] = match;
  const monthNumber = INDONESIAN_MONTHS[month];
  return monthNumber ? `${year}-${monthNumber}-${day.padStart(2, "0")}` : value;
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function createChurchJsonLd(site: SiteConfig) {
  const url = baseUrl(site.url);
  const sameAs = [site.youtube, site.instagram].filter(isOfficialValue);
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": `${url}/#church`,
    name: site.name,
    alternateName: site.shortName,
    description: site.description,
    url,
    ...(isOfficialValue(site.address) ? { address: { "@type": "PostalAddress", streetAddress: site.address } } : {}),
    ...(isOfficialValue(site.phone) ? { telephone: site.phone } : {}),
    ...(isOfficialValue(site.email) ? { email: site.email } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function createWebsiteJsonLd(site: SiteConfig) {
  const url = baseUrl(site.url);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url,
    name: site.name,
    description: site.description,
    inLanguage: "id-ID",
    publisher: { "@id": `${url}/#church` },
  };
}

export function createEventJsonLd(event: EventSeoInput, site: SiteConfig) {
  const url = absoluteUrl(site.url, `/kegiatan/${event.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${url}#event`,
    name: event.title,
    description: event.description,
    image: [event.image],
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: event.isPast
      ? "https://schema.org/EventCompleted"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode:
      event.zoomUrl || event.youtubeUrl
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.location },
    organizer: { "@id": `${baseUrl(site.url)}/#church` },
    url,
    ...((event.registrationOpen ?? event.registration) ? {
      offers: {
        "@type": "Offer",
        url,
        price: 0,
        priceCurrency: "IDR",
        availability: "https://schema.org/InStock",
      },
    } : {}),
  };
}

export function createArticleJsonLd(post: ArticleSeoInput, site: SiteConfig) {
  const url = absoluteUrl(site.url, `/berita/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    image: [post.image],
    datePublished: post.publishedAt || normalizeIndonesianDate(post.date),
    dateModified:
      post.updatedAt || post.publishedAt || normalizeIndonesianDate(post.date),
    inLanguage: "id-ID",
    author: { "@type": "Organization", name: post.author },
    publisher: { "@id": `${baseUrl(site.url)}/#church` },
    mainEntityOfPage: url,
  };
}

export function createSermonJsonLd(sermon: SermonSeoInput, site: SiteConfig) {
  const url = absoluteUrl(site.url, `/khotbah/${sermon.slug}`);
  const base = {
    "@context": "https://schema.org",
    "@id": `${url}#sermon`,
    name: sermon.title,
    description: `${sermon.title} oleh ${sermon.speaker}. Tema ayat: ${sermon.verse}.`,
    thumbnailUrl: [sermon.image],
    uploadDate: sermon.publishedAt || normalizeIndonesianDate(sermon.date),
    inLanguage: "id-ID",
    publisher: { "@id": `${baseUrl(site.url)}/#church` },
    mainEntityOfPage: url,
  };

  if (!sermon.youtubeId) {
    return {
      ...base,
      "@type": "CreativeWork",
      author: { "@type": "Person", name: sermon.speaker },
    };
  }

  return {
    ...base,
    "@type": "VideoObject",
    embedUrl: `https://www.youtube-nocookie.com/embed/${sermon.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${sermon.youtubeId}`,
  };
}

export function createMinistryJsonLd(
  ministry: MinistrySeoInput,
  site: SiteConfig,
) {
  const url = absoluteUrl(site.url, `/pelayanan/${ministry.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}#ministry`,
    name: ministry.name,
    description: ministry.shortDescription,
    url,
    parentOrganization: { "@id": `${baseUrl(site.url)}/#church` },
    ...(ministry.image ? { image: ministry.image } : {}),
    ...(ministry.coordinator
      ? { employee: { "@type": "Person", name: ministry.coordinator } }
      : {}),
    ...(ministry.email ? { email: ministry.email } : {}),
  };
}

export function createBreadcrumbJsonLd(items: BreadcrumbItem[], base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(base, item.path),
    })),
  };
}
