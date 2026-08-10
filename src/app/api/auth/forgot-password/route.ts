import { NextResponse } from "next/server";

import { validateMutationOrigin } from "@/lib/admin/auth";
import { clientKey } from "@/lib/rate-limit";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { normalizeEmail } from "@/lib/security/normalize";
import { readJsonBody } from "@/lib/security/request";
import { createClient } from "@/lib/supabase/server";
import { passwordResetRequestSchema } from "@/lib/validations/forms";

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  }

  const ip = clientKey(request);
  const limited = await enforceRateLimit({
    key: `auth-forgot-password:${ip}`,
    limit: 4,
    windowMs: 30 * 60_000,
    message: "Terlalu banyak permintaan pemulihan. Silakan coba lagi nanti.",
  });
  if (limited) return limited;

  const bodyResult = await readJsonBody(request, 8 * 1024);
  if (!bodyResult.success) {
    return NextResponse.json(
      { message: bodyResult.message },
      { status: bodyResult.status },
    );
  }

  const parsed = passwordResetRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Alamat email tidak valid" },
      { status: 422 },
    );
  }

  const email = normalizeEmail(parsed.data.email) ?? "";
  const accountLimited = await enforceRateLimit({
    key: `auth-forgot-password-account:${ip}:${email}`,
    limit: 2,
    windowMs: 30 * 60_000,
    message: "Permintaan untuk email ini baru saja diproses. Silakan tunggu.",
  });
  if (accountLimited) return accountLimited;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Layanan autentikasi belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
  const redirectTo = new URL(
    "/auth/callback?next=/auth/reset-password",
    baseUrl,
  ).toString();

  // Keep the public response generic to avoid revealing whether an email is a
  // registered admin account.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  return NextResponse.json({ success: true });
}
