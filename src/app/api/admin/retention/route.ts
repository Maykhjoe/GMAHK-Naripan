import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireSuperAdmin,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { recordSecurityAudit } from "@/lib/admin/security-audit";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

type RetentionResult = Record<string, string | number | boolean | null>;

function asRetentionResult(value: unknown): RetentionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: RetentionResult = {};
  for (const [key, raw] of Object.entries(value)) {
    if (
      raw === null ||
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      result[key.slice(0, 80)] = raw;
    }
  }
  return result;
}

export async function GET() {
  const auth = await requireSuperAdmin();

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { message: "Konfigurasi server Supabase belum lengkap" },
      { status: 503 },
    );
  }

  const { data, error } = await admin
    .from("data_retention_policies")
    .select("entity_type,retention_days,strategy,enabled,description")
    .order("entity_type", { ascending: true });

  if (error) {
    return NextResponse.json(
      { message: "Kebijakan retensi tidak dapat dimuat" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json(
      { message: "Origin permintaan tidak diizinkan" },
      { status: 403 },
    );
  }

  const auth = await requireSuperAdmin();
  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const limited = await enforceRateLimit({
    key: `admin:retention:${auth.user.id}`,
    limit: 2,
    windowMs: 60 * 60 * 1000,
    message: "Retensi data hanya dapat dijalankan dua kali per jam.",
  });

  if (limited) {
    return limited;
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { message: "Konfigurasi server Supabase belum lengkap" },
      { status: 503 },
    );
  }

  const { data, error } = await admin.rpc("run_data_retention");

  if (error) {
    console.error("[admin:retention] execution failed", {
      code: error.code,
      message: error.message,
    });

    await recordSecurityAudit({
      actorId: auth.user.id,
      action: "retention_run_failed",
      entityType: "data_retention",
      details: { code: error.code ?? "unknown" },
      request,
    });

    return NextResponse.json(
      { message: "Proses retensi data gagal dijalankan" },
      { status: 500 },
    );
  }

  const summary = asRetentionResult(data);

  await recordSecurityAudit({
    actorId: auth.user.id,
    action: "retention_run",
    entityType: "data_retention",
    details: summary,
    request,
  });

  return NextResponse.json({
    message: "Retensi data selesai dijalankan",
    data: summary,
  });
}
