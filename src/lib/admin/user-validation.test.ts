import { describe, expect, it } from "vitest";

import { adminInviteSchema, adminUserUpdateSchema } from "./user-validation";

describe("admin user validation", () => {
  it("accepts every final role", () => {
    const roles = [
      "super_admin",
      "pastor",
      "church_chair",
      "prayer_team",
      "secretary",
      "editor",
      "media",
      "department_admin",
    ];

    for (const role of roles) {
      expect(
        adminInviteSchema.safeParse({
          email: `${role}@example.com`,
          fullName: "Admin Naripan",
          role,
        }).success,
      ).toBe(true);
    }
  });

  it("rejects unknown and legacy roles", () => {
    for (const role of ["owner", "pastoral", "secretariat", "media_team"]) {
      expect(
        adminInviteSchema.safeParse({
          email: "admin@example.com",
          fullName: "Admin Naripan",
          role,
        }).success,
      ).toBe(false);
    }
  });

  it("only accepts explicit user status values", () => {
    expect(
      adminUserUpdateSchema.safeParse({ status: "inactive", role: "pastor" })
        .success,
    ).toBe(true);
    expect(adminUserUpdateSchema.safeParse({ role: "prayer_team" }).success).toBe(
      true,
    );
    expect(adminUserUpdateSchema.safeParse({ status: "deleted" }).success).toBe(
      false,
    );
  });
});
