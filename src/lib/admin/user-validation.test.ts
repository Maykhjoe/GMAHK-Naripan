import { describe, expect, it } from "vitest";

import {
  adminCreateUserSchema,
  adminPasswordResetSchema,
  adminUserUpdateSchema,
} from "./user-validation";

describe("admin user validation", () => {
  it("accepts every final role for direct user creation", () => {
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
        adminCreateUserSchema.safeParse({
          fullName: "Admin Naripan",
          username: `${role}.naripan`,
          password: "PasswordKuat123",
          confirmation: "PasswordKuat123",
          role,
          ...(role === "department_admin"
            ? { ministryId: "22222222-2222-4222-8222-222222222222" }
            : {}),
        }).success,
      ).toBe(true);
    }
  });

  it("rejects unknown and legacy roles", () => {
    for (const role of ["owner", "pastoral", "secretariat", "media_team"]) {
      expect(
        adminCreateUserSchema.safeParse({
          fullName: "Admin Naripan",
          username: "admin.naripan",
          password: "PasswordKuat123",
          confirmation: "PasswordKuat123",
          role,
        }).success,
      ).toBe(false);
    }
  });

  it("normalizes usernames and rejects invalid username characters", () => {
    const valid = adminCreateUserSchema.safeParse({
      fullName: "Admin Naripan",
      username: "  Admin.Naripan  ",
      password: "PasswordKuat123",
      confirmation: "PasswordKuat123",
      role: "editor",
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.username).toBe("admin.naripan");
    }

    expect(
      adminCreateUserSchema.safeParse({
        fullName: "Admin Naripan",
        username: "admin naripan!",
        password: "PasswordKuat123",
        confirmation: "PasswordKuat123",
        role: "editor",
      }).success,
    ).toBe(false);
  });

  it("requires a ministry assignment for Admin Departemen", () => {
    expect(
      adminCreateUserSchema.safeParse({
        fullName: "Admin Departemen",
        username: "admin.departemen",
        password: "PasswordKuat123",
        confirmation: "PasswordKuat123",
        role: "department_admin",
      }).success,
    ).toBe(false);

    expect(
      adminUserUpdateSchema.safeParse({
        role: "department_admin",
        ministryId: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(true);
  });

  it("requires strong matching passwords for creation and reset", () => {
    expect(
      adminPasswordResetSchema.safeParse({
        password: "lemah123",
        confirmation: "lemah123",
      }).success,
    ).toBe(false);

    expect(
      adminPasswordResetSchema.safeParse({
        password: "PasswordKuat123",
        confirmation: "PasswordBeda123",
      }).success,
    ).toBe(false);

    expect(
      adminPasswordResetSchema.safeParse({
        password: "PasswordKuat123",
        confirmation: "PasswordKuat123",
      }).success,
    ).toBe(true);
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
