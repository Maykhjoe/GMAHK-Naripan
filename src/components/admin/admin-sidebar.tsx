"use client";

import { m, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BellRing,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  FileText,
  GalleryHorizontalEnd,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  MessageSquare,
  Radio,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { NotificationMenu } from "@/components/admin/notification-menu";
import { Logo } from "@/components/layout/logo";
import {
  getAllowedAdminMenu,
  type AdminRole,
} from "@/lib/permissions/rbac";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/monitoring": LineChart,
  "/admin/notifikasi": BellRing,
  "/admin/jadwal": CalendarDays,
  "/admin/kegiatan": Activity,
  "/admin/pendaftaran": CalendarCheck2,
  "/admin/khotbah": Video,
  "/admin/live": Radio,
  "/admin/berita": FileText,
  "/admin/departemen": Users,
  "/admin/pengurus": Users,
  "/admin/galeri": GalleryHorizontalEnd,
  "/admin/permohonan-doa": ShieldCheck,
  "/admin/pengunjung": Users,
  "/admin/pesan": MessageSquare,
  "/admin/file": FileText,
  "/admin/pengguna": Users,
  "/admin/tampilan": Settings,
  "/admin/pengaturan": Settings,
  "/admin/audit-log": ScrollText,
  "/admin/keamanan": ShieldCheck,
};

export function AdminSidebar({ role = "super_admin" }: { role?: AdminRole }) {
  const path = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const menus = getAllowedAdminMenu(role);

  async function logout() {
    try {
      await createClient().auth.signOut();
    } catch {}

    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 grid size-11 place-items-center rounded-full bg-primary text-white lg:hidden"
        aria-label="Buka sidebar"
      >
        <Menu />
      </button>

      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Tutup sidebar"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primary text-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Logo light />
          <div className="flex items-center gap-1">
            <NotificationMenu />
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden"
              aria-label="Tutup"
            >
              <X />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            Administrasi
          </p>
          <nav className="space-y-1">
            {menus.map((item) => {
              const Icon = iconMap[item.href] ?? FileText;
              const active = path === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm text-white/65 transition hover:bg-white/8 hover:text-white",
                    active && "text-primary hover:text-primary",
                  )}
                >
                  {active && !reduce && (
                    <m.span
                      layoutId="admin-active-menu"
                      className="absolute inset-0 bg-gold"
                      transition={{ type: "spring", stiffness: 420, damping: 38 }}
                    />
                  )}
                  {active && reduce && (
                    <span className="absolute inset-0 bg-gold" />
                  )}
                  <span className="relative flex items-center gap-3">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/65 hover:bg-white/8"
          >
            <ChevronLeft className="size-4" />
            Lihat Website
          </Link>
          <button
            onClick={logout}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/65 hover:bg-white/8"
          >
            <LogOut className="size-4" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
