import { redirect } from "next/navigation";

import { PrayerMonitoring } from "@/components/admin/prayer-monitoring";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Monitoring Pelayanan",
};

export default async function MonitoringPage() {
  const supabase = await createClient();

  if (supabase) {
    const { data: allowed, error } = await supabase.rpc("has_permission", {
      permission_code: "monitoring.read",
    });

    if (error || !allowed) {
      redirect("/auth/unauthorized");
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
          Pengawasan Sistem
        </p>
        <h1 className="mt-2 font-serif text-4xl text-primary">
          Monitoring Pelayanan
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Pantau jumlah, tujuan, status, dan kecepatan tindak lanjut tanpa
          menampilkan isi permohonan doa secara rutin.
        </p>
      </header>

      <div className="mt-8">
        <PrayerMonitoring />
      </div>
    </div>
  );
}
