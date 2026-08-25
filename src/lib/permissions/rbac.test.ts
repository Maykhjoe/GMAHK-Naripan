import { describe, expect, it } from "vitest";

import {
  canAccess,
  getAllowedAdminMenu,
  resolveHighestRole,
} from "./rbac";

const finalRoles = [
  "super_admin",
  "pastor",
  "church_chair",
  "prayer_team",
  "secretary",
  "editor",
  "media",
  "department_admin",
] as const;

describe("RBAC", () => {
  it("memisahkan pengelolaan sistem dan kotak masuk doa", () => {
    expect(canAccess("super_admin", "settings.manage")).toBe(true);
    expect(canAccess("super_admin", "monitoring.read")).toBe(true);
    expect(canAccess("super_admin", "audit.read")).toBe(true);
    expect(canAccess("super_admin", "security.read")).toBe(true);
    expect(canAccess("super_admin", "prayers.inbox.read")).toBe(false);
  });

  it("mengunci pengelolaan sistem kepada Super Admin", () => {
    for (const role of finalRoles.filter((role) => role !== "super_admin")) {
      expect(canAccess(role, "users.manage")).toBe(false);
      expect(canAccess(role, "settings.manage")).toBe(false);
      expect(canAccess(role, "appearance.manage")).toBe(false);
      expect(canAccess(role, "monitoring.read")).toBe(false);
      expect(canAccess(role, "audit.read")).toBe(false);
      expect(canAccess(role, "security.read")).toBe(false);
      expect(canAccess(role, "posts.delete_permanent")).toBe(false);
    }
  });

  it("memberi semua role hak kontribusi berita dan artikel", () => {
    for (const role of finalRoles) {
      expect(canAccess(role, "posts.manage")).toBe(true);
    }
  });


  it("memisahkan hak kontribusi dan hak publikasi artikel", () => {
    expect(canAccess("prayer_team", "posts.manage")).toBe(true);
    expect(canAccess("prayer_team", "posts.publish")).toBe(false);
    expect(canAccess("secretary", "posts.publish")).toBe(false);
    expect(canAccess("media", "posts.publish")).toBe(false);

    expect(canAccess("editor", "posts.review")).toBe(true);
    expect(canAccess("editor", "posts.publish")).toBe(true);
    expect(canAccess("pastor", "posts.publish")).toBe(true);
    expect(canAccess("church_chair", "posts.publish")).toBe(true);
    expect(canAccess("super_admin", "posts.delete_permanent")).toBe(true);
  });

  it("membatasi kotak masuk doa pada dua role penerima", () => {
    expect(canAccess("prayer_team", "prayers.inbox.read")).toBe(true);
    expect(canAccess("pastor", "prayers.inbox.read")).toBe(true);
    expect(canAccess("church_chair", "prayers.inbox.read")).toBe(false);
    expect(canAccess("editor", "prayers.inbox.read")).toBe(false);
  });

  it("tidak lagi menampilkan modul Tampilan Website yang sudah legacy", () => {
    const menus = getAllowedAdminMenu("super_admin");
    expect(menus.some((menu) => menu.href === "/admin/tampilan")).toBe(false);
    expect(menus.some((menu) => menu.label === "Media & Dokumen")).toBe(true);
  });

  it("menampilkan menu monitoring untuk Super Admin tanpa menu doa", () => {
    const menus = getAllowedAdminMenu("super_admin");
    expect(menus.some((menu) => menu.href === "/admin/monitoring")).toBe(true);
    expect(menus.some((menu) => menu.href === "/admin/audit-log")).toBe(true);
    expect(menus.some((menu) => menu.href === "/admin/keamanan")).toBe(true);
    expect(
      menus.some((menu) => menu.href === "/admin/permohonan-doa"),
    ).toBe(false);
  });

  it("menampilkan kotak doa untuk Pendeta/Gembala", () => {
    const menus = getAllowedAdminMenu("pastor");
    expect(
      menus.some((menu) => menu.href === "/admin/permohonan-doa"),
    ).toBe(true);
    expect(menus.some((menu) => menu.href === "/admin/pengguna")).toBe(false);
  });

  it("menampilkan pendaftaran untuk Sekretaris", () => {
    const menus = getAllowedAdminMenu("secretary");
    expect(menus.some((menu) => menu.href === "/admin/pendaftaran")).toBe(
      true,
    );
  });

  it("memilih role final tertinggi dan mengabaikan role legacy", () => {
    expect(resolveHighestRole(["editor", "pastor"])).toBe("pastor");
    expect(resolveHighestRole(["church_chair", "prayer_team"])).toBe(
      "church_chair",
    );
    expect(resolveHighestRole(["department_admin", "super_admin"])).toBe(
      "super_admin",
    );
    expect(resolveHighestRole(["pastoral", "secretariat"])).toBeNull();
  });
});
