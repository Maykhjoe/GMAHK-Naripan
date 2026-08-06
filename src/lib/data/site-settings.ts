import "server-only";

import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import {
  defaultSiteConfig,
  normalizeSiteConfig,
  type SiteConfig,
} from "@/lib/site/config";

export const SITE_CONFIG_KEY = "site_config";

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  const supabase = createPublicClient();

  if (!supabase) {
    return defaultSiteConfig;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", SITE_CONFIG_KEY)
    .eq("is_public", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Pengaturan website tidak dapat dimuat:", error.message);
    return defaultSiteConfig;
  }

  return normalizeSiteConfig(data?.value);
});
