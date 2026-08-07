export const adminRoleCodes = [
  "super_admin",
  "pastor",
  "church_chair",
  "prayer_team",
  "secretary",
  "editor",
  "media",
  "department_admin",
] as const;

export type AdminRole = (typeof adminRoleCodes)[number];

export const adminRoleOptions: readonly {
  value: AdminRole;
  label: string;
  description: string;
}[] = [
  {
    value: "super_admin",
    label: "Super Admin",
    description: "Mengelola sistem, keamanan, pengguna, dan monitoring pelayanan.",
  },
  {
    value: "pastor",
    label: "Pendeta/Gembala Jemaat",
    description: "Memimpin pelayanan jemaat dan menangani permohonan doa untuk pendeta.",
  },
  {
    value: "church_chair",
    label: "Ketua Jemaat",
    description: "Mendukung operasional pelayanan di bawah Pendeta/Gembala Jemaat.",
  },
  {
    value: "prayer_team",
    label: "Tim Pendoa Jemaat",
    description: "Menangani permohonan doa yang ditujukan kepada Tim Pendoa Jemaat.",
  },
  {
    value: "secretary",
    label: "Sekretaris",
    description: "Mengelola kegiatan, jadwal, pengunjung, pesan, dan administrasi.",
  },
  {
    value: "editor",
    label: "Editor",
    description: "Mengelola berita, artikel, renungan, dan kualitas konten.",
  },
  {
    value: "media",
    label: "Media",
    description: "Mengelola khotbah, live streaming, galeri, dan aset media.",
  },
  {
    value: "department_admin",
    label: "Admin Departemen",
    description: "Mengelola konten dan pelayanan departemen yang ditugaskan.",
  },
];

export function getAdminRoleLabel(role: string | null | undefined) {
  return (
    adminRoleOptions.find((option) => option.value === role)?.label ??
    "Role tidak dikenal"
  );
}
