import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireSuperAdmin,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { recordSecurityAudit } from "@/lib/admin/security-audit";
import { adminPasswordResetSchema } from "@/lib/admin/user-validation";
import { readJsonBody } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json(
      { message: "Origin tidak valid" },
      { status: 403 },
    );
  }

  const auth = await requireSuperAdmin();
  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json(
      { message: "ID pengguna tidak valid" },
      { status: 400 },
    );
  }

  const bodyResult = await readJsonBody(request, 8 * 1024);
  if (!bodyResult.success) {
    return NextResponse.json(
      { message: bodyResult.message },
      { status: bodyResult.status },
    );
  }

  const parsed = adminPasswordResetSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Kata sandi baru tidak valid",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { message: "Service role Supabase belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,username")
    .eq("id", id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { message: "Pengguna tidak ditemukan" },
      { status: 404 },
    );
  }

  const { error } = await admin.auth.admin.updateUserById(id, {
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json(
      { message: "Kata sandi pengguna tidak dapat direset" },
      { status: 500 },
    );
  }

  await recordSecurityAudit({
    actorId: auth.user.id,
    action: "admin_password_reset",
    entityType: "profiles",
    entityId: id,
    details: {
      targetUsername: profile.username,
      selfReset: id === auth.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
