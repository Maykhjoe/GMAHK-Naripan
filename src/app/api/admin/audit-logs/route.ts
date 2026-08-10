import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireSuperAdmin,
} from "@/lib/admin/auth";

function boundedInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function safeFilter(value: string | null, maxLength = 80) {
  return (value ?? "")
    .replace(/[^\p{L}\p{N}\s._:-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validIsoDate(value: string | null) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const url = new URL(request.url);
  const page = boundedInteger(url.searchParams.get("page"), 1, 100_000);
  const pageSize = boundedInteger(url.searchParams.get("pageSize"), 30, 100);
  const entityType = safeFilter(url.searchParams.get("entity"));
  const action = safeFilter(url.searchParams.get("action"));
  const search = safeFilter(url.searchParams.get("q"));
  const from = validIsoDate(url.searchParams.get("from"));
  const to = validIsoDate(url.searchParams.get("to"));
  const offset = (page - 1) * pageSize;

  let query = auth.supabase
    .from("audit_logs")
    .select(
      "id,actor_id,action,entity_type,entity_id,old_data,new_data,ip_address,user_agent,created_at,profiles!audit_logs_actor_id_fkey(full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (action) {
    query = query.eq("action", action);
  }

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      `action.ilike.${pattern},entity_type.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[admin:audit-logs] query failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { message: "Audit log tidak dapat dimuat" },
      { status: 500 },
    );
  }

  const total = count ?? 0;

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}
