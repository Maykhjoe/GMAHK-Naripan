import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireSuperAdmin,
} from "@/lib/admin/auth";
import {
  normalizeSecurityChecks,
  summarizeSecurityChecks,
  type SecurityCheck,
} from "@/lib/security/security-posture";
import { createAdminClient } from "@/lib/supabase/admin";

const deniedActions = [
  "permission_denied",
  "super_admin_access_denied",
  "inactive_account_denied",
  "upload_rejected",
  "rate_limit_exceeded",
];

function environmentChecks(): SecurityCheck[] {
  const isProduction = process.env.NODE_ENV === "production";
  const supabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const anonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const turnstileSite = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
  );
  const turnstileSecret = Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
  const expectedHostname = Boolean(
    process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim(),
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const siteUrlIsHttps = /^https:\/\//i.test(siteUrl);

  const checks: SecurityCheck[] = [
    {
      key: "env_supabase",
      category: "Environment",
      title: "Konfigurasi Supabase server",
      status: supabaseUrl && anonKey && serviceRole ? "pass" : "fail",
      issueCount: [supabaseUrl, anonKey, serviceRole].filter((value) => !value)
        .length,
      summary:
        supabaseUrl && anonKey && serviceRole
          ? "URL, anon key, dan service-role server terkonfigurasi."
          : "Ada konfigurasi Supabase yang belum tersedia pada runtime server.",
      remediation:
        supabaseUrl && anonKey && serviceRole
          ? null
          : "Lengkapi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY pada environment server. Jangan mengekspos service-role ke browser.",
    },
    {
      key: "env_turnstile",
      category: "Environment",
      title: "Proteksi Cloudflare Turnstile",
      status:
        turnstileSite && turnstileSecret
          ? isProduction && !expectedHostname
            ? "warning"
            : "pass"
          : "warning",
      issueCount:
        turnstileSite && turnstileSecret && (!isProduction || expectedHostname)
          ? 0
          : 1,
      summary:
        turnstileSite && turnstileSecret
          ? isProduction && !expectedHostname
            ? "Turnstile aktif, tetapi hostname production belum dikunci."
            : "Site key dan secret Turnstile tersedia pada runtime."
          : "Turnstile belum dikonfigurasi lengkap; form publik tetap memakai validasi dan rate limit, tetapi kehilangan lapisan anti-bot ini.",
      remediation:
        turnstileSite && turnstileSecret && (!isProduction || expectedHostname)
          ? null
          : isProduction
            ? "Konfigurasikan kedua key Turnstile dan TURNSTILE_EXPECTED_HOSTNAME sesuai domain production."
            : "Lengkapi key Turnstile sebelum deployment production.",
    },
    {
      key: "env_site_url",
      category: "Environment",
      title: "URL production dan HTTPS",
      status: isProduction ? (siteUrlIsHttps ? "pass" : "fail") : "info",
      issueCount: isProduction && !siteUrlIsHttps ? 1 : 0,
      summary: isProduction
        ? siteUrlIsHttps
          ? "NEXT_PUBLIC_SITE_URL menggunakan HTTPS."
          : "NEXT_PUBLIC_SITE_URL production belum menggunakan HTTPS."
        : "Pemeriksaan HTTPS akan menjadi wajib ketika NODE_ENV=production.",
      remediation:
        isProduction && !siteUrlIsHttps
          ? "Set NEXT_PUBLIC_SITE_URL ke URL https:// domain production."
          : null,
    },
  ];

  return checks;
}

export async function GET() {
  const auth = await requireSuperAdmin();

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { message: "Service role Supabase belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const snapshot = await admin.rpc("get_security_dashboard_checks");
  if (snapshot.error) {
    console.error("[admin:security] snapshot failed", {
      code: snapshot.error.code,
      message: snapshot.error.message,
    });
    return NextResponse.json(
      { message: "Pemeriksaan keamanan database tidak dapat dijalankan" },
      { status: 500 },
    );
  }

  const checks = [
    ...normalizeSecurityChecks(snapshot.data),
    ...environmentChecks(),
  ];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentResult = await admin
    .from("audit_logs")
    .select("id,action,entity_type,entity_id,created_at")
    .in("action", deniedActions)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: summarizeSecurityChecks(checks),
    checks,
    recentSecurityEvents: recentResult.error ? [] : (recentResult.data ?? []),
  });
}
