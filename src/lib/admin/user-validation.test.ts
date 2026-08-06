import { describe, expect, it } from "vitest";
import { adminInviteSchema, adminUserUpdateSchema } from "./user-validation";

describe("admin user validation", () => {
  it("accepts a valid invitation", () => {
    expect(adminInviteSchema.safeParse({ email: "admin@example.com", fullName: "Admin Naripan", role: "editor" }).success).toBe(true);
  });
  it("rejects unknown roles and malformed identities", () => {
    expect(adminInviteSchema.safeParse({ email: "bad", fullName: "A", role: "owner" }).success).toBe(false);
  });
  it("only accepts explicit user status values", () => {
    expect(adminUserUpdateSchema.safeParse({ status: "inactive", role: "pastoral" }).success).toBe(true);
    expect(adminUserUpdateSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});
