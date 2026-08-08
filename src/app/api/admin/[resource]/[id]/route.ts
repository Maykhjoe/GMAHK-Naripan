import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import {
  getResourceCapabilities,
  getResourceScope,
  resourceOperationMessage,
  type AdminResourceOperation,
} from "@/lib/admin/access-control";
import {
  getArticleWorkflowCapabilities,
  isArticleWorkflowStatus,
} from "@/lib/admin/article-workflow";
import { prepareResourcePayload } from "@/lib/admin/resource-payload";
import { recordSecurityAudit } from "@/lib/admin/security-audit";
import {
  getAdminResource,
  parseResourcePayload,
} from "@/lib/admin/resources";

const uuidSchema = z.uuid();

async function context(
  request: Request,
  params: Promise<{ resource: string; id: string }>,
  operation: AdminResourceOperation,
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

  const capabilities = getResourceCapabilities(section, resource, auth);
  const allowed =
    operation === "read"
      ? capabilities.canRead
      : operation === "create"
        ? capabilities.canCreate
        : operation === "update"
          ? capabilities.canUpdate
          : capabilities.canDelete;

  if (!allowed) {
    await recordSecurityAudit({
      actorId: auth.user.id,
      action: "access_denied",
      entityType: "admin_resource",
      entityId: id,
      details: { resource: section, operation },
    });

    return {
      response: NextResponse.json(
        { message: resourceOperationMessage(section, operation, auth, capabilities) },
        { status: 403 },
      ),
    };
  }

  return {
    section,
    id,
    resource,
    auth,
    capabilities,
    scope: getResourceScope(section, auth),
  };
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

  const capabilities = getResourceCapabilities(section, resource, auth);
  const scope = getResourceScope(section, auth);

  if (!capabilities.canRead) {
    await recordSecurityAudit({
      actorId: auth.user.id,
      action: "access_denied",
      entityType: "admin_resource",
      entityId: id,
      details: { resource: section, operation: "read" },
    });

    return NextResponse.json(
      { message: resourceOperationMessage(section, "read", auth, capabilities) },
      { status: 403 },
    );
  }

  let query = auth.supabase
    .from(resource.table)
    .select("*")
    .eq("id", id);

  if (resource.softDelete) {
    query = query.is("deleted_at", null);
  }

  if (scope.kind === "owner") {
    query = query.eq(scope.column, auth.user.id);
  } else if (scope.kind === "ministry") {
    query = query.in(scope.column, scope.ministryIds);
  }

  if (section === "berita") {
    const workflow = await getArticleWorkflowCapabilities(
      auth.supabase,
      auth.user.id,
    );

    if (!workflow.canEditAll && !workflow.canReview) {
      query = query.eq("created_by", auth.user.id);
    }
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
  const ctx = await context(request, params, "update");

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
    const selectColumns =
      ctx.section === "berita"
        ? "seo,created_by,status,review_submitted_at,reviewed_by,reviewed_at,review_notes,published_by,published_at"
        : "seo";

    let currentQuery = ctx.auth.supabase
      .from(ctx.resource.table)
      .select(selectColumns)
      .eq("id", ctx.id);

    if (ctx.resource.softDelete) {
      currentQuery = currentQuery.is("deleted_at", null);
    }

    if (ctx.scope.kind === "owner") {
      currentQuery = currentQuery.eq(ctx.scope.column, ctx.auth.user.id);
    } else if (ctx.scope.kind === "ministry") {
      currentQuery = currentQuery.in(ctx.scope.column, ctx.scope.ministryIds);
    }

    const { data: current, error: currentError } =
      await currentQuery.maybeSingle();

    if (currentError) {
      console.error(`[admin:${ctx.section}] current record failed`, {
        code: currentError.code,
        message: currentError.message,
      });

      return NextResponse.json(
        { message: "Data konten saat ini tidak dapat dimuat" },
        { status: 500 },
      );
    }

    if (!current) {
      return NextResponse.json(
        { message: "Data tidak ditemukan atau tidak dapat diakses" },
        { status: 404 },
      );
    }

    currentRecord = current as unknown as Record<string, unknown>;
  }

  const payload = prepareResourcePayload(
    ctx.section,
    ctx.resource,
    parsed.data as Record<string, unknown>,
    "update",
    currentRecord,
  );

  if (ctx.section === "berita") {
    const workflow = await getArticleWorkflowCapabilities(
      ctx.auth.supabase,
      ctx.auth.user.id,
    );
    const ownerId = String(currentRecord?.created_by ?? "");
    const isOwner = ownerId === ctx.auth.user.id;
    const currentStatus = currentRecord?.status;
    const requestedStatus = payload.status ?? currentStatus;

    if (!isOwner && !workflow.canEditAll) {
      return NextResponse.json(
        { message: "Anda hanya dapat mengubah artikel milik sendiri" },
        { status: 403 },
      );
    }

    if (currentStatus === "published" && !workflow.canEditAll) {
      return NextResponse.json(
        {
          message:
            "Artikel yang sudah dipublikasikan hanya dapat diubah oleh reviewer",
        },
        { status: 403 },
      );
    }

    if (!isArticleWorkflowStatus(requestedStatus)) {
      return NextResponse.json(
        { message: "Status artikel tidak valid" },
        { status: 422 },
      );
    }

    if (requestedStatus === "published" && !workflow.canPublish) {
      return NextResponse.json(
        { message: "Anda tidak memiliki izin untuk menerbitkan artikel" },
        { status: 403 },
      );
    }

    if (!workflow.canReview) {
      delete payload.review_notes;
    }

    const now = new Date().toISOString();
    payload.updated_by = ctx.auth.user.id;

    if (requestedStatus === "pending_review") {
      payload.status = "pending_review";
      payload.review_submitted_at = now;
      payload.reviewed_by = null;
      payload.reviewed_at = null;

      if (!workflow.canReview) {
        payload.review_notes = null;
      }
    }

    if (
      requestedStatus === "draft" &&
      currentStatus === "pending_review"
    ) {
      payload.status = "draft";

      if (workflow.canReview) {
        payload.reviewed_by = ctx.auth.user.id;
        payload.reviewed_at = now;
      } else {
        payload.review_submitted_at = null;
      }
    }

    if (
      requestedStatus === "published" &&
      currentStatus !== "published"
    ) {
      payload.status = "published";
      payload.published_by = ctx.auth.user.id;
      payload.published_at = now;

      if (workflow.canReview) {
        payload.reviewed_by = ctx.auth.user.id;
        payload.reviewed_at = now;
      }
    }
  } else {
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
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada perubahan" },
      { status: 400 },
    );
  }

  let updateQuery = ctx.auth.supabase
    .from(ctx.resource.table)
    .update(payload)
    .eq("id", ctx.id);

  if (ctx.scope.kind === "owner") {
    updateQuery = updateQuery.eq(ctx.scope.column, ctx.auth.user.id);
  } else if (ctx.scope.kind === "ministry") {
    updateQuery = updateQuery.in(ctx.scope.column, ctx.scope.ministryIds);
  }

  const { data, error } = await updateQuery.select().maybeSingle();

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

  if (!data) {
    return NextResponse.json(
      { message: "Data tidak ditemukan atau tidak dapat diakses" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const ctx = await context(request, params, "delete");

  if ("response" in ctx) {
    return ctx.response;
  }

  if (ctx.section === "berita") {
    const workflow = await getArticleWorkflowCapabilities(
      ctx.auth.supabase,
      ctx.auth.user.id,
    );
    let currentArticleQuery = ctx.auth.supabase
      .from("posts")
      .select("created_by,status")
      .eq("id", ctx.id)
      .is("deleted_at", null);

    if (ctx.scope.kind === "owner") {
      currentArticleQuery = currentArticleQuery.eq(
        ctx.scope.column,
        ctx.auth.user.id,
      );
    } else if (ctx.scope.kind === "ministry") {
      currentArticleQuery = currentArticleQuery.in(
        ctx.scope.column,
        ctx.scope.ministryIds,
      );
    }

    const { data: current, error: currentError } =
      await currentArticleQuery.maybeSingle();

    if (currentError) {
      return NextResponse.json(
        { message: "Artikel tidak dapat diperiksa" },
        { status: 500 },
      );
    }

    if (!current) {
      return NextResponse.json(
        { message: "Artikel tidak ditemukan" },
        { status: 404 },
      );
    }

    const isOwner = current.created_by === ctx.auth.user.id;

    if (!isOwner && !workflow.canEditAll) {
      return NextResponse.json(
        { message: "Anda hanya dapat mengarsipkan artikel milik sendiri" },
        { status: 403 },
      );
    }

    if (current.status === "published" && !workflow.canEditAll) {
      return NextResponse.json(
        { message: "Artikel terbit hanya dapat diarsipkan oleh reviewer" },
        { status: 403 },
      );
    }

    const { error } = await ctx.auth.supabase
      .from("posts")
      .update({
        status: "archived",
        updated_by: ctx.auth.user.id,
      })
      .eq("id", ctx.id);

    if (error) {
      return NextResponse.json(
        { message: "Artikel tidak dapat diarsipkan" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  }

  let operation = ctx.resource.softDelete
    ? ctx.auth.supabase
        .from(ctx.resource.table)
        .update({
          deleted_at: new Date().toISOString(),
          status: "inactive",
        })
        .eq("id", ctx.id)
    : ctx.auth.supabase.from(ctx.resource.table).delete().eq("id", ctx.id);

  if (ctx.scope.kind === "owner") {
    operation = operation.eq(ctx.scope.column, ctx.auth.user.id);
  } else if (ctx.scope.kind === "ministry") {
    operation = operation.in(ctx.scope.column, ctx.scope.ministryIds);
  }

  const { data, error } = await operation.select("id").maybeSingle();

  if (error) {
    return NextResponse.json(
      { message: "Data tidak dapat dihapus" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { message: "Data tidak ditemukan atau tidak dapat diakses" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
