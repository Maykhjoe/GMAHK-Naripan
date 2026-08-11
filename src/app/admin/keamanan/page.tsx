import { redirect } from "next/navigation";

import { SecurityDashboard } from "@/components/admin/security-dashboard";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Keamanan",
};

export default async function SecurityPage() {
  const supabase = await createClient();

  if (supabase) {
    const { data: isSuperAdmin, error } = await supabase.rpc(
      "has_active_role",
      { target_role_code: "super_admin" },
    );

    if (error || !isSuperAdmin) {
      redirect("/auth/unauthorized");
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
          Security Center
        </p>
        <h1 className="mt-2 font-serif text-4xl text-primary">
          Dashboard Keamanan
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Ringkasan RLS, role, privilege database, privasi permohonan doa,
          Storage, audit, dan konfigurasi runtime. Halaman ini hanya tersedia
          untuk Super Admin.
        </p>
      </header>
      <div className="mt-8">
        <SecurityDashboard />
      </div>
    </div>
  );
}
