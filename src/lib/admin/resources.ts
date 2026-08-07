import { z } from "zod";

import { eventCategories } from "@/lib/constants/content-options";
import { specialWorshipCategories } from "@/lib/constants/worship-schedules";
import type { Permission } from "@/lib/permissions/rbac";

export type AdminFieldType =
  | "text"
  | "textarea"
  | "datetime-local"
  | "date"
  | "number"
  | "url"
  | "uuid"
  | "checkbox"
  | "select"
  | "relation"
  | "image";

export type AdminFieldFormat = "paragraphs" | "lines" | "setting-value";

export type AdminFieldOption =
  | string
  | {
      value: string;
      label: string;
    };

export type AdminField = {
  key: string;
  label: string;
  type: AdminFieldType;
  required?: boolean;
  placeholder?: string;
  options?: readonly AdminFieldOption[];
  optionsEndpoint?: string;
  uploadEndpoint?: string;
  urlField?: string;
  accept?: string;
  help?: string;
  format?: AdminFieldFormat;
  defaultValue?: string | number | boolean;
  sourcePath?: string;
  hidden?: boolean;
  reviewerOnly?: boolean;
};

export type AdminResource = {
  section: string;
  table: string;
  permission: Permission;
  title: string;
  singular: string;
  titleColumn: string;
  dateColumn?: string;
  readOnly?: boolean;
  createEnabled?: boolean;
  softDelete?: boolean;
  slugSource?: string;
  searchColumn?: string;
  categoryColumn?: string;
  fields: readonly AdminField[];
};

const statusOptions = [
  { value: "draft", label: "Draf" },
  { value: "scheduled", label: "Terjadwal" },
  { value: "published", label: "Dipublikasikan" },
  { value: "inactive", label: "Tidak aktif" },
] as const;


const postStatusField: AdminField = {
  key: "status",
  label: "Status",
  type: "select",
  required: true,
  options: [
    { value: "draft", label: "Draf" },
    { value: "pending_review", label: "Menunggu Peninjauan" },
    { value: "published", label: "Dipublikasikan" },
    { value: "archived", label: "Diarsipkan" },
  ],
};

const activeStatus: AdminField = {
  key: "status",
  label: "Status",
  type: "select",
  required: true,
  options: [
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Tidak aktif" },
  ],
};

const contentFields = {
  status: {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: statusOptions,
  } satisfies AdminField,
  publishedAt: {
    key: "published_at",
    label: "Waktu Publikasi",
    type: "datetime-local",
    help: "Kosongkan untuk memakai waktu saat konten dipublikasikan.",
  } satisfies AdminField,
};

