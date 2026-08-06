const churchAddress =
  "Jl. Naripan No.91, Kb. Pisang, Kec. Sumur Bandung, Kota Bandung, Jawa Barat 40112";

export type SiteConfig = {
  name: string;
  shortName: string;
  slogan: string;
  description: string;
  url: string;
  address: string;
  mapsUrl: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  instagramLabel: string;
  youtube: string;
  youtubeLabel: string;
  liveUrl: string;
  pastorName: string;
  secretariatHours: string;
  footerText: string;
};

export type EditableSiteConfig = Omit<SiteConfig, "url">;

export const defaultSiteConfig: SiteConfig = {
  name: "Gereja Masehi Advent Hari Ketujuh Jemaat Naripan",
  shortName: "GMAHK Naripan",
  slogan: "Bersama dalam Kristus",
  description:
    "Pusat informasi ibadah, pelayanan, dan kehidupan jemaat GMAHK Naripan.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://naripan.vercel.app",
  address: churchAddress,
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(churchAddress)}`,
  phone: "",
  whatsapp: "",
  email: "gmahknaripan91@gmail.com",
  instagram: "https://www.instagram.com/paners91/",
  instagramLabel: "PANers",
  youtube: "https://www.youtube.com/@gmahknaripan3281",
  youtubeLabel: "GMAHK Naripan",
  liveUrl: "https://www.youtube.com/@gmahknaripan3281/live",
  pastorName: "",
  secretariatHours: "Silakan hubungi sekretariat terlebih dahulu",
  footerText:
    "Sebuah keluarga iman yang bertumbuh dalam Firman, melayani dalam kasih, dan menjadi berkat bagi kota.",
};

const editableKeys: readonly (keyof EditableSiteConfig)[] = [
  "name",
  "shortName",
  "slogan",
  "description",
  "address",
  "mapsUrl",
  "phone",
  "whatsapp",
  "email",
  "instagram",
  "instagramLabel",
  "youtube",
  "youtubeLabel",
  "liveUrl",
  "pastorName",
  "secretariatHours",
  "footerText",
];

const optionalKeys = new Set<keyof EditableSiteConfig>([
  "mapsUrl",
  "phone",
  "whatsapp",
  "instagram",
  "youtube",
  "liveUrl",
  "pastorName",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeSiteConfig(value: unknown): SiteConfig {
  if (!isRecord(value)) {
    return defaultSiteConfig;
  }

  const result: SiteConfig = { ...defaultSiteConfig };

  for (const key of editableKeys) {
    const candidate = value[key];

    if (typeof candidate !== "string") {
      continue;
    }

    const normalized = candidate.trim();

    if (normalized || optionalKeys.has(key)) {
      result[key] = normalized;
    }
  }

  if (!result.mapsUrl && result.address) {
    result.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.address)}`;
  }

  return result;
}

export function editableSiteConfig(site: SiteConfig): EditableSiteConfig {
  return {
    name: site.name,
    shortName: site.shortName,
    slogan: site.slogan,
    description: site.description,
    address: site.address,
    mapsUrl: site.mapsUrl,
    phone: site.phone,
    whatsapp: site.whatsapp,
    email: site.email,
    instagram: site.instagram,
    instagramLabel: site.instagramLabel,
    youtube: site.youtube,
    youtubeLabel: site.youtubeLabel,
    liveUrl: site.liveUrl,
    pastorName: site.pastorName,
    secretariatHours: site.secretariatHours,
    footerText: site.footerText,
  };
}

export function getWhatsappUrl(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const international = digits.startsWith("0")
    ? `62${digits.slice(1)}`
    : digits;

  return `https://wa.me/${international}`;
}
export function extractYouTubeVideoId(value: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? "";
    }

    if (url.hostname.endsWith("youtube.com")) {
      const watchId = url.searchParams.get("v");

      if (watchId) {
        return watchId;
      }

      const parts = url.pathname.split("/").filter(Boolean);
      const markerIndex = parts.findIndex((part) =>
        ["embed", "shorts", "live"].includes(part),
      );

      if (markerIndex >= 0) {
        return parts[markerIndex + 1] ?? "";
      }
    }
  } catch {
    return /^[A-Za-z0-9_-]{6,20}$/.test(value) ? value : "";
  }

  return "";
}
