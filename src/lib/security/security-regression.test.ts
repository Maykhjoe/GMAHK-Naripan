import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const root = resolve(process.cwd());

describe("security regression guard", () => {
  it("tidak mengekspos service-role atau secret server di client component", () => {
    const src = join(root, "src");
    const clientFiles = walk(src).filter((path) => {
      if (!/\.(ts|tsx)$/.test(path)) return false;
      const text = readFileSync(path, "utf8");
      return /^\s*["']use client["'];/m.test(text);
    });

    const forbidden = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "TURNSTILE_SECRET_KEY",
      "SUPABASE_ACCESS_TOKEN",
      "createAdminClient",
    ];

    for (const path of clientFiles) {
      const text = readFileSync(path, "utf8");
      for (const token of forbidden) {
        expect(
          text.includes(token),
          `${relative(root, path)} tidak boleh mengandung ${token}`,
        ).toBe(false);
      }
    }
  });

  it("route keamanan dan pengguna tetap Super Admin-only", () => {
    const protectedRoutes = [
      "src/app/api/admin/security/route.ts",
      "src/app/api/admin/users/route.ts",
      "src/app/api/admin/audit-logs/route.ts",
      "src/app/api/admin/retention/route.ts",
    ];

    for (const route of protectedRoutes) {
      const text = readFileSync(join(root, route), "utf8");
      expect(text.includes("requireSuperAdmin"), route).toBe(true);
    }
  });

  it("upload admin melewati handler server-side yang tervalidasi", () => {
    const uploadRoutes = [
      "src/app/api/admin/berita/image/route.ts",
      "src/app/api/admin/kegiatan/image/route.ts",
      "src/app/api/admin/khotbah/thumbnail/route.ts",
      "src/app/api/admin/live/thumbnail/route.ts",
      "src/app/api/admin/pengurus/photo/route.ts",
      "src/app/api/admin/departemen/image/route.ts",
    ];

    for (const route of uploadRoutes) {
      const text = readFileSync(join(root, route), "utf8");
      expect(text.includes("handleAdminImageUpload"), route).toBe(true);
    }
  });

  it("security headers tetap terpasang pada Next.js", () => {
    const config = readFileSync(join(root, "next.config.ts"), "utf8");
    const headers = readFileSync(
      join(root, "src/lib/security/headers.ts"),
      "utf8",
    );

    expect(config.includes("getSecurityHeaders")).toBe(true);
    expect(headers.includes("Content-Security-Policy")).toBe(true);
    expect(headers.includes("Strict-Transport-Security")).toBe(true);
    expect(headers.includes("X-Content-Type-Options")).toBe(true);
  });
});
