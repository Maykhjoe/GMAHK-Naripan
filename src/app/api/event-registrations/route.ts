import { NextResponse } from "next/server";
import { eventRegistrationSchema, type EventRegistrationInput } from "@/lib/validations/forms";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSubmissionMode } from "@/lib/api/submission-mode";

type RegistrationResult = { success: boolean; reason?: string; remaining?: number; registrationId?: string; eventTitle?: string };
const reasonMessages: Record<string, string> = {
  not_found: "Kegiatan tidak ditemukan.", closed: "Pendaftaran kegiatan belum dibuka atau sudah ditutup.", started: "Kegiatan sudah dimulai.", deadline: "Batas waktu pendaftaran sudah berakhir.", invalid_count: "Jumlah peserta tidak valid.", consent_required: "Persetujuan pemrosesan data wajib diberikan.", contact_required: "Isi WhatsApp atau email.", already_registered: "Kontak ini sudah terdaftar pada kegiatan tersebut.", capacity: "Kuota kegiatan tidak mencukupi.",
};

export async function POST(request: Request) {
  const ip = clientKey(request);
  if (!checkRateLimit(`event-registration:${ip}`, 3, 60_000).allowed) return NextResponse.json({ message: "Terlalu banyak percobaan pendaftaran. Silakan tunggu sebentar." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const parsed = eventRegistrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Periksa kembali data pendaftaran", errors: parsed.error.flatten() }, { status: 422 });
  const token = typeof body === "object" && body !== null && "turnstileToken" in body ? String((body as { turnstileToken?: unknown }).turnstileToken ?? "") : "";
  const verification = await verifyTurnstile({
    token,
    remoteIp: ip === "local" ? undefined : ip,
    expectedAction: "event_registration",
    expectedHostname: process.env.TURNSTILE_EXPECTED_HOSTNAME,
    allowTestingKeys: process.env.TURNSTILE_ALLOW_TEST_KEYS === "true",
  });
  if (!verification.success) {
    const unavailable = verification.reason === "misconfigured" || verification.reason === "unavailable";
    return NextResponse.json({ message: unavailable ? "Proteksi pendaftaran belum tersedia. Silakan coba kembali nanti." : "Verifikasi keamanan gagal. Silakan muat ulang formulir." }, { status: unavailable ? 503 : 422 });
  }
  const admin = createAdminClient();
  const mode = resolveSubmissionMode(Boolean(admin));
  if (mode === "unavailable") return NextResponse.json({ message: "Pendaftaran belum terhubung ke database." }, { status: 503 });
  if (!admin) return NextResponse.json({ success: true, mode: "demo", data: { eventTitle: parsed.data.eventSlug } }, { status: 201 });
  const data = parsed.data as EventRegistrationInput;
  const { data: rpcData, error } = await admin.rpc("register_for_event", { p_event_slug: data.eventSlug, p_name: data.name, p_whatsapp: data.whatsapp || "", p_email: data.email || "", p_people_count: data.peopleCount, p_notes: data.notes || "", p_consent: data.consent });
  if (error) return NextResponse.json({ message: "Pendaftaran belum dapat diproses." }, { status: 500 });
  const result = rpcData as RegistrationResult;
  if (!result?.success) return NextResponse.json({ message: reasonMessages[result?.reason ?? ""] ?? "Pendaftaran ditolak.", reason: result?.reason, remaining: result?.remaining }, { status: result?.reason === "not_found" ? 404 : 409 });
  return NextResponse.json({ success: true, mode: "supabase", data: { registrationId: result.registrationId, eventTitle: result.eventTitle } }, { status: 201 });
}
