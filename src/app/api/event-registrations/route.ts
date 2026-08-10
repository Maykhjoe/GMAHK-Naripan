import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSubmissionMode } from "@/lib/api/submission-mode";
import { clientKey, rateLimitFingerprint } from "@/lib/rate-limit";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import {
  normalizeEmail,
  normalizePhone,
  normalizePlainText,
} from "@/lib/security/normalize";
import { readJsonBody } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import {
  eventRegistrationSchema,
  type EventRegistrationInput,
} from "@/lib/validations/forms";

type RegistrationResult = {
  success: boolean;
  reason?: string;
  remaining?: number;
  registrationId?: string;
  eventTitle?: string;
};

const reasonMessages: Record<string, string> = {
  not_found: "Kegiatan tidak ditemukan.",
  closed: "Pendaftaran kegiatan belum dibuka atau sudah ditutup.",
  started: "Kegiatan sudah dimulai.",
  deadline: "Batas waktu pendaftaran sudah berakhir.",
  invalid_count: "Jumlah peserta tidak valid.",
  consent_required: "Persetujuan pemrosesan data wajib diberikan.",
  contact_required: "Isi WhatsApp atau email.",
  already_registered: "Kontak ini sudah terdaftar pada kegiatan tersebut.",
  capacity: "Kuota kegiatan tidak mencukupi.",
};

export async function POST(request: Request) {
  const ip = clientKey(request);
  const limited = await enforceRateLimit({
    key: `event-registration:${ip}`,
    limit: 3,
    windowMs: 5 * 60_000,
    message: "Terlalu banyak percobaan pendaftaran. Silakan tunggu sebentar.",
  });
  if (limited) return limited;

  const bodyResult = await readJsonBody(request, 24 * 1024);
  if (!bodyResult.success) {
    return NextResponse.json(
      { message: bodyResult.message },
      { status: bodyResult.status },
    );
  }

  const parsed = eventRegistrationSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Periksa kembali data pendaftaran",
        errors: parsed.error.flatten(),
      },
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
    expectedAction: "event_registration",
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
          ? "Proteksi pendaftaran belum tersedia. Silakan coba kembali nanti."
          : "Verifikasi keamanan gagal. Silakan muat ulang formulir.",
      },
      { status: unavailable ? 503 : 422 },
    );
  }

  const duplicate = await enforceRateLimit({
    key: `event-registration-duplicate:${ip}:${rateLimitFingerprint(parsed.data)}`,
    limit: 1,
    windowMs: 30_000,
    message: "Pendaftaran yang sama baru saja dikirim. Silakan tunggu sebentar.",
  });
  if (duplicate) return duplicate;

  const admin = createAdminClient();
  const mode = resolveSubmissionMode(Boolean(admin));
  if (mode === "unavailable") {
    return NextResponse.json(
      { message: "Pendaftaran belum terhubung ke database." },
      { status: 503 },
    );
  }

  if (!admin) {
    return NextResponse.json(
      {
        success: true,
        mode: "demo",
        data: { eventTitle: parsed.data.eventSlug },
      },
      { status: 201 },
    );
  }

  const data = parsed.data as EventRegistrationInput;
  const { data: rpcData, error } = await admin.rpc("register_for_event", {
    p_event_slug: data.eventSlug,
    p_name: normalizePlainText(data.name) ?? "",
    p_whatsapp: normalizePhone(data.whatsapp) ?? "",
    p_email: normalizeEmail(data.email) ?? "",
    p_people_count: data.peopleCount,
    p_notes: normalizePlainText(data.notes) ?? "",
    p_consent: data.consent,
  });

  if (error) {
    console.error("[event-registration] registration RPC failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { message: "Pendaftaran belum dapat diproses." },
      { status: 500 },
    );
  }

  const result = rpcData as RegistrationResult;
  if (!result?.success) {
    return NextResponse.json(
      {
        message:
          reasonMessages[result?.reason ?? ""] ?? "Pendaftaran ditolak.",
        reason: result?.reason,
        remaining: result?.remaining,
      },
      { status: result?.reason === "not_found" ? 404 : 409 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      mode: "supabase",
      data: {
        registrationId: result.registrationId,
        eventTitle: result.eventTitle,
      },
    },
    { status: 201 },
  );
}
