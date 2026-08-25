import { notFound, redirect } from "next/navigation";

import { DataTable } from "@/components/admin/data-table";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { MediaManager } from "@/components/admin/media-manager";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { SubmissionInbox } from "@/components/admin/submission-inbox";
import { UserManager } from "@/components/admin/user-manager";
import { getAdminResource } from "@/lib/admin/resources";
import type { SubmissionKind } from "@/lib/admin/submissions";
import type { Permission } from "@/lib/permissions/rbac";
import { createClient } from "@/lib/supabase/server";

const sections: Record<string, { title: string; description: string }> = {
  jadwal: {
    title: "Ibadah Khusus",
    description:
      "Kelola KKR, Pekan Doa, ibadah Tahun Baru, dan agenda khusus lainnya. Jadwal rutin tetap dikelola di sistem.",
  },
  kegiatan: {
    title: "Kegiatan",
    description: "Kelola kegiatan, kuota, rundown, dan publikasi.",
  },
  pendaftaran: {
    title: "Pendaftaran Kegiatan",
    description:
      "Konfirmasi peserta, catat kehadiran, dan tindak lanjuti pendaftaran kegiatan.",
  },
  khotbah: {
    title: "Khotbah",
    description:
      "Kelola video, audio, materi PDF, pembicara, dan kategori khotbah.",
  },
  live: {
    title: "Live Streaming",
    description:
      "Atur judul, pembicara, ayat, jadwal, YouTube, Zoom, thumbnail, dan status siaran.",
  },
  berita: {
    title: "Berita & Renungan",
    description:
      "Tulis artikel, simpan draft, jadwalkan publikasi, dan kelola SEO.",
  },
  departemen: {
    title: "Departemen",
    description:
      "Kelola profil, koordinator, program, jadwal, dan kontak pelayanan.",
  },
  pengurus: {
    title: "Pengurus Gereja",
    description:
      "Kelola nama, jabatan, periode pelayanan, foto, kontak publik, urutan, dan status pengurus.",
  },
  galeri: {
    title: "Galeri",
    description:
      "Kelola album, unggah gambar, keterangan, urutan, dan visibilitas.",
  },
  "permohonan-doa": {
    title: "Permohonan Doa",
    description:
      "Data privat. Akses rutin hanya untuk Tim Pendoa Jemaat atau Pendeta/Gembala Jemaat sesuai pilihan pemohon.",
  },
  pengunjung: {
    title: "Pengunjung Baru",
    description:
      "Tindak lanjuti rencana kunjungan dengan tetap menjaga privasi data.",
  },
  pesan: {
    title: "Pesan Masuk",
    description:
      "Baca, tindak lanjuti, dan arsipkan pesan yang dikirim melalui website.",
  },
  file: {
    title: "Media & Dokumen",
    description:
      "Kelola pustaka gambar dan dokumen yang digunakan oleh website melalui penyimpanan terpusat.",
  },
  pengguna: {
    title: "Pengguna",
    description:
      "Kelola akun admin, role, status, dan akses sesuai prinsip least privilege.",
  },
  pengaturan: {
    title: "Pengaturan",
    description:
      "Kelola profil gereja, integrasi, SEO, sosial media, dan keamanan.",
  },
};

const superAdminSections = new Set(["pengguna", "pengaturan"]);

const specialPermissions: Partial<Record<string, Permission>> = {
  file: "files.manage",
  pengguna: "users.manage",
  pendaftaran: "events.manage",
};

const submissionSections: Partial<Record<string, SubmissionKind>> = {
  "permohonan-doa": "prayer",
  pengunjung: "visitor",
  pesan: "contact",
  pendaftaran: "registration",
};

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const config = sections[section];

  if (!config) {
    notFound();
  }

  const resource = getAdminResource(section);
  const submissionKind = submissionSections[section];
  const permission = resource?.permission ?? specialPermissions[section];
  const supabase = await createClient();

  if (supabase && superAdminSections.has(section)) {
    const { data: isSuperAdmin, error } = await supabase.rpc(
      "has_active_role",
      { target_role_code: "super_admin" },
    );

    if (error || !isSuperAdmin) {
      redirect("/auth/unauthorized");
    }
  } else if (supabase && permission) {
    const { data: allowed, error } = await supabase.rpc("has_permission", {
      permission_code: permission,
    });

    if (error || !allowed) {
      redirect("/auth/unauthorized");
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
          Manajemen Konten
        </p>
        <h1 className="mt-2 font-serif text-4xl text-primary">
          {config.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {config.description}
        </p>
      </header>

      <div className="mt-8">
        {section === "pengaturan" ? (
          <SiteSettingsForm />
        ) : submissionKind ? (
          <SubmissionInbox kind={submissionKind} />
        ) : section === "galeri" && resource ? (
          <GalleryManager resource={resource} />
        ) : resource ? (
          <DataTable resource={resource} />
        ) : section === "file" ? (
          <MediaManager />
        ) : section === "pengguna" ? (
          <UserManager />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Modul khusus ini sedang disambungkan pada tahap integrasi berikutnya.
            Tidak ada tindakan palsu yang dijalankan.
          </div>
        )}
      </div>

      {resource && section !== "pengaturan" && !submissionKind && (
        <p className="mt-5 text-xs leading-5 text-muted">
          Semua perubahan divalidasi di server, dibatasi oleh permission modul,
          dan dicatat melalui trigger audit database.
        </p>
      )}
    </div>
  );
}
