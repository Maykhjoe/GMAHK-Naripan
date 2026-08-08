import { describe, expect, it } from "vitest";

import {
  getResourceCapabilities,
  getResourceScope,
  resourceOperationAllowed,
} from "./access-control";

const mutableResource = {
  createEnabled: true,
  readOnly: false,
  softDelete: true,
};

function auth(
  role:
    | "super_admin"
    | "pastor"
    | "church_chair"
    | "prayer_team"
    | "secretary"
    | "editor"
    | "media"
    | "department_admin",
  ministryIds: string[] = [],
) {
  return {
    primaryRole: role,
    isSuperAdmin: role === "super_admin",
    ministryIds,
    user: { id: "11111111-1111-4111-8111-111111111111" },
  } as never;
}

describe("admin resource access control", () => {
  it("mengunci pengaturan sistem kepada Super Admin", () => {
    const editorCapabilities = getResourceCapabilities(
      "pengaturan",
      mutableResource,
      auth("editor"),
    );
    const superCapabilities = getResourceCapabilities(
      "pengaturan",
      mutableResource,
      auth("super_admin"),
    );

    expect(editorCapabilities.canRead).toBe(false);
    expect(editorCapabilities.canUpdate).toBe(false);
    expect(superCapabilities.canRead).toBe(true);
    expect(superCapabilities.canUpdate).toBe(true);
  });

  it("membatasi Admin Departemen ke departemen yang ditugaskan", () => {
    const ministryId = "22222222-2222-4222-8222-222222222222";
    const scope = getResourceScope(
      "kegiatan",
      auth("department_admin", [ministryId]),
    );

    expect(scope).toEqual({
      kind: "ministry",
      column: "ministry_id",
      ministryIds: [ministryId],
    });
  });

  it("menolak modul departemen bila Admin Departemen belum ditugaskan", () => {
    const capabilities = getResourceCapabilities(
      "departemen",
      mutableResource,
      auth("department_admin"),
    );

    expect(capabilities.canRead).toBe(false);
    expect(capabilities.canCreate).toBe(false);
    expect(capabilities.canUpdate).toBe(false);
    expect(capabilities.canDelete).toBe(false);
  });

  it("mengizinkan edit departemen sendiri tetapi tidak membuat atau menghapus departemen", () => {
    const ministryId = "22222222-2222-4222-8222-222222222222";
    const capabilities = getResourceCapabilities(
      "departemen",
      mutableResource,
      auth("department_admin", [ministryId]),
    );

    expect(capabilities.canRead).toBe(true);
    expect(capabilities.canCreate).toBe(false);
    expect(capabilities.canUpdate).toBe(true);
    expect(capabilities.canDelete).toBe(false);
    expect(resourceOperationAllowed("update", capabilities)).toBe(true);
    expect(resourceOperationAllowed("delete", capabilities)).toBe(false);
  });

  it("membatasi album Admin Departemen berdasarkan pemilik", () => {
    expect(getResourceScope("galeri", auth("department_admin"))).toEqual({
      kind: "owner",
      column: "created_by",
    });
  });
});
