import type { Permission } from "@/lib/permissions/rbac";

export const submissionKinds = [
  "prayer",
  "visitor",
  "contact",
  "registration",
] as const;

export type SubmissionKind = (typeof submissionKinds)[number];

export type SubmissionStatusOption = {
  value: string;
  label: string;
};

export type SubmissionConfig = {
  kind: SubmissionKind;
  section: string;
  table: string;
  permission: Permission;
  title: string;
  singular: string;
  searchColumn: string;
  statusOptions: readonly SubmissionStatusOption[];
  hasSoftDelete: boolean;
};

export const submissionConfigs: Record<SubmissionKind, SubmissionConfig> = {
  prayer: {
    kind: "prayer",
    section: "permohonan-doa",
    table: "prayer_requests",
    permission: "prayers.read",
    title: "Permohonan Doa",
    singular: "Permohonan doa",
    searchColumn: "name",
    hasSoftDelete: true,
    statusOptions: [
      { value: "unread", label: "Belum dibaca" },
      { value: "in_prayer", label: "Sedang didoakan" },
      { value: "follow_up", label: "Perlu tindak lanjut" },
      { value: "archived", label: "Diarsipkan" },
    ],
  },
  visitor: {
    kind: "visitor",
    section: "pengunjung",
    table: "visitor_forms",
    permission: "visitors.read",
    title: "Pengunjung Baru",
    singular: "Rencana kunjungan",
    searchColumn: "name",
    hasSoftDelete: true,
    statusOptions: [
      { value: "new", label: "Baru" },
      { value: "contacted", label: "Sudah dihubungi" },
      { value: "visited", label: "Sudah berkunjung" },
      { value: "archived", label: "Diarsipkan" },
    ],
  },
  contact: {
    kind: "contact",
    section: "pesan",
    table: "contact_messages",
    permission: "messages.read",
    title: "Pesan Masuk",
    singular: "Pesan",
    searchColumn: "subject",
    hasSoftDelete: true,
    statusOptions: [
      { value: "unread", label: "Belum dibaca" },
      { value: "in_progress", label: "Sedang diproses" },
      { value: "replied", label: "Sudah dibalas" },
      { value: "archived", label: "Diarsipkan" },
    ],
  },
  registration: {
    kind: "registration",
    section: "pendaftaran",
    table: "event_registrations",
    permission: "events.manage",
    title: "Pendaftaran Kegiatan",
    singular: "Pendaftaran",
    searchColumn: "name",
    hasSoftDelete: false,
    statusOptions: [
      { value: "registered", label: "Terdaftar" },
      { value: "confirmed", label: "Dikonfirmasi" },
      { value: "attended", label: "Hadir" },
      { value: "cancelled", label: "Dibatalkan" },
    ],
  },
};

export function isSubmissionKind(value: string): value is SubmissionKind {
  return submissionKinds.includes(value as SubmissionKind);
}

export function getSubmissionConfig(value: string) {
  return isSubmissionKind(value) ? submissionConfigs[value] : null;
}