export const adminResources: Record<string, AdminResource> = {
  jadwal: {
    section: "jadwal",
    table: "service_schedules",
    permission: "schedules.manage",
    title: "Ibadah Khusus",
    singular: "Ibadah Khusus",
    titleColumn: "title",
    dateColumn: "starts_at",
    softDelete: true,
    slugSource: "title",
    fields: [
      {
        key: "title",
        label: "Nama Ibadah Khusus",
        type: "text",
        required: true,
        placeholder: "Contoh: Pekan Doa Keluarga",
        help: "Jadwal Rabu, Vesper, dan Sabat sudah tetap sehingga tidak perlu dimasukkan di sini.",
      },
      {
        key: "category",
        label: "Jenis Ibadah",
        type: "select",
        required: true,
        options: specialWorshipCategories,
      },
      {
        key: "description",
        label: "Deskripsi",
        type: "textarea",
        placeholder: "Tuliskan informasi singkat mengenai ibadah khusus ini.",
      },
      {
        key: "starts_at",
        label: "Mulai",
        type: "datetime-local",
        required: true,
      },
      {
        key: "ends_at",
        label: "Selesai",
        type: "datetime-local",
      },
      {
        key: "location",
        label: "Lokasi",
        type: "text",
        placeholder: "GMAHK Jemaat Naripan",
      },
      { key: "zoom_url", label: "Tautan Zoom", type: "url" },
      { key: "youtube_url", label: "Tautan YouTube", type: "url" },
      {
        key: "is_featured",
        label: "Tampilkan sebagai agenda utama",
        type: "checkbox",
      },
      contentFields.status,
      contentFields.publishedAt,
    ],
  },

  kegiatan: {
    section: "kegiatan",
    table: "events",
    permission: "events.manage",
    title: "Kegiatan",
    singular: "Kegiatan",
    titleColumn: "title",
    dateColumn: "starts_at",
    softDelete: true,
    slugSource: "title",
    searchColumn: "search_text",
    categoryColumn: "category",
    fields: [
      {
        key: "title",
        label: "Judul Kegiatan",
        type: "text",
        required: true,
        placeholder: "Contoh: Seminar Kesehatan Keluarga",
      },
      {
        key: "category",
        label: "Kategori",
        type: "select",
        required: true,
        options: eventCategories,
      },
      {
        key: "short_description",
        label: "Ringkasan",
        type: "textarea",
        required: true,
        placeholder:
          "Tuliskan ringkasan singkat yang akan tampil pada kartu kegiatan.",
      },
      {
        key: "description",
        label: "Deskripsi Lengkap",
        type: "textarea",
        format: "paragraphs",
        placeholder:
          "Tuliskan informasi lengkap kegiatan. Tekan Enter dua kali untuk membuat paragraf baru.",
      },
      {
        key: "poster_url",
        label: "URL Poster",
        type: "url",
        sourcePath: "seo.image",
        hidden: true,
      },
      {
        key: "poster_id",
        label: "Poster Kegiatan",
        type: "image",
        uploadEndpoint: "/api/admin/kegiatan/image",
        urlField: "poster_url",
        accept: "image/jpeg,image/png,image/webp",
        help: "JPG, PNG, atau WebP. Maksimal 5 MB.",
      },
      {
        key: "starts_at",
        label: "Mulai",
        type: "datetime-local",
        required: true,
      },
      {
        key: "ends_at",
        label: "Selesai",
        type: "datetime-local",
        help: "Kosongkan bila waktu selesai belum ditentukan.",
      },
      {
        key: "location",
        label: "Lokasi",
        type: "text",
        placeholder: "Contoh: Aula GMAHK Naripan",
      },
      {
        key: "zoom_url",
        label: "Tautan Zoom",
        type: "url",
        placeholder: "https://zoom.us/...",
      },
      {
        key: "youtube_url",
        label: "Tautan YouTube",
        type: "url",
        placeholder: "https://youtube.com/...",
      },
      {
        key: "registration_enabled",
        label: "Aktifkan pendaftaran peserta",
        type: "checkbox",
      },
      {
        key: "capacity",
        label: "Kuota Peserta",
        type: "number",
        placeholder: "Contoh: 100",
        help: "Kosongkan bila tidak ada batas kuota.",
      },
      {
        key: "registration_deadline",
        label: "Batas Pendaftaran",
        type: "datetime-local",
      },
      {
        key: "rundown",
        label: "Rundown Acara",
        type: "textarea",
        format: "lines",
        placeholder: "Registrasi\nPembukaan\nPenyampaian materi\nPenutup",
        help: "Tulis satu susunan acara per baris.",
      },
      contentFields.status,
      contentFields.publishedAt,
    ],
  },

  khotbah: {
    section: "khotbah",
    table: "sermons",
    permission: "sermons.manage",
    title: "Khotbah",
    singular: "Khotbah",
    titleColumn: "title",
    dateColumn: "sermon_date",
    softDelete: true,
    slugSource: "title",
    searchColumn: "search_text",
    categoryColumn: "category_id",
    fields: [
      {
        key: "title",
        label: "Judul Khotbah",
        type: "text",
        required: true,
        placeholder: "Contoh: Berakar dan Dibangun di Dalam Kristus",
      },
      {
        key: "category_id",
        label: "Kategori",
        type: "relation",
        required: true,
        optionsEndpoint: "/api/admin/khotbah/categories",
        help: "Kategori aktif diambil langsung dari Supabase.",
      },
      {
        key: "speaker_name",
        label: "Pembicara",
        type: "text",
        required: true,
        sourcePath: "seo.speaker",
        placeholder: "Nama pembicara",
      },
      {
        key: "sermon_date",
        label: "Tanggal Khotbah",
        type: "date",
        required: true,
      },
      {
        key: "main_verse",
        label: "Ayat Utama",
        type: "text",
        required: true,
        placeholder: "Contoh: Kolose 2:6–7",
      },
      {
        key: "description",
        label: "Ringkasan Khotbah",
        type: "textarea",
        required: true,
        placeholder:
          "Tuliskan ringkasan pesan utama khotbah yang akan tampil pada halaman publik.",
      },
      {
        key: "youtube_id",
        label: "Tautan YouTube",
        type: "text",
        placeholder: "Tempel URL YouTube atau Video ID",
        help: "Sistem akan mengambil Video ID secara otomatis.",
      },
      {
        key: "thumbnail_url",
        label: "URL Thumbnail",
        type: "url",
        sourcePath: "seo.image",
        hidden: true,
      },
      {
        key: "thumbnail_id",
        label: "Thumbnail Khotbah",
        type: "image",
        uploadEndpoint: "/api/admin/khotbah/thumbnail",
        urlField: "thumbnail_url",
        accept: "image/jpeg,image/png,image/webp",
        help: "JPG, PNG, atau WebP. Maksimal 5 MB.",
      },
      {
        key: "audio_url",
        label: "Tautan Audio",
        type: "url",
        sourcePath: "seo.audio",
        placeholder: "https://...",
        help: "Opsional. Gunakan tautan audio publik yang dapat diakses pengunjung.",
      },
      {
        key: "material_pdf_url",
        label: "Tautan Materi PDF",
        type: "url",
        sourcePath: "seo.materialPdf",
        placeholder: "https://.../materi.pdf",
        help: "Opsional. Gunakan tautan PDF publik.",
      },
      contentFields.status,
      contentFields.publishedAt,
    ],
  },

  live: {
    section: "live",
    table: "livestreams",
    permission: "livestreams.manage",
    title: "Live Streaming",
    singular: "Siaran Live",
    titleColumn: "title",
    dateColumn: "starts_at",
    softDelete: true,
    fields: [
      {
        key: "title",
        label: "Judul Siaran",
        type: "text",
        required: true,
        placeholder: "Contoh: Kebaktian Sabat",
      },
      {
        key: "theme",
        label: "Tema / Judul Pesan",
        type: "text",
        placeholder: "Contoh: Berakar dan Dibangun di Dalam Kristus",
      },
      {
        key: "speaker_name",
        label: "Pembicara",
        type: "text",
        placeholder: "Contoh: Pdt. Nama Pembicara",
      },
      {
        key: "scripture_reference",
        label: "Ayat Utama",
        type: "text",
        placeholder: "Contoh: Kolose 2:6–7",
      },
      {
        key: "youtube_id",
        label: "Tautan YouTube",
        type: "text",
        required: true,
        placeholder: "Tempel URL YouTube atau Video ID",
        help: "Sistem akan mengambil Video ID secara otomatis.",
      },
      {
        key: "starts_at",
        label: "Mulai",
        type: "datetime-local",
        required: true,
      },
      {
        key: "ends_at",
        label: "Selesai",
        type: "datetime-local",
        help: "Jika dikosongkan, sistem memakai durasi default 3 jam.",
      },
      {
        key: "thumbnail_url",
        label: "URL Thumbnail",
        type: "url",
        hidden: true,
      },
      {
        key: "thumbnail_id",
        label: "Thumbnail / Poster Siaran",
        type: "image",
        uploadEndpoint: "/api/admin/live/thumbnail",
        urlField: "thumbnail_url",
        accept: "image/jpeg,image/png,image/webp",
        help: "Opsional. JPG, PNG, atau WebP maksimal 5 MB.",
      },
      {
        key: "zoom_url",
        label: "Tautan Zoom",
        type: "url",
        placeholder: "https://zoom.us/...",
      },
      {
        key: "offline_message",
        label: "Pesan Ketika Offline",
        type: "textarea",
        placeholder:
          "Contoh: Siaran belum dimulai. Silakan kembali sesuai jadwal.",
      },
      {
        key: "live_status",
        label: "Status Siaran",
        type: "select",
        required: true,
        options: [
          { value: "scheduled", label: "Dijadwalkan" },
          { value: "live", label: "Sedang Live" },
          { value: "ended", label: "Selesai / Rekaman" },
          { value: "cancelled", label: "Dibatalkan" },
        ],
      },
      contentFields.status,
      contentFields.publishedAt,
    ],
  },

  berita: {
    section: "berita",
    table: "posts",
    permission: "posts.manage",
    title: "Berita & Renungan",
    singular: "Artikel",
    titleColumn: "title",
    dateColumn: "updated_at",
    softDelete: true,
    slugSource: "title",
    searchColumn: "search_text",
    categoryColumn: "category_id",
    fields: [
      {
        key: "title",
        label: "Judul",
        type: "text",
        required: true,
        placeholder: "Masukkan judul artikel",
      },
      {
        key: "category_id",
        label: "Kategori",
        type: "relation",
        required: true,
        optionsEndpoint: "/api/admin/berita/categories",
        help: "Kategori aktif diambil langsung dari Supabase.",
      },
      {
        key: "author_name",
        label: "Penulis",
        type: "text",
        defaultValue: "Tim Komunikasi GMAHK Naripan",
        sourcePath: "seo.author",
        placeholder: "Nama penulis artikel",
      },
      {
        key: "excerpt",
        label: "Ringkasan",
        type: "textarea",
        placeholder: "Ringkasan singkat yang tampil di daftar berita.",
      },
      {
        key: "content",
        label: "Isi Artikel",
        type: "textarea",
        format: "paragraphs",
        required: true,
        placeholder:
          "Tuliskan isi artikel. Tekan Enter dua kali untuk membuat paragraf baru.",
        help: "Slug, waktu baca, dan SEO dibuat otomatis oleh sistem.",
      },
      {
        key: "featured_image_url",
        label: "URL Gambar Utama",
        type: "url",
        sourcePath: "seo.image",
        hidden: true,
      },
      {
        key: "featured_image_id",
        label: "Gambar Utama",
        type: "image",
        uploadEndpoint: "/api/admin/berita/image",
        urlField: "featured_image_url",
        accept: "image/jpeg,image/png,image/webp",
        help: "JPG, PNG, atau WebP. Maksimal 5 MB.",
      },
      postStatusField,
      {
        key: "review_notes",
        label: "Catatan Peninjauan",
        type: "textarea",
        reviewerOnly: true,
        placeholder: "Catatan untuk penulis bila artikel perlu diperbaiki.",
        help: "Hanya reviewer yang dapat mengubah catatan ini. Penulis tetap dapat membacanya.",
      },
    ],
  },

  departemen: {
    section: "departemen",
    table: "ministries",
    permission: "ministries.manage",
    title: "Pelayanan & Departemen",
    singular: "Pelayanan",
    titleColumn: "name",
    dateColumn: "updated_at",
    softDelete: true,
    slugSource: "name",
    searchColumn: "search_text",
    fields: [
      {
        key: "name",
        label: "Nama Pelayanan",
        type: "text",
        required: true,
        placeholder: "Contoh: Pelayanan Anak",
      },
      {
        key: "short_name",
        label: "Nama Singkat",
        type: "text",
        sourcePath: "seo.shortName",
        placeholder: "Contoh: PA",
        help: "Opsional. Dipakai bila pelayanan memiliki nama singkat yang umum.",
      },
      {
        key: "short_description",
        label: "Ringkasan",
        type: "textarea",
        required: true,
        placeholder:
          "Tuliskan ringkasan singkat yang akan tampil pada kartu pelayanan.",
      },
      {
        key: "description",
        label: "Deskripsi Lengkap",
        type: "textarea",
        format: "paragraphs",
        required: true,
        placeholder:
          "Jelaskan tujuan dan kegiatan pelayanan. Tekan Enter dua kali untuk membuat paragraf baru.",
      },
      {
        key: "coordinator_name",
        label: "Nama Koordinator",
        type: "text",
        sourcePath: "seo.coordinator",
        placeholder: "Nama koordinator pelayanan",
      },
      {
        key: "contact",
        label: "Nomor Kontak / WhatsApp",
        type: "text",
        placeholder: "Contoh: 0812-3456-7890",
      },
      {
        key: "contact_email",
        label: "Email Pelayanan",
        type: "text",
        sourcePath: "seo.email",
        placeholder: "pelayanan@contoh.org",
      },
      {
        key: "schedule",
        label: "Jadwal Pelayanan",
        type: "text",
        sourcePath: "seo.schedule",
        placeholder: "Contoh: Sabtu, 14.00 WIB",
      },
      {
        key: "location",
        label: "Lokasi",
        type: "text",
        sourcePath: "seo.location",
        placeholder: "Contoh: Ruang Pemuda GMAHK Naripan",
      },
      {
        key: "ministry_icon",
        label: "Ikon Pelayanan",
        type: "select",
        sourcePath: "seo.icon",
        defaultValue: "Heart",
        options: [
          { value: "BookOpen", label: "Alkitab / Pembelajaran" },
          { value: "Users", label: "Komunitas / Kelompok" },
          { value: "Heart", label: "Kasih / Pelayanan" },
          { value: "Flower2", label: "Wanita / Keluarga" },
          { value: "Music2", label: "Musik / Pujian" },
          { value: "Activity", label: "Kesehatan / Aktivitas" },
        ],
      },
      {
        key: "thumbnail_url",
        label: "URL Gambar Pelayanan",
        type: "url",
        sourcePath: "seo.image",
        hidden: true,
      },
      {
        key: "thumbnail_id",
        label: "Gambar Utama",
        type: "image",
        uploadEndpoint: "/api/admin/departemen/image",
        urlField: "thumbnail_url",
        accept: "image/jpeg,image/png,image/webp",
        help: "JPG, PNG, atau WebP. Maksimal 5 MB.",
      },
      {
        key: "programs",
        label: "Program Pelayanan",
        type: "textarea",
        format: "lines",
        placeholder:
          "Pendalaman Alkitab mingguan\nPelayanan sosial\nKunjungan anggota",
        help: "Tulis satu program per baris.",
      },
      {
        key: "display_order",
        label: "Urutan Tampilan",
        type: "number",
        defaultValue: 0,
        placeholder: "0",
        help: "Angka yang lebih kecil akan tampil lebih dahulu.",
      },
      contentFields.status,
      contentFields.publishedAt,
    ],
  },

  pengurus: {
    section: "pengurus",
    table: "leaders",
    permission: "leaders.manage",
    title: "Pengurus Gereja",
    singular: "Pengurus",
    titleColumn: "name",
    dateColumn: "updated_at",
    softDelete: true,
    searchColumn: "search_text",
    fields: [
      {
        key: "name",
        label: "Nama Lengkap",
        type: "text",
        required: true,
        placeholder: "Contoh: Pdt. Nama Pendeta",
      },
      {
        key: "position",
        label: "Jabatan",
        type: "text",
        required: true,
        placeholder: "Contoh: Pendeta Jemaat",
      },
      {
        key: "period",
        label: "Periode Pelayanan",
        type: "text",
        placeholder: "Contoh: 2026–2028",
      },
      {
        key: "bio",
        label: "Profil Singkat",
        type: "textarea",
        format: "paragraphs",
        placeholder:
          "Tuliskan tanggung jawab atau profil singkat pengurus ini.",
      },
      {
        key: "phone",
        label: "Nomor Kontak",
        type: "text",
        placeholder: "Contoh: 0812-3456-7890",
        help: "Kosongkan bila nomor tidak boleh ditampilkan kepada publik.",
      },
      {
        key: "email",
        label: "Email",
        type: "text",
        placeholder: "nama@contoh.org",
        help: "Kosongkan bila email tidak boleh ditampilkan kepada publik.",
      },
      {
        key: "photo_url",
        label: "URL Foto",
        type: "url",
        hidden: true,
      },
      {
        key: "photo_id",
        label: "Foto Pengurus",
        type: "image",
        uploadEndpoint: "/api/admin/pengurus/photo",
        urlField: "photo_url",
        accept: "image/jpeg,image/png,image/webp",
        help: "Gunakan foto potret JPG, PNG, atau WebP. Maksimal 5 MB.",
      },
      {
        key: "display_order",
        label: "Urutan Tampilan",
        type: "number",
        defaultValue: 0,
        placeholder: "0",
        help: "Angka yang lebih kecil akan tampil lebih dahulu.",
      },
      {
        key: "is_public",
        label: "Tampilkan ke publik",
        type: "checkbox",
        defaultValue: true,
      },
      contentFields.status,
    ],
  },

  galeri: {
    section: "galeri",
    table: "gallery_albums",
    permission: "gallery.manage",
    title: "Galeri",
    singular: "Album",
    titleColumn: "title",
    dateColumn: "event_date",
    softDelete: true,
    slugSource: "title",
    fields: [
      { key: "title", label: "Judul Album", type: "text", required: true },
      { key: "description", label: "Deskripsi", type: "textarea" },
      { key: "event_date", label: "Tanggal Kegiatan", type: "date" },
      { key: "category", label: "Kategori", type: "text" },
      { key: "display_order", label: "Urutan Tampilan", type: "number" },
      contentFields.status,
      contentFields.publishedAt,
    ],
  },

  "permohonan-doa": {
    section: "permohonan-doa",
    table: "prayer_requests",
    permission: "prayers.inbox.read",
    title: "Permohonan Doa",
    singular: "Permohonan",
    titleColumn: "name",
    dateColumn: "created_at",
    readOnly: false,
    createEnabled: false,
    softDelete: true,
    fields: [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "unread", label: "Belum dibaca" },
          { value: "in_prayer", label: "Sedang didoakan" },
          { value: "follow_up", label: "Perlu tindak lanjut" },
          { value: "archived", label: "Diarsipkan" },
        ],
      },
      {
        key: "assigned_to",
        label: "ID Penanggung Jawab",
        type: "uuid",
      },
    ],
  },

  pengunjung: {
    section: "pengunjung",
    table: "visitor_forms",
    permission: "visitors.read",
    title: "Pengunjung Baru",
    singular: "Pengunjung",
    titleColumn: "name",
    dateColumn: "visit_date",
    createEnabled: false,
    softDelete: true,
    fields: [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "new", label: "Baru" },
          { value: "contacted", label: "Sudah dihubungi" },
          { value: "visited", label: "Sudah dikunjungi" },
          { value: "archived", label: "Diarsipkan" },
        ],
      },
      {
        key: "assigned_to",
        label: "ID Penanggung Jawab",
        type: "uuid",
      },
    ],
  },

  pesan: {
    section: "pesan",
    table: "contact_messages",
    permission: "messages.read",
    title: "Pesan Masuk",
    singular: "Pesan",
    titleColumn: "subject",
    dateColumn: "created_at",
    createEnabled: false,
    softDelete: true,
    fields: [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "unread", label: "Belum dibaca" },
          { value: "in_progress", label: "Sedang diproses" },
          { value: "replied", label: "Sudah dibalas" },
          { value: "archived", label: "Diarsipkan" },
        ],
      },
      {
        key: "assigned_to",
        label: "ID Penanggung Jawab",
        type: "uuid",
      },
    ],
  },

  tampilan: {
    section: "tampilan",
    table: "navigation_items",
    permission: "appearance.manage",
    title: "Navigasi Website",
    singular: "Menu",
    titleColumn: "label",
    dateColumn: "updated_at",
    softDelete: false,
    fields: [
      { key: "label", label: "Label", type: "text", required: true },
      { key: "href", label: "Tautan", type: "text", required: true },
      { key: "parent_id", label: "ID Menu Induk", type: "uuid" },
      { key: "position", label: "Urutan", type: "number" },
      {
        key: "is_external",
        label: "Tautan eksternal",
        type: "checkbox",
      },
      activeStatus,
    ],
  },

  pengaturan: {
    section: "pengaturan",
    table: "site_settings",
    permission: "settings.manage",
    title: "Pengaturan Situs",
    singular: "Pengaturan",
    titleColumn: "key",
    dateColumn: "updated_at",
    softDelete: false,
    fields: [
      {
        key: "key",
        label: "Nama Pengaturan",
        type: "text",
        required: true,
      },
      {
        key: "value",
        label: "Nilai",
        type: "textarea",
        format: "setting-value",
        required: true,
        help: "Masukkan teks biasa. Sistem akan menyimpannya dalam format yang sesuai.",
      },
      { key: "description", label: "Deskripsi", type: "textarea" },
      {
        key: "is_public",
        label: "Dapat dibaca publik",
        type: "checkbox",
      },
      activeStatus,
    ],
  },
};

