import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { getSubmissionConfig } from "@/lib/admin/submissions";

const uuidSchema = z.uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  const config = getSubmissionConfig(kind);

  if (!config) {
    return NextResponse.json(
      { message: "Jenis formulir tidak ditemukan" },
      { status: 404 },
    );
  }

  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json(
      { message: "ID formulir tidak valid" },
      { status: 400 },
    );
  }

  const auth = await requireAdminPermission(config.permission);

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const select =
    config.kind === "registration"
      ? "*,event:events(title,slug,starts_at)"
      : "*";

  let query = auth.supabase
    .from(config.table)
    .select(select)
    .eq("id", id);

  if (config.hasSoftDelete) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(`[admin:submissions:${kind}] detail failed`, {
      table: config.table,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      { message: "Detail formulir tidak dapat dimuat" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { message: "Data tidak ditemukan atau tidak dapat diakses" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json(
      { message: "Origin tidak valid" },
      { status: 403 },
    );
  }

  const { kind, id } = await params;
  const config = getSubmissionConfig(kind);

  if (!config) {
    return NextResponse.json(
      { message: "Jenis formulir tidak ditemukan" },
      { status: 404 },
    );
  }

  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json(
      { message: "ID formulir tidak valid" },
      { status: 400 },
    );
  }

  const auth = await requireAdminPermission(config.permission);

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const allowedStatuses = config.statusOptions.map((item) => item.value);
  const schema = z
    .object({
      status: z.enum(allowedStatuses as [string, ...string[]]).optional(),
      internalNotes: z.string().trim().max(2000).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan");

  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Perubahan tidak valid",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const payload: Record<string, unknown> = {};

  if (parsed.data.status) {
    payload.status = parsed.data.status;
  }

  if (parsed.data.internalNotes !== undefined) {
    payload.internal_notes = parsed.data.internalNotes || null;
  }

  const { data, error } = await auth.supabase
    .from(config.table)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { message: "Data tidak dapat diperbarui" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}
