import { z } from "zod";

export function normalizeAdminUsername(value: string) {
  return value.trim().toLowerCase();
}

export const adminUsernameSchema = z.preprocess(
  (value) =>
    typeof value === "string" ? normalizeAdminUsername(value) : value,
  z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(32, "Username maksimal 32 karakter")
    .regex(
      /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/,
      "Gunakan huruf kecil, angka, titik, garis bawah, atau tanda hubung",
    ),
);
