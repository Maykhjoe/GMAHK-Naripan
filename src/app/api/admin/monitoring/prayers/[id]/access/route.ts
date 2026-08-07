import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";

const uuidSchema = z.uuid();
const accessSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Alasan minimal 10 karakter")
    .max(500, "Alasan maksimal 500 karakter"),
});

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

  const auth = await requireAdminPermission("monitoring.read");

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const { id } = await params;

  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json(
      { message: "ID permohonan tidak valid" },
      { status: 400 },
    );
  }

  const parsed = accessSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Alasan akses tidak valid",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { data, error } = await auth.supabase.rpc(
    "super_admin_open_prayer_request",
    {
      target_prayer_id: id,
      access_reason: parsed.data.reason,
    },
  );

  if (error) {
    console.error("[admin:monitoring:prayer-access] failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const status =
      error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 500;

    return NextResponse.json(
      {
        message:
          status === 403
            ? "Akses khusus hanya tersedia untuk Super Admin"
            : status === 404
              ? "Permohonan tidak ditemukan"
              : "Data sensitif tidak dapat dibuka",
      },
      { status },
    );
  }

  const record = Array.isArray(data) ? (data[0] ?? null) : data;

  if (!record) {
    return NextResponse.json(
      { message: "Permohonan tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: record,
    auditRecorded: true,
  });
}
