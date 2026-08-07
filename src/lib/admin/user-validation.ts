import { z } from "zod";

export const adminRoleSchema = z.enum(["super_admin", "web_administrator", "secretariat", "media_team", "editor", "pastoral", "prayer_team", "department_admin"]);
export const adminInviteSchema = z.object({
  email: z.email("Email tidak valid"),
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  role: adminRoleSchema,
});
export const adminUserUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  role: adminRoleSchema.optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan");
