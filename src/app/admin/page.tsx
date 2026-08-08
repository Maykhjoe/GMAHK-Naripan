import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  FileText,
  LineChart,
  Mail,
  MessageSquare,
  Plus,
  UserRound,
  UsersRound,
  Video,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  canAccess,
  resolveHighestRole,
  type AdminRole,
  type Permission,
} from "@/lib/permissions/rbac";
import { createClient } from "@/lib/supabase/server";

type AdminContextRow = {
  role_codes?: string[] | null;
  ministry_ids?: string[] | null;
  is_active?: boolean | null;
};

function firstContextRow(value: unknown): AdminContextRow | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as AdminContextRow) : null;
  }

  return value && typeof value === "object" ? (value as AdminContextRow) : null;
}

type Metric = {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  permission?: Permission;
};

function jakartaDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

const EMPTY_SCOPE_UUID = "00000000-0000-0000-0000-000000000000";

export default async function AdminDashboard() {
  const supabase = await createClient();
  let role: AdminRole = "super_admin";
  let ministryIds: string[] = [];
  let metrics: Metric[] = [];
  let events: { id: string; title: string; starts_at: string }[] = [];
  let logs: {
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
  }[] = [];

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: contextData } = await supabase.rpc("get_my_admin_context");
      const context = firstContextRow(contextData);

      role = resolveHighestRole(context?.role_codes ?? []) ?? role;
      ministryIds = context?.ministry_ids ?? [];
    }

    const departmentScope =
      role === "department_admin"
        ? ministryIds.length > 0
          ? ministryIds
          : [EMPTY_SCOPE_UUID]
        : null;

    let eventCountQuery = supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (departmentScope) {
      eventCountQuery = eventCountQuery.in("ministry_id", departmentScope);
    }

    let registrationCountQuery = supabase
      .from("event_registrations")
      .select("id,event:events!inner(ministry_id)", { count: "exact", head: true })
      .eq("status", "registered");

    if (departmentScope) {
      registrationCountQuery = registrationCountQuery.in(
        "event.ministry_id",
        departmentScope,
      );
    }

    const [
      posts,
      pendingReviews,
      eventCount,
      sermons,
      visitors,
      messages,
      registrations,
    ] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_review")
          .is("deleted_at", null),
        eventCountQuery,
        supabase
          .from("sermons")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabase
          .from("visitor_forms")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
          .is("deleted_at", null),
        supabase
          .from("contact_messages")
          .select("id", { count: "exact", head: true })
          .eq("status", "unread")
          .is("deleted_at", null),
        registrationCountQuery,
      ]);

    const candidateMetrics: Metric[] = [
      {
        label: "Total Artikel",
        value: posts.count ?? 0,
        icon: FileText,
        href: "/admin/berita",
        permission: "posts.manage",
      },
      {
        label: "Menunggu Peninjauan",
        value: pendingReviews.count ?? 0,
        icon: CheckCircle2,
        href: "/admin/berita?status=pending_review",
        permission: "posts.manage",
      },
      {
        label: "Total Kegiatan",
        value: eventCount.count ?? 0,
        icon: CalendarCheck,
        href: "/admin/kegiatan",
        permission: "events.manage",
      },
      {
        label: "Total Khotbah",
        value: sermons.count ?? 0,
        icon: Video,
        href: "/admin/khotbah",
        permission: "sermons.manage",
      },
      {
        label: "Pengunjung Baru",
        value: visitors.count ?? 0,
        icon: UserRound,
        href: "/admin/pengunjung",
        permission: "visitors.read",
      },
      {
        label: "Pesan Baru",
        value: messages.count ?? 0,
        icon: Mail,
        href: "/admin/pesan",
        permission: "messages.read",
      },
      {
        label: "Pendaftaran Baru",
        value: registrations.count ?? 0,
        icon: UsersRound,
        href: "/admin/pendaftaran",
        permission: "events.manage",
      },
    ];

    metrics = candidateMetrics.filter(
      (metric) => !metric.permission || canAccess(role, metric.permission),
    );

    if (role === "super_admin") {
      const { data } = await supabase.rpc("get_prayer_service_monitoring");
      const summary = Array.isArray(data) ? data[0] : data;

      metrics.splice(1, 0, {
        label: "Doa Lewat 24 Jam",
        value: Number(summary?.overdue_count ?? 0),
        icon: LineChart,
        href: "/admin/monitoring",
      });
    } else if (canAccess(role, "prayers.inbox.read")) {
      const prayers = await supabase
        .from("prayer_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "unread")
        .is("deleted_at", null);

      metrics.splice(1, 0, {
        label: "Doa Baru",
        value: prayers.count ?? 0,
        icon: MessageSquare,
        href: "/admin/permohonan-doa",
      });
    }

    if (canAccess(role, "events.manage")) {
      let upcomingQuery = supabase
        .from("events")
        .select("id,title,starts_at")
        .gte("starts_at", new Date().toISOString())
        .is("deleted_at", null);

      if (departmentScope) {
        upcomingQuery = upcomingQuery.in("ministry_id", departmentScope);
      }

      const upcoming = await upcomingQuery.order("starts_at").limit(3);
      events = upcoming.data ?? [];
    }

    if (role === "super_admin") {
      const audit = await supabase
        .from("audit_logs")
        .select("id,action,entity_type,created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      logs = audit.data ?? [];
    }
  } else {
    metrics = [
      { label: "Total Artikel", value: 0, icon: FileText, href: "/admin/berita" },
      {
        label: "Doa Lewat 24 Jam",
        value: 0,
        icon: LineChart,
        href: "/admin/monitoring",
      },
      {
        label: "Total Kegiatan",
        value: 0,
        icon: CalendarCheck,
        href: "/admin/kegiatan",
      },
      { label: "Total Khotbah", value: 0, icon: Video, href: "/admin/khotbah" },
    ];
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
            Dashboard
          </p>
          <h1 className="mt-2 font-serif text-4xl text-primary">
            Selamat datang kembali.
          </h1>
          <p className="mt-2 text-sm text-muted">
            Ringkasan konten, formulir publik, dan tindak lanjut terbaru.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/berita">
            <Plus className="size-4" />
            Buat Konten
          </Link>
        </Button>
      </header>

      {!supabase && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <strong>Mode demo:</strong> Supabase belum dikonfigurasi; metrik
          ditampilkan sebagai nol dan tindakan simpan dinonaktifkan.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-primary/8 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-cream text-secondary">
              <Icon className="size-5" />
            </span>
            <p className="mt-6 font-serif text-4xl text-primary">{value}</p>
            <p className="mt-2 text-sm text-muted">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-primary/8 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-primary">
              Kegiatan mendatang
            </h2>
            {canAccess(role, "events.manage") && (
              <Link
                href="/admin/kegiatan"
                className="text-sm font-semibold text-secondary"
              >
                Lihat semua
              </Link>
            )}
          </div>
          <div className="mt-6 divide-y divide-primary/8">
            {events.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                Belum ada kegiatan mendatang yang dapat dikelola.
              </p>
            ) : (
              events.map((event) => (
                <Link
                  key={event.id}
                  href="/admin/kegiatan"
                  className="flex items-center gap-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-primary">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {jakartaDate(event.starts_at)} WIB
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-primary/8 bg-white p-6">
          <h2 className="font-serif text-2xl text-primary">
            {role === "super_admin" ? "Aktivitas terbaru" : "Akses konten"}
          </h2>
          <div className="mt-6 space-y-4">
            {role !== "super_admin" ? (
              <div className="rounded-xl bg-cream p-5 text-sm leading-6 text-muted">
                Semua role dapat membuat berita dan artikel. Kontributor mengelola
                artikel miliknya sendiri, sedangkan reviewer dapat memeriksa dan
                menerbitkan artikel yang dikirim untuk peninjauan.
              </div>
            ) : logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                Belum ada aktivitas tercatat.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-l-2 border-gold pl-4">
                  <p className="text-sm font-semibold capitalize text-primary">
                    {log.action} · {log.entity_type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {jakartaDate(log.created_at)} WIB
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
