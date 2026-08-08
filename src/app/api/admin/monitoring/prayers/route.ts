import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireSuperAdmin,
} from "@/lib/admin/auth";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(50).default(20),
  scope: z.enum(["prayer_team", "pastor"]).optional(),
  status: z
    .enum(["unread", "in_prayer", "follow_up", "archived"])
    .optional(),
});

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    scope: url.searchParams.get("scope") || undefined,
    status: url.searchParams.get("status") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Filter monitoring tidak valid",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { page, pageSize, scope, status } = parsed.data;
  const [summaryResult, rowsResult] = await Promise.all([
    auth.supabase.rpc("get_prayer_service_monitoring"),
    auth.supabase.rpc("list_prayer_service_monitoring", {
      limit_rows: pageSize,
      offset_rows: (page - 1) * pageSize,
      filter_scope: scope ?? null,
      filter_status: status ?? null,
    }),
  ]);

  if (summaryResult.error || rowsResult.error) {
    const error = summaryResult.error ?? rowsResult.error;
    console.error("[admin:monitoring:prayers] failed", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });

    return NextResponse.json(
      {
        message:
          error?.code === "42501"
            ? "Monitoring hanya dapat dibuka oleh Super Admin"
            : "Data monitoring tidak dapat dimuat",
      },
      { status: error?.code === "42501" ? 403 : 500 },
    );
  }

  const summary = Array.isArray(summaryResult.data)
    ? (summaryResult.data[0] ?? null)
    : summaryResult.data;
  const rows = Array.isArray(rowsResult.data) ? rowsResult.data : [];
  const count = Number(rows[0]?.filtered_count ?? 0);

  return NextResponse.json({
    summary,
    data: rows,
    count,
    page,
    pageSize,
  });
}
