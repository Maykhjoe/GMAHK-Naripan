import { describe, expect, it } from "vitest";

import {
  canAccess,
  getAllowedAdminMenu,
  resolveHighestRole,
  type AdminRole,
} from "./rbac";

describe("RBAC", () => {
  it("memberi super admin akses penuh", () => {
    expect(canAccess("super_admin", "settings.manage")).toBe(true);
    expect(canAccess("super_admin", "prayers.private.read")).toBe(true);
  });

  it("membatasi admin departemen pada konten departemennya", () => {
    expect(canAccess("department_admin", "ministries.manage")).toBe(true);
    expect(canAccess("department_admin", "users.manage")).toBe(false);
    expect(canAccess("department_admin", "prayers.read")).toBe(false);
  });

  it("membedakan akses tim doa dan pastoral", () => {
    expect(canAccess("prayer_team", "prayers.read")).toBe(true);
    expect(canAccess("prayer_team", "prayers.private.read")).toBe(false);
    expect(canAccess("pastoral", "prayers.private.read")).toBe(true);
  });

  it("hanya mengembalikan menu yang boleh dilihat role", () => {
    const menus = getAllowedAdminMenu("pastoral" as AdminRole);
    expect(
      menus.some((menu) => menu.href === "/admin/permohonan-doa"),
    ).toBe(true);
    expect(menus.some((menu) => menu.href === "/admin/pengguna")).toBe(false);
  });

  it("menampilkan kotak pendaftaran untuk pengelola kegiatan", () => {
    const menus = getAllowedAdminMenu("secretariat");
    expect(menus.some((menu) => menu.href === "/admin/pendaftaran")).toBe(
      true,
    );
  });

  it("memilih role tertinggi dan mengabaikan nilai role yang tidak dikenal", () => {
    expect(resolveHighestRole(["editor", "pastoral"])).toBe("pastoral");
    expect(resolveHighestRole(["prayer_team"])).toBe("prayer_team");
    expect(resolveHighestRole(["department_admin", "super_admin"])).toBe(
      "super_admin",
    );
    expect(resolveHighestRole(["unknown"])).toBeNull();
  });
});
