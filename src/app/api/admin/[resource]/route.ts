import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { prepareResourcePayload } from "@/lib/admin/resource-payload";
import { specialWorshipCategories } from "@/lib/constants/worship-schedules";
import {
  getAdminResource,
  parseResourcePayload,
} from "@/lib/admin/resources";

const createdByTables = new Set([
  "site_settings",
  "navigation_items",
  "service_schedules",
  "events",
  "sermons",
  "livestreams",
  "posts",
  "ministries",
  "leaders",
  "gallery_albums",
]);

const inboxSections = new Set([
  "permohonan-doa",
  "pengunjung",
  "pesan",
]);

async function createUniqueSlug(
  supabase: SupabaseClient,
  table: string,
  baseSlug: string,
) {
  const safeBase = baseSlug || `konten-${Date.now().toString(36)}`;

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const candidate = attempt === 1 ? safeBase : `${safeBase}-${attempt}`;
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("slug", candidate);

    if (error) {
      throw error;
    }

    if (!count) {
      return candidate;
    }
  }

  return `${safeBase}-${Date.now().toString(36)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource: section } = await params;
  const resource = getAdminResource(section);

  if (!resource) {
    return NextResponse.json(
      { message: "Resource tidak ditemukan" },
      { status: 404 },
    );
  }

  const auth = await requireAdminPermission(resource.permission);

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(url.searchParams.get("pageSize")) || 20),
  );
  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = auth.supabase
    .from(resource.table)
    .select("*", { count: "exact" });

  if (resource.softDelete) {
    query = query.is("deleted_at", null);
  }

  if (search) {
    query = query.ilike(
      resource.titleColumn,
      `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (section === "jadwal") {
    query = query.in("category", [...specialWorshipCategories]);
  }

  query = query
    .order(resource.dateColumn ?? "updated_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { message: "Data tidak dapat dimuat" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data,
    count: count ?? 0,
    page,
    pageSize,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json(
      { message: "Origin tidak valid" },
      { status: 403 },
    );
  }

  const { resource: section } = await params;
  const resource = getAdminResource(section);

  if (!resource) {
    return NextResponse.json(
      { message: "Resource tidak ditemukan" },
      { status: 404 },
    );
  }

  if (inboxSections.has(section)) {
    return NextResponse.json(
      { message: "Resource ini hanya menerima pembaruan status" },
      { status: 405 },
    );
  }

  const auth = await requireAdminPermission(resource.permission);

  if (isAuthorizationFailure(auth)) {
    return auth;
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
    section,
    body as Record<string, unknown>,
    false,
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

  const payload = prepareResourcePayload(
    section,
    resource,
    parsed.data as Record<string, unknown>,
    "create",
  );

  if (resource.slugSource && typeof payload.slug === "string") {
    try {
      payload.slug = await createUniqueSlug(
        auth.supabase,
        resource.table,
        payload.slug,
      );
    } catch {
      return NextResponse.json(
        { message: "Slug konten tidak dapat dibuat" },
        { status: 500 },
      );
    }
  }

  if (createdByTables.has(resource.table)) {
    payload.created_by = auth.user.id;
  }

  if (payload.status === "published" && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }

  const { data, error } = await auth.supabase
    .from(resource.table)
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { message: "Data tidak dapat dibuat" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