const protectedFields = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "reviewed_by",
  "published_by",
  "review_submitted_at",
  "reviewed_at",
  "deleted_at",
  "view_count",
  "download_count",
]);

export function getAdminResource(section: string) {
  return adminResources[section] ?? null;
}

export function getOptionValue(option: AdminFieldOption) {
  return typeof option === "string" ? option : option.value;
}

export function getOptionLabel(option: AdminFieldOption) {
  return typeof option === "string" ? option : option.label;
}

export function sanitizeResourcePayload(
  section: string,
  payload: Record<string, unknown>,
) {
  const resource = getAdminResource(section);

  if (!resource) {
    return {};
  }

  const allowed = new Set(resource.fields.map((field) => field.key));

  return Object.fromEntries(
    Object.entries(payload).filter(
      ([key]) => allowed.has(key) && !protectedFields.has(key),
    ),
  );
}

function schemaForField(field: AdminField) {
  switch (field.type) {
    case "number": {
      const numberSchema = z.number().finite();

      return z.preprocess(
        (value) =>
          value === "" || value == null || Number.isNaN(value)
            ? undefined
            : Number(value),
        field.required ? numberSchema : numberSchema.optional(),
      );
    }

    case "checkbox":
      return field.required ? z.boolean() : z.boolean().optional();

    case "uuid":
    case "relation":
    case "image": {
      if (field.required) {
        return z.uuid(`${field.label} wajib dipilih`);
      }

      return z
        .union([z.literal(""), z.uuid("ID relasi tidak valid")])
        .transform((value) => value || null)
        .optional();
    }

    case "url": {
      const urlSchema = z
        .union([z.literal(""), z.url("Tautan tidak valid")])
        .transform((value) => value || null);

      return field.required ? urlSchema : urlSchema.optional();
    }

    case "select": {
      const selectSchema = z.string().refine(
        (value) =>
          !field.options ||
          field.options.some((option) => getOptionValue(option) === value),
        "Pilihan tidak valid",
      );

      return field.required ? selectSchema : selectSchema.optional();
    }

    case "datetime-local":
    case "date":
    case "text":
    case "textarea":
    default: {
      const stringSchema = z.string().trim();

      return field.required
        ? stringSchema.min(1, `${field.label} wajib diisi`)
        : stringSchema.optional();
    }
  }
}

export function parseResourcePayload(
  section: string,
  payload: Record<string, unknown>,
  partial = false,
) {
  const resource = getAdminResource(section);

  if (!resource) {
    return {
      success: false as const,
      error: "Resource tidak ditemukan",
    };
  }

  const shape = Object.fromEntries(
    resource.fields.map((field) => [field.key, schemaForField(field)]),
  );
  const baseSchema = z.object(shape);
  const schema = partial ? baseSchema.partial() : baseSchema;

  return schema.safeParse(sanitizeResourcePayload(section, payload));
}
