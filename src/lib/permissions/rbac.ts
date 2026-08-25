import type { AdminRole } from "@/lib/permissions/roles";

export type { AdminRole } from "@/lib/permissions/roles";

export type Permission =
  | "dashboard.read"
  | "monitoring.read"
  | "schedules.manage"
  | "events.manage"
  | "sermons.manage"
  | "livestreams.manage"
  | "posts.manage"
  | "posts.review"
  | "posts.publish"
  | "posts.edit_all"
  | "posts.delete_permanent"
  | "ministries.manage"
  | "leaders.manage"
  | "gallery.manage"
  | "prayers.inbox.read"
  | "visitors.read"
  | "messages.read"
  | "files.manage"
  | "users.manage"
  | "appearance.manage"
  | "settings.manage"
  | "audit.read"
  | "security.read";

/**
 * UI permission map. Database RLS and server authorization remain the source
 * of truth. Prayer access is intentionally not inherited by Super Admin.
 */
export const rolePermissions: Record<AdminRole, (Permission | "*")[]> = {
  super_admin: ["*"],
  pastor: [
    "dashboard.read",
    "schedules.manage",
    "events.manage",
    "sermons.manage",
    "posts.manage",
    "posts.review",
    "posts.publish",
    "posts.edit_all",
    "leaders.manage",
    "prayers.inbox.read",
    "visitors.read",
  ],
  church_chair: [
    "dashboard.read",
    "schedules.manage",
    "events.manage",
    "posts.manage",
    "posts.review",
    "posts.publish",
    "posts.edit_all",
    "leaders.manage",
    "visitors.read",
  ],
  prayer_team: [
    "dashboard.read",
    "posts.manage",
    "prayers.inbox.read",
  ],
  secretary: [
    "dashboard.read",
    "schedules.manage",
    "events.manage",
    "posts.manage",
    "leaders.manage",
    "visitors.read",
    "messages.read",
    "files.manage",
  ],
  editor: [
    "dashboard.read",
    "posts.manage",
    "posts.review",
    "posts.publish",
    "posts.edit_all",
    "sermons.manage",
    "events.manage",
  ],
  media: [
    "dashboard.read",
    "posts.manage",
    "sermons.manage",
    "livestreams.manage",
    "gallery.manage",
    "files.manage",
  ],
  department_admin: [
    "dashboard.read",
    "posts.manage",
    "events.manage",
    "ministries.manage",
    "gallery.manage",
  ],
};

export const adminMenu = [
  { label: "Dashboard", href: "/admin", permission: "dashboard.read" },
  {
    label: "Monitoring Pelayanan",
    href: "/admin/monitoring",
    permission: "monitoring.read",
  },
  {
    label: "Notifikasi",
    href: "/admin/notifikasi",
    permission: "dashboard.read",
  },
  {
    label: "Ibadah Khusus",
    href: "/admin/jadwal",
    permission: "schedules.manage",
  },
  {
    label: "Kegiatan",
    href: "/admin/kegiatan",
    permission: "events.manage",
  },
  {
    label: "Pendaftaran Kegiatan",
    href: "/admin/pendaftaran",
    permission: "events.manage",
  },
  {
    label: "Khotbah",
    href: "/admin/khotbah",
    permission: "sermons.manage",
  },
  {
    label: "Live Streaming",
    href: "/admin/live",
    permission: "livestreams.manage",
  },
  {
    label: "Berita & Renungan",
    href: "/admin/berita",
    permission: "posts.manage",
  },
  {
    label: "Pelayanan",
    href: "/admin/departemen",
    permission: "ministries.manage",
  },
  {
    label: "Pengurus",
    href: "/admin/pengurus",
    permission: "leaders.manage",
  },
  {
    label: "Galeri",
    href: "/admin/galeri",
    permission: "gallery.manage",
  },
  {
    label: "Permohonan Doa",
    href: "/admin/permohonan-doa",
    permission: "prayers.inbox.read",
  },
  {
    label: "Pengunjung Baru",
    href: "/admin/pengunjung",
    permission: "visitors.read",
  },
  {
    label: "Pesan Masuk",
    href: "/admin/pesan",
    permission: "messages.read",
  },
  {
    label: "Media & Dokumen",
    href: "/admin/file",
    permission: "files.manage",
  },
  {
    label: "Pengguna",
    href: "/admin/pengguna",
    permission: "users.manage",
  },
  {
    label: "Audit Log",
    href: "/admin/audit-log",
    permission: "audit.read",
  },
  {
    label: "Keamanan",
    href: "/admin/keamanan",
    permission: "security.read",
  },
  {
    label: "Pengaturan",
    href: "/admin/pengaturan",
    permission: "settings.manage",
  },
] as const satisfies readonly {
  label: string;
  href: string;
  permission: Permission;
}[];

const superAdminExcludedPermissions = new Set<Permission>([
  "prayers.inbox.read",
]);

const superAdminOnlyPermissions = new Set<Permission>([
  "monitoring.read",
  "users.manage",
  "appearance.manage",
  "settings.manage",
  "audit.read",
  "security.read",
  "posts.delete_permanent",
]);

export function canAccess(role: AdminRole, permission: Permission) {
  if (role !== "super_admin" && superAdminOnlyPermissions.has(permission)) {
    return false;
  }

  if (role === "super_admin" && superAdminExcludedPermissions.has(permission)) {
    return false;
  }

  const permissions = rolePermissions[role];
  return (
    permissions.includes("*") ||
    (permissions as Permission[]).includes(permission)
  );
}

export function getAllowedAdminMenu(role: AdminRole) {
  return adminMenu.filter((item) => canAccess(role, item.permission));
}

const rolePriority: readonly AdminRole[] = [
  "super_admin",
  "pastor",
  "church_chair",
  "secretary",
  "editor",
  "media",
  "prayer_team",
  "department_admin",
];

export function resolveHighestRole(codes: readonly string[]): AdminRole | null {
  const known = new Set(codes);
  return rolePriority.find((role) => known.has(role)) ?? null;
}
