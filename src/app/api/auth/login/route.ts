import { NextResponse } from "next/server";

import { validateMutationOrigin } from "@/lib/admin/auth";
import { clientKey } from "@/lib/rate-limit";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { normalizeEmail } from "@/lib/security/normalize";
import { readJsonBody } from "@/lib/security/request";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/forms";

type AdminContextRow = {
  role_codes?: string[] | null;
  is_active?: boolean | null;
};

function firstContextRow(value: unknown): AdminContextRow | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object"
      ? (first as AdminContextRow)
      : null;
  }
  return value && typeof value === "object" ? (value as AdminContextRow) : null;
}

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  }

  const ip = clientKey(request);
  const ipLimited = await enforceRateLimit({
    key: `auth-login-ip:${ip}`,
    limit: 12,
    windowMs: 15 * 60_000,
    message: "Terlalu banyak percobaan masuk. Silakan tunggu sebelum mencoba lagi.",
  });
  if (ipLimited) return ipLimited;

  const bodyResult = await readJsonBody(request, 8 * 1024);
  if (!bodyResult.success) {
    return NextResponse.json(
      { message: bodyResult.message },
      { status: bodyResult.status },
    );
  }

  const parsed = loginSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Email atau kata sandi tidak valid" },
      { status: 422 },
    );
  }

  const email = normalizeEmail(parsed.data.email) ?? "";
  const accountLimited = await enforceRateLimit({
    key: `auth-login-account:${ip}:${email}`,
    limit: 5,
    windowMs: 15 * 60_000,
    message: "Terlalu banyak percobaan untuk akun ini. Silakan tunggu sebelum mencoba lagi.",
  });
  if (accountLimited) return accountLimited;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Layanan autentikasi belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json(
      { message: "Email atau kata sandi tidak valid" },
      { status: 401 },
    );
  }

  const { data: contextData, error: contextError } = await supabase.rpc(
    "get_my_admin_context",
  );
  const context = firstContextRow(contextData);
  const hasRole = (context?.role_codes?.length ?? 0) > 0;

  if (contextError || context?.is_active !== true || !hasRole) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { message: "Akun ini tidak memiliki akses admin aktif" },
      { status: 403 },
    );
  }

  return NextResponse.json({ success: true });
}
