import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireAdminPermission,
} from "@/lib/admin/auth";
import { getDepartmentEventIds } from "@/lib/admin/access-control";
import { getSubmissionConfig } from "@/lib/admin/submissions";

function escapedSearch(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  const config = getSubmissionConfig(kind);

  if (!config) {
    return NextResponse.json(
      { message: "Jenis formulir tidak ditemukan" },
      { status: 404 },
    );
  }

  const auth = await requireAdminPermission(config.permission);

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    50,
    Math.max(10, Number(url.searchParams.get("pageSize")) || 20),
  );

  if (
    config.kind === "registration" &&
    auth.primaryRole === "department_admin" &&
    !auth.isSuperAdmin &&
    auth.ministryIds.length === 0
  ) {
    return NextResponse.json(
      { message: "Akun Admin Departemen belum ditugaskan ke departemen" },
      { status: 403 },
    );
  }

  let departmentEventIds: string[] | null = null;

  if (config.kind === "registration") {
    try {
      departmentEventIds = await getDepartmentEventIds(auth);
    } catch {
      return NextResponse.json(
        { message: "Scope kegiatan departemen tidak dapat diverifikasi" },
        { status: 500 },
      );
    }

    if (departmentEventIds?.length === 0) {
      return NextResponse.json({ data: [], count: 0, page, pageSize });
    }
  }

  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const select =
    config.kind === "registration"
      ? "*,event:events(title,slug,starts_at)"
      : "*";

  let query = auth.supabase
    .from(config.table)
    .select(select, { count: "exact" });

  if (config.hasSoftDelete) {
    query = query.is("deleted_at", null);
  }

  if (departmentEventIds) {
    query = query.in("event_id", departmentEventIds);
  }

  if (search) {
    query = query.ilike(config.searchColumn, `%${escapedSearch(search)}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json(
      { message: "Data formulir tidak dapat dimuat" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
  });
}
