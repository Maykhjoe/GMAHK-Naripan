import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireSuperAdmin,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { recordSecurityAudit } from "@/lib/admin/security-audit";
import { adminCreateUserSchema } from "@/lib/admin/user-validation";
import { resolveHighestRole } from "@/lib/permissions/rbac";
import { getAdminRoleLabel } from "@/lib/permissions/roles";
import { readJsonBody } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  status: string;
  user_roles: {
    ministry_id: string | null;
    roles:
      | { code: string; name: string }
      | { code: string; name: string }[]
      | null;
  }[];
};

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json(
      { message: "Service role Supabase belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = 25;
  const { data: authData, error } = await admin.auth.admin.listUsers({
    page,
    perPage,
  });

  if (error) {
    return NextResponse.json(
      { message: "Pengguna tidak dapat dimuat" },
      { status: 500 },
    );
  }

  const ids = authData.users.map((user) => user.id);
  const [profileResult, ministryResult] = await Promise.all([
    ids.length
      ? admin
          .from("profiles")
          .select(
            "id,username,full_name,status,user_roles(ministry_id,roles(code,name))",
          )
          .in("id", ids)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("ministries")
      .select("id,name")
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (profileResult.error || ministryResult.error) {
    return NextResponse.json(
      { message: "Profil, role, atau daftar departemen tidak dapat dimuat" },
      { status: 500 },
    );
  }

  const profiles = new Map(
    (((profileResult.data ?? []) as ProfileRow[])).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const users = authData.users.map((user) => {
    const profile = profiles.get(user.id);
    const assignments = profile?.user_roles ?? [];
    const roleCodes = assignments.flatMap((assignment) => {
      const relations = Array.isArray(assignment.roles)
        ? assignment.roles
        : assignment.roles
          ? [assignment.roles]
          : [];
      return relations.map((relation) => relation.code);
    });
    const role = resolveHighestRole(roleCodes);
    const roleAssignment = assignments.find((assignment) => {
      const relations = Array.isArray(assignment.roles)
        ? assignment.roles
        : assignment.roles
          ? [assignment.roles]
          : [];
      return relations.some((relation) => relation.code === role);
    });

    return {
      id: user.id,
      username: profile?.username ?? "",
      fullName:
        profile?.full_name ?? String(user.user_metadata?.full_name ?? ""),
      status: profile?.status ?? "active",
      role,
      roleName: role ? getAdminRoleLabel(role) : null,
      ministryId: roleAssignment?.ministry_id ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at,
      isCurrentUser: user.id === auth.user.id,
    };
  });

  return NextResponse.json({
    data: users,
    ministries: ministryResult.data ?? [],
    total: authData.total ?? users.length,
    page,
    perPage,
  });
}

export async function POST(request: Request) {
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

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json(
      { message: "Service role Supabase belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const bodyResult = await readJsonBody(request, 16 * 1024);
  if (!bodyResult.success) {
    return NextResponse.json(
      { message: bodyResult.message },
      { status: bodyResult.status },
    );
  }

  const parsed = adminCreateUserSchema.safeParse(bodyResult.data);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data pengguna tidak valid",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { data: usernameExists, error: usernameError } = await admin
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();

  if (usernameError) {
    return NextResponse.json(
      { message: "Username tidak dapat diperiksa" },
      { status: 500 },
    );
  }

  if (usernameExists) {
    return NextResponse.json(
      { message: "Username sudah digunakan" },
      { status: 409 },
    );
  }

  // Supabase Auth tetap digunakan sebagai mesin session/JWT/RLS. Email ini hanya
  // identifier internal Auth dan tidak pernah ditampilkan atau digunakan untuk email.
  const internalAuthEmail = `auth-${randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email: internalAuthEmail,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      username: parsed.data.username,
      auth_mode: "username_password",
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { message: "Akun tidak dapat dibuat. Periksa username dan kata sandi." },
      { status: 409 },
    );
  }

  const profileResult = await admin.from("profiles").upsert({
    id: data.user.id,
    username: parsed.data.username,
    full_name: parsed.data.fullName,
    status: "active",
  });

  if (profileResult.error) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json(
      { message: "Profil admin tidak dapat dibuat; akun dibatalkan." },
      { status: 500 },
    );
  }

  const roleResult = await admin.rpc("admin_set_user_role", {
    target_user_id: data.user.id,
    target_role_code: parsed.data.role,
    target_ministry_id:
      parsed.data.role === "department_admin" ? parsed.data.ministryId : null,
    actor_user_id: auth.user.id,
  });

  if (roleResult.error) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json(
      { message: "Role pengguna tidak dapat disimpan; akun dibatalkan." },
      { status: 500 },
    );
  }

  await recordSecurityAudit({
    actorId: auth.user.id,
    action: "admin_user_created",
    entityType: "profiles",
    entityId: data.user.id,
    details: {
      username: parsed.data.username,
      role: parsed.data.role,
      ministryAssigned: parsed.data.role === "department_admin",
    },
  });

  return NextResponse.json(
    {
      data: {
        id: data.user.id,
        username: parsed.data.username,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
        roleName: getAdminRoleLabel(parsed.data.role),
        ministryId:
          parsed.data.role === "department_admin"
            ? parsed.data.ministryId
            : null,
        status: "active",
        lastSignInAt: null,
        createdAt: data.user.created_at,
        isCurrentUser: false,
      },
    },
    { status: 201 },
  );
}
