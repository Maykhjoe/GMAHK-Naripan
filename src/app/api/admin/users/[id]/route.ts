import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireSuperAdmin,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { recordSecurityAudit } from "@/lib/admin/security-audit";
import { adminUserUpdateSchema } from "@/lib/admin/user-validation";
import { resolveHighestRole } from "@/lib/permissions/rbac";
import { createAdminClient } from "@/lib/supabase/admin";

type CurrentProfile = {
  id: string;
  full_name: string | null;
  status: "active" | "inactive";
  user_roles: {
    ministry_id: string | null;
    roles: { code: string } | { code: string }[] | null;
  }[];
};

function firstAssignment(profile: CurrentProfile) {
  const roleCodes = profile.user_roles.flatMap((assignment) => {
    const relations = Array.isArray(assignment.roles)
      ? assignment.roles
      : assignment.roles
        ? [assignment.roles]
        : [];
    return relations.map((relation) => relation.code);
  });
  const role = resolveHighestRole(roleCodes) ?? undefined;
  const assignment = profile.user_roles.find((item) => {
    const relations = Array.isArray(item.roles)
      ? item.roles
      : item.roles
        ? [item.roles]
        : [];
    return relations.some((relation) => relation.code === role);
  });

  return {
    role,
    ministryId: assignment?.ministry_id ?? null,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json(
      { message: "ID pengguna tidak valid" },
      { status: 400 },
    );
  }

  const parsed = adminUserUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Perubahan tidak valid",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  if (
    id === auth.user.id &&
    (parsed.data.role ||
      parsed.data.ministryId !== undefined ||
      parsed.data.status === "inactive")
  ) {
    return NextResponse.json(
      { message: "Role atau status akun sendiri tidak dapat diubah" },
      { status: 409 },
    );
  }

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json(
      { message: "Service role Supabase belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const { data: currentData, error: currentError } = await admin
    .from("profiles")
    .select("id,full_name,status,user_roles(ministry_id,roles(code))")
    .eq("id", id)
    .maybeSingle();

  if (currentError || !currentData) {
    return NextResponse.json(
      { message: "Pengguna tidak ditemukan" },
      { status: 404 },
    );
  }

  const current = currentData as CurrentProfile;
  const oldAssignment = firstAssignment(current);
  const requestedRole = parsed.data.role ?? oldAssignment.role;
  const requestedMinistryId =
    requestedRole === "department_admin"
      ? (parsed.data.ministryId ?? oldAssignment.ministryId)
      : null;

  if (requestedRole === "department_admin" && !requestedMinistryId) {
    return NextResponse.json(
      { message: "Admin Departemen wajib ditugaskan ke satu departemen" },
      { status: 422 },
    );
  }

  const assignmentChanged = Boolean(
    requestedRole &&
      (requestedRole !== oldAssignment.role ||
        requestedMinistryId !== oldAssignment.ministryId),
  );

  if (parsed.data.fullName && parsed.data.fullName !== current.full_name) {
    const { error: profileNameError } = await admin
      .from("profiles")
      .update({ full_name: parsed.data.fullName })
      .eq("id", id);

    if (profileNameError) {
      return NextResponse.json(
        { message: "Nama pengguna tidak dapat diperbarui" },
        { status: 500 },
      );
    }

    const { error: metadataError } = await admin.auth.admin.updateUserById(id, {
      user_metadata: { full_name: parsed.data.fullName },
    });

    if (metadataError) {
      await admin
        .from("profiles")
        .update({ full_name: current.full_name })
        .eq("id", id);
      return NextResponse.json(
        { message: "Metadata nama pengguna tidak dapat diperbarui" },
        { status: 500 },
      );
    }
  }

  if (assignmentChanged && requestedRole) {
    const { error } = await admin.rpc("admin_set_user_role", {
      target_user_id: id,
      target_role_code: requestedRole,
      target_ministry_id: requestedMinistryId,
      actor_user_id: auth.user.id,
    });

    if (error) {
      return NextResponse.json(
        { message: "Role tidak dapat diperbarui" },
        { status: 409 },
      );
    }
  }

  const statusChanged = Boolean(
    parsed.data.status && parsed.data.status !== current.status,
  );

  if (statusChanged && parsed.data.status) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: parsed.data.status === "inactive" ? "876000h" : "none",
    });

    if (authError) {
      if (assignmentChanged && oldAssignment.role) {
        await admin.rpc("admin_set_user_role", {
          target_user_id: id,
          target_role_code: oldAssignment.role,
          target_ministry_id: oldAssignment.ministryId,
          actor_user_id: auth.user.id,
        });
      }

      return NextResponse.json(
        { message: "Status Auth pengguna tidak dapat diperbarui" },
        { status: 500 },
      );
    }

    const { error: profileStatusError } = await admin.rpc(
      "admin_set_profile_status",
      {
        target_user_id: id,
        target_status: parsed.data.status,
        actor_user_id: auth.user.id,
      },
    );

    if (profileStatusError) {
      await admin.auth.admin.updateUserById(id, {
        ban_duration: current.status === "inactive" ? "876000h" : "none",
      });

      if (assignmentChanged && oldAssignment.role) {
        await admin.rpc("admin_set_user_role", {
          target_user_id: id,
          target_role_code: oldAssignment.role,
          target_ministry_id: oldAssignment.ministryId,
          actor_user_id: auth.user.id,
        });
      }

      return NextResponse.json(
        { message: "Status profil pengguna tidak dapat diperbarui" },
        { status: 409 },
      );
    }
  }

  await recordSecurityAudit({
    actorId: auth.user.id,
    action: "admin_profile_updated",
    entityType: "profiles",
    entityId: id,
    details: {
      nameChanged: Boolean(
        parsed.data.fullName && parsed.data.fullName !== current.full_name,
      ),
      roleChanged: requestedRole !== oldAssignment.role,
      departmentAssignmentChanged:
        requestedMinistryId !== oldAssignment.ministryId,
      statusChanged,
    },
  });

  return NextResponse.json({ success: true });
}
