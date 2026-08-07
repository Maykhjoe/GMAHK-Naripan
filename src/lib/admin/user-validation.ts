import { z } from "zod";

import { adminRoleCodes } from "@/lib/permissions/roles";

export const adminRoleSchema = z.enum(adminRoleCodes);

export const adminInviteSchema = z.object({
  email: z.email("Email tidak valid"),
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  role: adminRoleSchema,
});

export const adminUserUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    role: adminRoleSchema.optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan");
