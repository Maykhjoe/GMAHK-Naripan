import { NotificationCenter } from "@/components/admin/notification-center";

export const metadata = {
  title: "Notifikasi Admin",
};

export default function AdminNotificationsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
          Pusat Notifikasi
        </p>
        <h1 className="mt-2 font-serif text-4xl text-primary">
          Notifikasi Admin
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Pantau pemberitahuan sesuai hak akses akun, cari riwayat, arsipkan
          notifikasi yang sudah selesai, lalu pulihkan atau hapus permanen dari
          tab arsip.
        </p>
      </header>

      <div className="mt-8">
        <NotificationCenter />
      </div>
    </div>
  );
}
