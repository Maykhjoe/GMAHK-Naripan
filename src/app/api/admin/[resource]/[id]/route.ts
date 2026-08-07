import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { prepareResourcePayload } from "@/lib/admin/resource-payload";
import {
  getAdminResource,
  parseResourcePayload,
} from "@/lib/admin/resources";

const uuidSchema = z.uuid();

async function context(
  request: Request,
  params: Promise<{ resource: string; id: string }>,
) {
  const { resource: section, id } = await params;
  const resource = getAdminResource(section);

  if (!resource) {
    return {
      response: NextResponse.json(
        { message: "Resource tidak ditemukan" },
        { status: 404 },
      ),
    };
  }

  if (!uuidSchema.safeParse(id).success) {
    return {
      response: NextResponse.json(
        { message: "ID tidak valid" },
        { status: 400 },
      ),
    };
  }

  if (!validateMutationOrigin(request)) {
    return {
      response: NextResponse.json(
        { message: "Origin tidak valid" },
        { status: 403 },
      ),
    };
  }

  const auth = await requireAdminPermission(resource.permission);

  if (isAuthorizationFailure(auth)) {
    return { response: auth };
  }

  return { section, id, resource, auth };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource: section, id } = await params;
  const resource = getAdminResource(section);

  if (!resource) {
    return NextResponse.json(
      { message: "Resource tidak ditemukan" },
      { status: 404 },
    );
  }

  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json(
      { message: "ID tidak valid" },
      { status: 400 },
    );
  }

  const auth = await requireAdminPermission(resource.permission);

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  let query = auth.supabase
    .from(resource.table)
    .select("*")
    .eq("id", id);

  if (resource.softDelete) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(`[admin:${section}] detail failed`, {
      table: resource.table,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      { message: "Detail data tidak dapat dimuat" },
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
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const ctx = await context(request, params);

  if ("response" in ctx) {
    return ctx.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON tidak valid" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Payload tidak valid" },
      { status: 400 },
    );
  }

  const parsed = parseResourcePayload(
    ctx.section,
    body as Record<string, unknown>,
    true,
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Validasi gagal",
        errors:
          typeof parsed.error === "string"
            ? { _root: [parsed.error] }
            : parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  let currentRecord: Record<string, unknown> | undefined;

  if (
    ctx.section === "berita" ||
    ctx.section === "kegiatan" ||
    ctx.section === "khotbah" ||
    ctx.section === "departemen"
  ) {
    const { data: current, error: currentError } = await ctx.auth.supabase
      .from(ctx.resource.table)
      .select("seo")
      .eq("id", ctx.id)
      .single();

    if (currentError) {
      return NextResponse.json(
        { message: "Data konten saat ini tidak dapat dimuat" },
        { status: 500 },
      );
    }

    currentRecord = current as Record<string, unknown>;
  }

  const payload = prepareResourcePayload(
    ctx.section,
    ctx.resource,
    parsed.data as Record<string, unknown>,
    "update",
    currentRecord,
  );

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada perubahan" },
      { status: 400 },
    );
  }

  const supportsPublishedAt = ctx.resource.fields.some(
    (field) => field.key === "published_at",
  );

  if (
    supportsPublishedAt &&
    payload.status === "published" &&
    !payload.published_at
  ) {
    payload.published_at = new Date().toISOString();
  }

  const { data, error } = await ctx.auth.supabase
    .from(ctx.resource.table)
    .update(payload)
    .eq("id", ctx.id)
    .select()
    .single();

  if (error) {
    console.error(`[admin:${ctx.section}] update failed`, {
      table: ctx.resource.table,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      { message: "Data tidak dapat diperbarui" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const ctx = await context(request, params);

  if ("response" in ctx) {
    return ctx.response;
  }

  const operation = ctx.resource.softDelete
    ? ctx.auth.supabase
        .from(ctx.resource.table)
        .update({
          deleted_at: new Date().toISOString(),
          status: "inactive",
        })
        .eq("id", ctx.id)
    : ctx.auth.supabase
        .from(ctx.resource.table)
        .delete()
        .eq("id", ctx.id);

  const { error } = await operation;

  if (error) {
    return NextResponse.json(
      { message: "Data tidak dapat dihapus" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
