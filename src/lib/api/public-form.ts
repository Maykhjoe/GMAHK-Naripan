import "server-only";

import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { readJsonBody } from "@/lib/security/request";
import { rateLimitFingerprint, clientKey } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSubmissionMode } from "@/lib/api/submission-mode";

type PublicFormOptions = {
  turnstileAction: string;
  limit?: number;
  windowMs?: number;
  maxBodyBytes?: number;
};

export async function handlePublicForm(
  request: Request,
  schema: ZodType,
  table: string,
  transform: (data: unknown) => Record<string, unknown> = (data) =>
    data as Record<string, unknown>,
  options: PublicFormOptions = { turnstileAction: "public_form" },
) {
  const ip = clientKey(request);
  const limited = await enforceRateLimit({
    key: `public-form:${table}:${ip}`,
    limit: options.limit ?? 5,
    windowMs: options.windowMs ?? 10 * 60_000,
    message: "Terlalu banyak pengiriman formulir. Silakan coba kembali nanti.",
  });
  if (limited) return limited;

  const bodyResult = await readJsonBody(request, options.maxBodyBytes ?? 32 * 1024);
  if (!bodyResult.success) {
    return NextResponse.json(
      { message: bodyResult.message },
      { status: bodyResult.status },
    );
  }

  const parsed = schema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Periksa kembali data formulir", errors: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const token =
    typeof bodyResult.data === "object" &&
    bodyResult.data !== null &&
    "turnstileToken" in bodyResult.data
      ? String(
          (bodyResult.data as { turnstileToken?: unknown }).turnstileToken ?? "",
        )
      : "";

  const verification = await verifyTurnstile({
    token,
    remoteIp: ip === "local" ? undefined : ip,
    expectedAction: options.turnstileAction,
    expectedHostname: process.env.TURNSTILE_EXPECTED_HOSTNAME,
    allowTestingKeys: process.env.TURNSTILE_ALLOW_TEST_KEYS === "true",
  });

  if (!verification.success) {
    const unavailable =
      verification.reason === "misconfigured" ||
      verification.reason === "unavailable";
    return NextResponse.json(
      {
        message: unavailable
          ? "Proteksi formulir belum tersedia. Silakan coba kembali nanti."
          : "Verifikasi keamanan gagal. Silakan muat ulang formulir.",
      },
      { status: unavailable ? 503 : 422 },
    );
  }

  // Short duplicate window protects double-click/retry storms without storing
  // the submitted text itself. Only a SHA-256 fingerprint is used as the key.
  const duplicate = await enforceRateLimit({
    key: `public-form-duplicate:${table}:${ip}:${rateLimitFingerprint(parsed.data)}`,
    limit: 1,
    windowMs: 30_000,
    message: "Formulir yang sama baru saja dikirim. Silakan tunggu sebentar.",
  });
  if (duplicate) return duplicate;

  const supabase = createAdminClient();
  const mode = resolveSubmissionMode(Boolean(supabase));
  if (mode === "unavailable") {
    return NextResponse.json(
      { message: "Layanan formulir belum terhubung ke database. Silakan coba kembali nanti." },
      { status: 503 },
    );
  }

  if (supabase) {
    const { error } = await supabase.from(table).insert(transform(parsed.data));
    if (error) {
      console.error("[public-form] insert failed", {
        table,
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        { message: "Data belum dapat disimpan" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true, mode }, { status: 201 });
}
