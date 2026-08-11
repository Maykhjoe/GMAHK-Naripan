export type ReadinessLevel = "pass" | "warning" | "fail";

export type ReadinessCheck = {
  id: string;
  label: string;
  level: ReadinessLevel;
  message: string;
};

export type ProductionReadiness = {
  ready: boolean;
  checks: ReadinessCheck[];
};

type Environment = Record<string, string | undefined>;

function present(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  return Boolean(
    normalized &&
      !normalized.includes("YOUR_") &&
      !normalized.includes("CHANGE_ME") &&
      !normalized.includes("placeholder"),
  );
}

function parseUrl(value: string | undefined) {
  if (!present(value)) return null;

  try {
    return new URL(value!);
  } catch {
    return null;
  }
}

export function checkProductionReadiness(
  env: Environment,
  strictProduction = true,
): ProductionReadiness {
  const checks: ReadinessCheck[] = [];
  const siteUrl = parseUrl(env.NEXT_PUBLIC_SITE_URL);
  const supabaseUrl = parseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const expectedHostname = env.TURNSTILE_EXPECTED_HOSTNAME?.trim() ?? "";

  checks.push({
    id: "site-url",
    label: "Canonical site URL",
    level:
      siteUrl && (!strictProduction || siteUrl.protocol === "https:")
        ? "pass"
        : "fail",
    message: siteUrl
      ? strictProduction && siteUrl.protocol !== "https:"
        ? "NEXT_PUBLIC_SITE_URL production harus menggunakan HTTPS."
        : "Canonical URL valid."
      : "NEXT_PUBLIC_SITE_URL belum valid.",
  });

  checks.push({
    id: "supabase-public",
    label: "Supabase public client",
    level:
      supabaseUrl &&
      (!strictProduction || supabaseUrl.protocol === "https:") &&
      present(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        ? "pass"
        : "fail",
    message:
      supabaseUrl &&
      (!strictProduction || supabaseUrl.protocol === "https:") &&
      present(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        ? "Supabase URL dan anon key tersedia."
        : "Supabase URL/anon key belum valid atau production belum menggunakan HTTPS.",
  });

  checks.push({
    id: "supabase-service-role",
    label: "Supabase server credential",
    level: present(env.SUPABASE_SERVICE_ROLE_KEY) ? "pass" : "fail",
    message: present(env.SUPABASE_SERVICE_ROLE_KEY)
      ? "Service role tersedia hanya untuk proses server."
      : "SUPABASE_SERVICE_ROLE_KEY belum tersedia.",
  });

  const turnstileConfigured =
    present(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) &&
    present(env.TURNSTILE_SECRET_KEY);
  checks.push({
    id: "turnstile",
    label: "Cloudflare Turnstile",
    level: turnstileConfigured ? "pass" : strictProduction ? "fail" : "warning",
    message: turnstileConfigured
      ? "Site key dan secret Turnstile tersedia."
      : "Turnstile belum dikonfigurasi lengkap.",
  });

  const hostnameMatches =
    Boolean(siteUrl && expectedHostname) &&
    siteUrl!.hostname.toLowerCase() === expectedHostname.toLowerCase();
  checks.push({
    id: "turnstile-hostname",
    label: "Turnstile production hostname",
    level: hostnameMatches ? "pass" : strictProduction ? "fail" : "warning",
    message: hostnameMatches
      ? "Hostname Turnstile sesuai canonical URL."
      : "TURNSTILE_EXPECTED_HOSTNAME harus sama dengan hostname website production.",
  });

  const localhost = siteUrl
    ? ["localhost", "127.0.0.1", "0.0.0.0"].includes(siteUrl.hostname)
    : false;
  checks.push({
    id: "public-hostname",
    label: "Production hostname",
    level: strictProduction && localhost ? "fail" : "pass",
    message:
      strictProduction && localhost
        ? "Canonical URL production masih menunjuk ke localhost."
        : "Hostname tidak menggunakan alamat development lokal.",
  });

  const leakedServerSecret = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_TURNSTILE_SECRET_KEY",
    "NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN",
  ].some((key) => present(env[key]));
  checks.push({
    id: "public-secret-names",
    label: "Secret tidak memakai NEXT_PUBLIC_",
    level: leakedServerSecret ? "fail" : "pass",
    message: leakedServerSecret
      ? "Ditemukan nama environment public untuk secret server."
      : "Tidak ada secret server pada nama environment NEXT_PUBLIC_ yang dikenal.",
  });

  return {
    ready: checks.every((check) => check.level !== "fail"),
    checks,
  };
}
