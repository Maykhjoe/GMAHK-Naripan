import { z } from "zod";

import { adminRoleCodes } from "@/lib/permissions/roles";

export const adminRoleSchema = z.enum(adminRoleCodes);

const optionalMinistryId = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.uuid("Departemen tidak valid").nullable(),
);

export const adminInviteSchema = z
  .object({
    email: z.email("Email tidak valid"),
    fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    role: adminRoleSchema,
    ministryId: optionalMinistryId,
  })
  .superRefine((value, context) => {
    if (value.role === "department_admin" && !value.ministryId) {
      context.addIssue({
        code: "custom",
        path: ["ministryId"],
        message: "Admin Departemen wajib ditugaskan ke satu departemen",
      });
    }
  });

export const adminUserUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    role: adminRoleSchema.optional(),
    ministryId: optionalMinistryId.optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan")
  .superRefine((value, context) => {
    if (
      value.role === "department_admin" &&
      (value.ministryId === undefined || value.ministryId === null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["ministryId"],
        message: "Admin Departemen wajib ditugaskan ke satu departemen",
      });
    }
  });
