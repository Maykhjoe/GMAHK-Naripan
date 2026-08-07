export type AdminRole =
  | "super_admin"
  | "web_administrator"
  | "secretariat"
  | "media_team"
  | "editor"
  | "pastoral"
  | "prayer_team"
  | "department_admin";

export type Permission =
  | "dashboard.read"
  | "schedules.manage"
  | "events.manage"
  | "sermons.manage"
  | "livestreams.manage"
  | "posts.manage"
  | "ministries.manage"
  | "leaders.manage"
  | "gallery.manage"
  | "prayers.read"
  | "prayers.private.read"
  | "visitors.read"
  | "messages.read"
  | "files.manage"
  | "users.manage"
  | "appearance.manage"
  | "settings.manage";

export const rolePermissions: Record<AdminRole, (Permission | "*")[]> = {
  super_admin: ["*"],
  web_administrator: [
    "dashboard.read",
    "schedules.manage",
    "events.manage",
    "sermons.manage",
    "livestreams.manage",
    "posts.manage",
    "ministries.manage",
    "leaders.manage",
    "gallery.manage",
    "files.manage",
    "users.manage",
    "appearance.manage",
    "settings.manage",
  ],
  secretariat: [
    "dashboard.read",
    "schedules.manage",
    "events.manage",
    "leaders.manage",
    "visitors.read",
    "messages.read",
    "files.manage",
  ],
  media_team: [
    "dashboard.read",
    "sermons.manage",
    "livestreams.manage",
    "gallery.manage",
    "files.manage",
  ],
  editor: [
    "dashboard.read",
    "posts.manage",
    "sermons.manage",
    "events.manage",
  ],
  pastoral: [
    "dashboard.read",
    "schedules.manage",
    "sermons.manage",
    "posts.manage",
    "prayers.read",
    "prayers.private.read",
    "visitors.read",
  ],
  prayer_team: ["dashboard.read", "prayers.read"],
  department_admin: [
    "dashboard.read",
    "events.manage",
    "posts.manage",
    "ministries.manage",
    "gallery.manage",
  ],
};

export const adminMenu = [
  { label: "Dashboard", href: "/admin", permission: "dashboard.read" },
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
    permission: "prayers.read",
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
    label: "File & Download",
    href: "/admin/file",
    permission: "files.manage",
  },
  {
    label: "Pengguna",
    href: "/admin/pengguna",
    permission: "users.manage",
  },
  {
    label: "Tampilan Website",
    href: "/admin/tampilan",
    permission: "appearance.manage",
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

export function canAccess(role: AdminRole, permission: Permission) {
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
  "web_administrator",
  "pastoral",
  "secretariat",
  "media_team",
  "editor",
  "prayer_team",
  "department_admin",
];

export function resolveHighestRole(codes: readonly string[]): AdminRole | null {
  const known = new Set(codes);
  return rolePriority.find((role) => known.has(role)) ?? null;
}
