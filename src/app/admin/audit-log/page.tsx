import { redirect } from "next/navigation";

import { AuditLogViewer } from "@/components/admin/audit-log-viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Audit Log",
};

export default async function AuditLogPage() {
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
          Keamanan & Kepatuhan
        </p>
        <h1 className="mt-2 font-serif text-4xl text-primary">Audit Log & Retensi Data</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Tinjau perubahan penting pada sistem dan jalankan kebijakan retensi data secara terkontrol. Halaman ini hanya tersedia untuk Super Admin.
        </p>
      </header>
      <div className="mt-8">
        <AuditLogViewer />
      </div>
    </div>
  );
}
