import type { AuthorizedAdmin } from "@/lib/admin/auth";
import type { AdminResource } from "@/lib/admin/resources";

export type AdminResourceOperation = "read" | "create" | "update" | "delete";

export type ResourceScope =
  | { kind: "all" }
  | { kind: "owner"; column: "created_by" }
  | { kind: "ministry"; column: "id" | "ministry_id"; ministryIds: string[] };

export type ResourceCapabilities = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  scope: "all" | "owner" | "ministry";
};

const superAdminOnlySections = new Set(["pengaturan"]);

export function getResourceScope(
  section: string,
  auth: Pick<
    AuthorizedAdmin,
    "primaryRole" | "isSuperAdmin" | "ministryIds" | "user"
  >,
): ResourceScope {
  if (auth.isSuperAdmin || auth.primaryRole !== "department_admin") {
    return { kind: "all" };
  }

  if (section === "departemen") {
    return { kind: "ministry", column: "id", ministryIds: auth.ministryIds };
  }

  if (section === "kegiatan") {
    return {
      kind: "ministry",
      column: "ministry_id",
      ministryIds: auth.ministryIds,
    };
  }

  if (section === "galeri") {
    return { kind: "owner", column: "created_by" };
  }

  return { kind: "all" };
}

export function getResourceCapabilities(
  section: string,
  resource: Pick<AdminResource, "createEnabled" | "readOnly" | "softDelete">,
  auth: Pick<
    AuthorizedAdmin,
    "primaryRole" | "isSuperAdmin" | "ministryIds" | "user"
  >,
): ResourceCapabilities {
  const scope = getResourceScope(section, auth);
  const missingDepartmentAssignment =
    scope.kind === "ministry" && scope.ministryIds.length === 0;

  if (
    (superAdminOnlySections.has(section) && !auth.isSuperAdmin) ||
    missingDepartmentAssignment
  ) {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      scope: scope.kind,
    };
  }

  const mutable = resource.readOnly !== true;
  let canCreate = mutable && resource.createEnabled !== false;
  const canUpdate = mutable;
  let canDelete = mutable;

  if (auth.primaryRole === "department_admin" && !auth.isSuperAdmin) {
    if (section === "departemen") {
      canCreate = false;
      canDelete = false;
    }
  }

  return {
    canRead: true,
    canCreate,
    canUpdate,
    canDelete,
    scope: scope.kind,
  };
}

export function resourceOperationAllowed(
  operation: AdminResourceOperation,
  capabilities: ResourceCapabilities,
) {
  switch (operation) {
    case "read":
      return capabilities.canRead;
    case "create":
      return capabilities.canCreate;
    case "update":
      return capabilities.canUpdate;
    case "delete":
      return capabilities.canDelete;
  }
}

export function resourceOperationMessage(
  section: string,
  operation: AdminResourceOperation,
  auth: Pick<AuthorizedAdmin, "primaryRole" | "isSuperAdmin" | "ministryIds">,
  capabilities: ResourceCapabilities,
) {
  if (superAdminOnlySections.has(section) && !auth.isSuperAdmin) {
    return "Resource ini hanya dapat dikelola oleh Super Admin";
  }

  if (
    auth.primaryRole === "department_admin" &&
    capabilities.scope === "ministry" &&
    auth.ministryIds.length === 0
  ) {
    return "Akun Admin Departemen belum ditugaskan ke departemen";
  }

  if (
    auth.primaryRole === "department_admin" &&
    section === "departemen" &&
    operation === "create"
  ) {
    return "Admin Departemen hanya dapat mengelola departemen yang ditugaskan";
  }

  if (
    auth.primaryRole === "department_admin" &&
    section === "departemen" &&
    operation === "delete"
  ) {
    return "Penghapusan departemen hanya dapat dilakukan oleh Super Admin";
  }

  return "Anda tidak memiliki izin untuk tindakan ini";
}
export async function getDepartmentEventIds(
  auth: Pick<
    AuthorizedAdmin,
    "primaryRole" | "isSuperAdmin" | "ministryIds" | "supabase"
  >,
): Promise<string[] | null> {
  if (auth.isSuperAdmin || auth.primaryRole !== "department_admin") {
    return null;
  }

  if (auth.ministryIds.length === 0) {
    return [];
  }

  const { data, error } = await auth.supabase
    .from("events")
    .select("id")
    .in("ministry_id", auth.ministryIds)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((id): id is string => Boolean(id));
}
