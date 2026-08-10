export type SecurityHeader = {
  key: string;
  value: string;
};

function compactPolicy(parts: string[]) {
  return parts.join("; ").replace(/\s{2,}/g, " ").trim();
}

export function buildContentSecurityPolicy(isDevelopment: boolean) {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://challenges.cloudflare.com",
  ];

  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://challenges.cloudflare.com",
    ...(isDevelopment ? ["ws:"] : []),
  ];

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://images.unsplash.com https://i.ytimg.com https://*.supabase.co",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com",
    "media-src 'self' blob: https://*.supabase.co",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests");
  }

  return compactPolicy(directives);
}

export function getSecurityHeaders(isDevelopment: boolean): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isDevelopment),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];

  if (!isDevelopment) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}
