import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  resolveHighestRole,
  type AdminRole,
} from "@/lib/permissions/rbac";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: {
    default: "Dashboard Admin",
    template: "%s | Admin GMAHK Naripan",
  },
  robots: { index: false, follow: false },
};

type RoleRelation = {
  roles:
    | { code?: string; status?: string }
    | { code?: string; status?: string }[]
    | null;
};

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

    if (!user) redirect("/auth/login");

    const { data } = await supabase
      .from("user_roles")
      .select("roles(code,status)")
      .eq("user_id", user.id);

    const codes = ((data ?? []) as RoleRelation[])
      .flatMap((item) =>
        Array.isArray(item.roles)
          ? item.roles
          : item.roles
            ? [item.roles]
            : [],
      )
      .filter((item) => item.status === "active")
      .map((item) => item.code)
      .filter((code): code is string => Boolean(code));

    const assignedRole = resolveHighestRole(codes);

    if (!assignedRole) redirect("/auth/unauthorized");
    role = assignedRole;
  }

  return (
    <div className="min-h-screen bg-[#f3f4f1]">
      <AdminSidebar role={role} />
      <main className="min-h-screen p-5 pt-20 lg:ml-72 lg:p-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
