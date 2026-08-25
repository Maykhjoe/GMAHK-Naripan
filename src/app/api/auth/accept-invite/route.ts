import { NextResponse } from "next/server";
import { z } from "zod";

import { validateMutationOrigin } from "@/lib/admin/auth";
import { clientKey } from "@/lib/rate-limit";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { normalizeEmail } from "@/lib/security/normalize";
import { readJsonBody } from "@/lib/security/request";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    email: z.string().trim().email().max(254),
    token: z.string().regex(/^\d{6}$/, "Kode harus 6 digit"),
    password: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Konfirmasi kata sandi tidak sama",
      });
    }
  });

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  }

  const ip = clientKey(request);
  const limited = await enforceRateLimit({
    key: `auth-accept-invite:${ip}`,
    limit: 12,
    windowMs: 15 * 60_000,
    message: "Terlalu banyak percobaan undangan. Silakan tunggu beberapa menit.",
  });
  if (limited) return limited;

  const bodyResult = await readJsonBody(request, 12 * 1024);
  if (!bodyResult.success) {
    return NextResponse.json(
      { message: bodyResult.message },
      { status: bodyResult.status },
    );
  }

  const parsed = schema.safeParse(bodyResult.data);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return NextResponse.json(
      { message: first || "Data undangan tidak valid" },
      { status: 422 },
    );
  }

  const email = normalizeEmail(parsed.data.email) ?? "";
  const accountLimited = await enforceRateLimit({
    key: `auth-accept-invite-account:${ip}:${email}`,
    limit: 8,
    windowMs: 15 * 60_000,
    message: "Terlalu banyak percobaan untuk undangan ini. Silakan tunggu.",
  });
  if (accountLimited) return accountLimited;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Layanan autentikasi belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data.token,
    type: "invite",
  });

  if (verifyError) {
    return NextResponse.json(
      { message: "Kode undangan tidak valid atau sudah kedaluwarsa" },
      { status: 400 },
    );
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (passwordError) {
    return NextResponse.json(
      { message: "Kata sandi belum dapat disimpan. Silakan coba lagi." },
      { status: 400 },
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
