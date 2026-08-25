import { NextResponse } from "next/server";
import { z } from "zod";

import { validateMutationOrigin } from "@/lib/admin/auth";
import { clientKey } from "@/lib/rate-limit";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { normalizeEmail } from "@/lib/security/normalize";
import { readJsonBody } from "@/lib/security/request";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().email().max(254),
  token: z.string().regex(/^\d{6}$/, "Kode harus 6 digit"),
});

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  }

  const ip = clientKey(request);
  const limited = await enforceRateLimit({
    key: `auth-reset-otp:${ip}`,
    limit: 12,
    windowMs: 15 * 60_000,
    message: "Terlalu banyak percobaan kode. Silakan tunggu beberapa menit.",
  });
  if (limited) return limited;

  const bodyResult = await readJsonBody(request, 8 * 1024);
  if (!bodyResult.success) {
    return NextResponse.json(
      { message: bodyResult.message },
      { status: bodyResult.status },
    );
  }

  const parsed = schema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Email atau kode verifikasi tidak valid" },
      { status: 422 },
    );
  }

  const email = normalizeEmail(parsed.data.email) ?? "";
  const accountLimited = await enforceRateLimit({
    key: `auth-reset-otp-account:${ip}:${email}`,
    limit: 8,
    windowMs: 15 * 60_000,
    message: "Terlalu banyak percobaan untuk akun ini. Silakan tunggu.",
  });
  if (accountLimited) return accountLimited;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Layanan autentikasi belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data.token,
    type: "recovery",
  });

  if (error) {
    return NextResponse.json(
      { message: "Kode tidak valid atau sudah kedaluwarsa" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
