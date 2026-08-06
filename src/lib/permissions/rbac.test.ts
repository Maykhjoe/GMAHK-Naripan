import { describe, expect, it } from "vitest";
import { canAccess, getAllowedAdminMenu, resolveHighestRole, type AdminRole } from "./rbac";

describe("RBAC", () => {
  it("memberi super admin akses penuh", () => {
    expect(canAccess("super_admin", "settings.manage")).toBe(true);
    expect(canAccess("super_admin", "prayers.read")).toBe(true);
  });

  it("membatasi admin departemen pada konten departemennya", () => {
    expect(canAccess("department_admin", "ministries.manage")).toBe(true);
    expect(canAccess("department_admin", "users.manage")).toBe(false);
    expect(canAccess("department_admin", "prayers.read")).toBe(false);
  });

  it("hanya mengembalikan menu yang boleh dilihat role", () => {
    const menus = getAllowedAdminMenu("pastoral" as AdminRole);
    expect(menus.some((menu) => menu.href === "/admin/permohonan-doa")).toBe(true);
    expect(menus.some((menu) => menu.href === "/admin/pengguna")).toBe(false);
  });

  it("memilih role tertinggi dan mengabaikan nilai role yang tidak dikenal", () => {
    expect(resolveHighestRole(["editor", "pastoral"])).toBe("pastoral");
    expect(resolveHighestRole(["department_admin", "super_admin"])).toBe("super_admin");
    expect(resolveHighestRole(["unknown"])).toBeNull();
  });
});
