import { z } from "zod";

import { adminUsernameSchema } from "@/lib/auth/username";
import { adminRoleCodes } from "@/lib/permissions/roles";

export const adminRoleSchema = z.enum(adminRoleCodes);

const optionalMinistryId = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.uuid("Departemen tidak valid").nullable(),
);

export const adminStrongPasswordSchema = z
  .string()
  .min(12, "Kata sandi minimal 12 karakter")
  .max(128, "Kata sandi maksimal 128 karakter")
  .regex(/[a-z]/, "Gunakan huruf kecil")
  .regex(/[A-Z]/, "Gunakan huruf besar")
  .regex(/[0-9]/, "Gunakan angka");

export const adminCreateUserSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    username: adminUsernameSchema,
    password: adminStrongPasswordSchema,
    confirmation: z.string(),
    role: adminRoleSchema,
    ministryId: optionalMinistryId,
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
    message: "Konfirmasi kata sandi tidak sama",
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

export const adminPasswordResetSchema = z
  .object({
    password: adminStrongPasswordSchema,
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
    message: "Konfirmasi kata sandi tidak sama",
  });

export const adminUserUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    username: adminUsernameSchema.optional(),
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
