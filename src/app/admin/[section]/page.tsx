import { notFound, redirect } from "next/navigation";
import { DataTable } from "@/components/admin/data-table";
import { MediaManager } from "@/components/admin/media-manager";
import { UserManager } from "@/components/admin/user-manager";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { getAdminResource } from "@/lib/admin/resources";
import { createClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/permissions/rbac";

const sections: Record<string, { title: string; description: string }> = {
  jadwal: { title: "Ibadah Khusus", description: "Kelola KKR, Pekan Doa, ibadah Tahun Baru, dan agenda khusus lainnya. Jadwal rutin tetap dikelola di sistem." },
  kegiatan: { title: "Kegiatan", description: "Kelola kegiatan, pendaftaran, kuota, rundown, dan publikasi." },
  khotbah: { title: "Khotbah", description: "Kelola video, audio, materi PDF, pembicara, dan kategori khotbah." },
  live: { title: "Live Streaming", description: "Atur status live, tema, jadwal, YouTube, Zoom, dan rekaman." },
  berita: { title: "Berita & Renungan", description: "Tulis artikel, simpan draft, jadwalkan publikasi, dan kelola SEO." },
  departemen: { title: "Departemen", description: "Kelola profil, koordinator, program, jadwal, dan kontak pelayanan." },
  pengurus: { title: "Pengurus", description: "Kelola struktur dan data pengurus yang telah disetujui untuk dipublikasi." },
  galeri: { title: "Galeri", description: "Kelola album, unggah gambar, keterangan, urutan, dan visibilitas." },
  "permohonan-doa": { title: "Permohonan Doa", description: "Data privat. Akses dibatasi untuk tim pastoral yang berwenang." },
  pengunjung: { title: "Pengunjung Baru", description: "Tindak lanjuti rencana kunjungan dengan tetap menjaga privasi data." },
  pesan: { title: "Pesan Masuk", description: "Baca, tetapkan penanggung jawab, dan arsipkan pesan dari website." },
  file: { title: "File & Download", description: "Kelola gambar, dokumen PDF, metadata, dan penggunaan penyimpanan." },
  pengguna: { title: "Pengguna", description: "Kelola akun admin, role, status, dan akses sesuai prinsip least privilege." },
  tampilan: { title: "Tampilan Website", description: "Atur hero, logo, navigasi, warna, dan konten unggulan." },
  pengaturan: { title: "Pengaturan", description: "Kelola profil gereja, integrasi, SEO, sosial media, dan keamanan." },
};
const specialPermissions: Partial<Record<string, Permission>> = { file: "files.manage", pengguna: "users.manage" };

export function generateStaticParams() { return Object.keys(sections).map((section) => ({ section })); }

export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = sections[section];
  if (!config) notFound();
  const resource = getAdminResource(section);
  const permission = resource?.permission ?? specialPermissions[section];
  const supabase = await createClient();
  if (supabase && permission) {
    const { data: allowed, error } = await supabase.rpc("has_permission", { permission_code: permission });
    if (error || !allowed) redirect("/auth/unauthorized");
  }
  return <div className="mx-auto max-w-7xl">
    <header><p className="text-xs font-bold uppercase tracking-[.16em] text-secondary">Manajemen Konten</p><h1 className="mt-2 font-serif text-4xl text-primary">{config.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{config.description}</p></header>
    <div className="mt-8">{section === "pengaturan" ? <SiteSettingsForm /> : resource ? <DataTable resource={resource} /> : section === "file" ? <MediaManager /> : section === "pengguna" ? <UserManager /> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Modul khusus ini sedang disambungkan pada tahap integrasi berikutnya. Tidak ada tindakan palsu yang dijalankan.</div>}</div>
    {resource && section !== "pengaturan" && <p className="mt-5 text-xs leading-5 text-muted">Semua perubahan divalidasi di server, dibatasi oleh permission modul, dan dicatat melalui trigger audit database.</p>}
  </div>;
}
