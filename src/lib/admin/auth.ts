import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { recordSecurityAudit } from "@/lib/admin/security-audit";
import type { Permission } from "@/lib/permissions/rbac";
import { resolveHighestRole } from "@/lib/permissions/rbac";
import { adminRoleCodes, type AdminRole } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

export type AuthorizedAdmin = {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  user: User;
  roles: AdminRole[];
  primaryRole: AdminRole;
  isSuperAdmin: boolean;
  ministryIds: string[];
};

type AdminContextRow = {
  role_codes?: string[] | null;
  ministry_ids?: string[] | null;
  is_active?: boolean | null;
};

const knownRoles = new Set<string>(adminRoleCodes);

function isAdminRole(value: string): value is AdminRole {
  return knownRoles.has(value);
}

function firstContextRow(value: unknown): AdminContextRow | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as AdminContextRow) : null;
  }

  return value && typeof value === "object" ? (value as AdminContextRow) : null;
}

async function requireAdminSession(): Promise<AuthorizedAdmin | NextResponse> {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      { message: "Supabase belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: "Sesi admin tidak valid" },
      { status: 401 },
    );
  }

  const { data: contextData, error: contextError } = await supabase.rpc(
    "get_my_admin_context",
  );
  const context = firstContextRow(contextData);

  if (contextError || !context) {
    return NextResponse.json(
      { message: "Konteks akun admin tidak dapat diverifikasi" },
      { status: 403 },
    );
  }

  if (context.is_active !== true) {
    await recordSecurityAudit({
      actorId: user.id,
      action: "inactive_account_denied",
      entityType: "admin_session",
      details: { reason: "profile_inactive" },
    });

    return NextResponse.json(
      { message: "Akun admin tidak aktif" },
      { status: 403 },
    );
  }

  const roles = [...new Set(context.role_codes ?? [])].filter(isAdminRole);
  const primaryRole = resolveHighestRole(roles);

  if (!primaryRole) {
    return NextResponse.json(
      { message: "Akun tidak memiliki role admin aktif" },
      { status: 403 },
    );
  }

  const ministryIds = [
    ...new Set((context.ministry_ids ?? []).filter((value) => Boolean(value))),
  ];

  return {
    supabase,
    user,
    roles,
    primaryRole,
    isSuperAdmin: roles.includes("super_admin"),
    ministryIds,
  };
}

export async function requireAdminPermission(
  permission: Permission,
): Promise<AuthorizedAdmin | NextResponse> {
  const auth = await requireAdminSession();

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const { data: allowed, error } = await auth.supabase.rpc("has_permission", {
    permission_code: permission,
  });

  if (error || !allowed) {
    await recordSecurityAudit({
      actorId: auth.user.id,
      action: "permission_denied",
      entityType: "admin_permission",
      details: { permission },
    });

    return NextResponse.json(
      { message: "Anda tidak memiliki izin untuk tindakan ini" },
      { status: 403 },
    );
  }

  return auth;
}

export async function requireSuperAdmin(): Promise<
  AuthorizedAdmin | NextResponse
> {
  const auth = await requireAdminSession();

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  if (!auth.isSuperAdmin) {
    await recordSecurityAudit({
      actorId: auth.user.id,
      action: "super_admin_access_denied",
      entityType: "admin_permission",
      details: { requiredRole: "super_admin" },
    });

    return NextResponse.json(
      { message: "Tindakan ini hanya tersedia untuk Super Admin" },
      { status: 403 },
    );
  }

  return auth;
}

export function isAuthorizationFailure(
  value: AuthorizedAdmin | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}

export function validateMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (
    fetchSite &&
    !["same-origin", "same-site", "none"].includes(fetchSite.toLowerCase())
  ) {
    return false;
  }

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
