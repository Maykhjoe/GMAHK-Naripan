const PUBLIC_SECTION_PATHS: Record<string, readonly string[]> = {
  berita: ["/", "/berita", "/sitemap.xml"],
  kegiatan: ["/", "/kegiatan", "/jadwal-ibadah", "/sitemap.xml"],
  khotbah: ["/", "/khotbah", "/live", "/sitemap.xml"],
  live: ["/", "/live"],
  departemen: ["/", "/pelayanan", "/sitemap.xml"],
  pengurus: ["/tentang"],
  galeri: ["/", "/galeri"],
  jadwal: ["/", "/jadwal-ibadah"],
  tampilan: ["/"],
  pengaturan: [
    "/",
    "/tentang",
    "/kontak",
    "/live",
    "/pengunjung-baru",
    "/sitemap.xml",
    "/robots.txt",
  ],
};

const DETAIL_BASE_PATH: Record<string, string> = {
  berita: "/berita",
  kegiatan: "/kegiatan",
  khotbah: "/khotbah",
  departemen: "/pelayanan",
};

function slugFrom(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const slug = (value as Record<string, unknown>).slug;
  return typeof slug === "string" ? slug.trim() : "";
}

export function publicPathsForAdminMutation(
  section: string,
  record?: unknown,
): string[] {
  const paths = new Set(PUBLIC_SECTION_PATHS[section] ?? []);
  const detailBase = DETAIL_BASE_PATH[section];
  const slug = slugFrom(record);

  if (detailBase && slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    paths.add(`${detailBase}/${slug}`);
  }

  return [...paths];
}
