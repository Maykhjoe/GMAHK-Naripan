import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSubmissionMode } from "@/lib/api/submission-mode";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

type PublicFormOptions = { turnstileAction: string };
export async function handlePublicForm(
  request: Request,
  schema: ZodType,
  table: string,
  transform: (data: unknown) => Record<string, unknown> = (data) => data as Record<string, unknown>,
  options: PublicFormOptions = { turnstileAction: "public_form" },
) {
  const ip = clientKey(request);
  const rate = checkRateLimit(`${table}:${ip}`, 5, 60_000);
  if (!rate.allowed) return NextResponse.json({ message: "Terlalu banyak permintaan. Silakan coba kembali beberapa saat lagi." }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Data tidak valid" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Periksa kembali data formulir", errors: parsed.error.flatten() }, { status: 422 });
  const token = typeof body === "object" && body !== null && "turnstileToken" in body ? String((body as { turnstileToken?: unknown }).turnstileToken ?? "") : "";
  const verification = await verifyTurnstile({
    token,
    remoteIp: ip === "local" ? undefined : ip,
    expectedAction: options.turnstileAction,
    expectedHostname: process.env.TURNSTILE_EXPECTED_HOSTNAME,
    allowTestingKeys: process.env.TURNSTILE_ALLOW_TEST_KEYS === "true",
  });
  if (!verification.success) {
    const unavailable = verification.reason === "misconfigured" || verification.reason === "unavailable";
    return NextResponse.json({ message: unavailable ? "Proteksi formulir belum tersedia. Silakan coba kembali nanti." : "Verifikasi keamanan gagal. Silakan muat ulang formulir." }, { status: unavailable ? 503 : 422 });
  }
  const supabase = createAdminClient();
  const mode = resolveSubmissionMode(Boolean(supabase));
  if (mode === "unavailable") return NextResponse.json({ message: "Layanan formulir belum terhubung ke database. Silakan coba kembali nanti." }, { status: 503 });
  if (supabase) {
    const { error } = await supabase.from(table).insert(transform(parsed.data));
    if (error) return NextResponse.json({ message: "Data belum dapat disimpan" }, { status: 500 });
  }
  return NextResponse.json({ success: true, mode }, { status: 201 });
}
