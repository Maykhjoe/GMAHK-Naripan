import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { MotionProvider } from "@/components/motion/motion-provider";
import { resolveHighestRole, type AdminRole } from "@/lib/permissions/rbac";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: {
    default: "Dashboard Admin",
    template: "%s | Admin GMAHK Naripan",
  },
  robots: { index: false, follow: false },
};

type AdminContextRow = {
  role_codes?: string[] | null;
  is_active?: boolean | null;
};

function firstContextRow(value: unknown): AdminContextRow | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as AdminContextRow) : null;
  }

  return value && typeof value === "object" ? (value as AdminContextRow) : null;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  let role: AdminRole = "super_admin";

  if (!supabase && process.env.NODE_ENV === "production") {
    redirect("/");
  }

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/auth/login");
    }

    const { data, error } = await supabase.rpc("get_my_admin_context");
    const context = firstContextRow(data);

    if (error || !context || context.is_active !== true) {
      redirect("/auth/unauthorized");
    }

    const assignedRole = resolveHighestRole(context.role_codes ?? []);

    if (!assignedRole) {
      redirect("/auth/unauthorized");
    }

    role = assignedRole;
  }

  return (
    <MotionProvider>
      <div className="min-h-screen bg-[#f3f4f1]">
      <AdminSidebar role={role} />
      <main className="min-h-screen p-5 pt-20 lg:ml-72 lg:p-8 lg:pt-8">
        {children}
      </main>
      </div>
    </MotionProvider>
  );
}
