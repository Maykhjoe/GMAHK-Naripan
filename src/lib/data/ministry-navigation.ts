import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

export type MinistryNavigationItem = {
  label: string;
  href: string;
};

type MinistryNavigationRow = {
  slug: string;
  name: string;
};

/**
 * Sumber menu dropdown Pelayanan untuk navbar publik.
 *
 * Hanya membaca pelayanan yang benar-benar published dari Supabase.
 * Tidak memakai fallback hardcoded agar menu navbar selalu mencerminkan
 * data aktual yang dikelola melalui Admin -> Pelayanan.
 */
export async function getPublishedMinistryNavigation(): Promise<
  MinistryNavigationItem[]
> {
  const supabase = createPublicClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("ministries")
    .select("slug, name")
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error(
      "Gagal mengambil menu pelayanan untuk navbar:",
      error.message,
    );
    return [];
  }

  return ((data ?? []) as MinistryNavigationRow[])
    .filter((item) => item.slug?.trim() && item.name?.trim())
    .map((item) => ({
      label: item.name.trim(),
      href: `/pelayanan/${item.slug.trim()}`,
    }));
}
