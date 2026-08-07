"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Bell,
  CalendarCheck2,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ADMIN_NOTIFICATIONS_CHANGED_EVENT,
  type AdminNotification,
  formatNotificationTime,
  normalizeNotificationType,
  notificationPageCount,
  notificationTypeLabels,
  notificationTypes,
  type NotificationReadFilter,
  type NotificationStatusFilter,
} from "@/lib/admin/notifications";
import { cn } from "@/lib/utils";

const notificationIcons: Record<string, LucideIcon> = {
  prayer: ShieldCheck,
  visitor: UserRound,
  contact: Mail,
  registration: CalendarCheck2,
  event_reminder: CalendarClock,
  livestream_reminder: Radio,
  system: MessageSquare,
};

type NotificationResponse = {
  data?: AdminNotification[];
  count?: number;
  unread?: number;
  activeCount?: number;
  archivedCount?: number;
  affected?: number;
  message?: string;
};

type NotificationAction = "read" | "unread" | "archive" | "restore";

export function NotificationCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const selectedType = searchParams.get("type") ?? "";
  const selectedRead = (searchParams.get("read") ??
    "all") as NotificationReadFilter;
  const selectedStatus: NotificationStatusFilter =
    searchParams.get("status") === "archived" ? "archived" : "active";
  const selectedQuery = searchParams.get("q")?.trim() ?? "";
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [count, setCount] = useState(0);
  const [unread, setUnread] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  const updateUrl = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }

      if (resetPage && !("page" in updates)) {
        next.delete("page");
      }

      startTransition(() => {
        router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(
    async (silent = false) => {
      if (document.visibilityState === "hidden") {
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: selectedStatus,
      });

      if (selectedType) {
        params.set("type", selectedType);
      }

      if (selectedRead === "read" || selectedRead === "unread") {
        params.set("read", selectedRead);
      }

      if (selectedQuery) {
        params.set("q", selectedQuery);
      }

      try {
        const response = await fetch(`/api/admin/notifications?${params}`, {
          cache: "no-store",
        });
        const result = (await response
          .json()
          .catch(() => ({
            message: "Respons server tidak valid",
          }))) as NotificationResponse;

        if (!response.ok) {
          setItems([]);
          setCount(0);
          setSelectedIds([]);
          setError(result.message ?? "Notifikasi tidak dapat dimuat");
          return;
        }

        const nextItems = result.data ?? [];
        setItems(nextItems);
        setCount(result.count ?? 0);
        setUnread(result.unread ?? 0);
        setActiveCount(result.activeCount ?? 0);
        setArchivedCount(result.archivedCount ?? 0);
        setSelectedIds([]);

        if (page > 1 && nextItems.length === 0 && (result.count ?? 0) > 0) {
          updateUrl({ page: String(page - 1) }, false);
        }
      } catch {
        setItems([]);
        setCount(0);
        setSelectedIds([]);
        setError("Tidak dapat terhubung ke layanan notifikasi");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      page,
      selectedQuery,
      selectedRead,
      selectedStatus,
      selectedType,
      updateUrl,
    ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(true), 30_000);
    const handleChange = () => void load(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };

    window.addEventListener(ADMIN_NOTIFICATIONS_CHANGED_EVENT, handleChange);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener(
        ADMIN_NOTIFICATIONS_CHANGED_EVENT,
        handleChange,
      );
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  async function mutate(
    action: NotificationAction,
    target?: string | string[],
  ) {
    const targetIds = Array.isArray(target)
      ? target
      : target
        ? [target]
        : [];
    const busyKey =
      targetIds.length > 1 ? "bulk" : targetIds[0] ? targetIds[0] : "all";

    setBusyId(busyKey);
    setError(null);

    const response = await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        targetIds.length > 1
          ? { ids: targetIds, action }
          : targetIds.length === 1
            ? { id: targetIds[0], action }
            : { all: true, action: "read" },
      ),
    });
    const result = (await response
      .json()
      .catch(() => ({
        message: "Respons server tidak valid",
      }))) as NotificationResponse;

    if (!response.ok) {
      setError(result.message ?? "Notifikasi tidak dapat diperbarui");
      setBusyId(null);
      return;
    }

    setUnread(result.unread ?? 0);
    setActiveCount(result.activeCount ?? 0);
    setArchivedCount(result.archivedCount ?? 0);
    setSelectedIds([]);
    setBusyId(null);
    window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED_EVENT));
  }

  async function deletePermanently(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      ids.length === 1
        ? "Hapus notifikasi ini secara permanen? Tindakan ini tidak dapat dibatalkan."
        : `Hapus ${ids.length} notifikasi secara permanen? Tindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyId(ids.length > 1 ? "bulk" : ids[0]);
    setError(null);

    const response = await fetch("/api/admin/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, confirm: true }),
    });
    const result = (await response
      .json()
      .catch(() => ({
        message: "Respons server tidak valid",
      }))) as NotificationResponse;

    if (!response.ok) {
      setError(result.message ?? "Notifikasi tidak dapat dihapus permanen");
      setBusyId(null);
      return;
    }

    setUnread(result.unread ?? 0);
    setActiveCount(result.activeCount ?? 0);
    setArchivedCount(result.archivedCount ?? 0);
    setSelectedIds([]);
    setBusyId(null);
    window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED_EVENT));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  function toggleCurrentPage() {
    const allSelected =
      items.length > 0 && items.every((item) => selectedIds.includes(item.id));
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  }

  const pageCount = notificationPageCount(count, pageSize);
  const readFilter =
    selectedRead === "read" || selectedRead === "unread"
      ? selectedRead
      : "all";
  const allCurrentSelected =
    items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const hasFilters = Boolean(
    selectedType || selectedQuery || readFilter !== "all",
  );

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => updateUrl({ status: null })}
          aria-current={selectedStatus === "active" ? "page" : undefined}
          className={cn(
            "flex items-center justify-between rounded-2xl border p-5 text-left transition",
            selectedStatus === "active"
              ? "border-gold/50 bg-[#fffdf7] shadow-[0_8px_30px_rgba(38,53,43,.05)]"
              : "border-primary/10 bg-white hover:border-primary/20",
          )}
        >
          <span>
            <span className="flex items-center gap-2 font-semibold text-primary">
              <Inbox className="size-4" /> Aktif
            </span>
            <span className="mt-1 block text-xs text-muted">
              Notifikasi yang masih digunakan
            </span>
          </span>
          <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-white">
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => updateUrl({ status: "archived" })}
          aria-current={selectedStatus === "archived" ? "page" : undefined}
          className={cn(
            "flex items-center justify-between rounded-2xl border p-5 text-left transition",
            selectedStatus === "archived"
              ? "border-gold/50 bg-[#fffdf7] shadow-[0_8px_30px_rgba(38,53,43,.05)]"
              : "border-primary/10 bg-white hover:border-primary/20",
          )}
        >
          <span>
            <span className="flex items-center gap-2 font-semibold text-primary">
              <Archive className="size-4" /> Diarsipkan
            </span>
            <span className="mt-1 block text-xs text-muted">
              Dapat dipulihkan atau dihapus
            </span>
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {archivedCount}
          </span>
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-primary/10 bg-white p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-sm text-muted">
            {count} notifikasi pada filter ini
            {selectedStatus === "active" ? ` · ${unread} belum dibaca` : ""}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <form
              className="flex min-w-0 gap-2 sm:min-w-80"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const q = String(data.get("q") ?? "").trim();
                updateUrl({ q: q || null });
              }}
            >
              <Input
                key={selectedQuery}
                name="q"
                defaultValue={selectedQuery}
                placeholder="Cari judul atau isi notifikasi…"
                aria-label="Cari notifikasi"
                className="h-11 min-w-0"
              />
              <Button
                type="submit"
                variant="secondary"
                size="icon"
                aria-label="Cari"
              >
                <Search className="size-4" />
              </Button>
            </form>

            <select
              aria-label="Filter jenis notifikasi"
              value={selectedType}
              onChange={(event) =>
                updateUrl({ type: event.target.value || null })
              }
              className="h-11 rounded-xl border border-primary/15 bg-white px-4 text-sm text-primary"
            >
              <option value="">Semua jenis</option>
              {notificationTypes.map((type) => (
                <option key={type} value={type}>
                  {notificationTypeLabels[type]}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter status baca"
              value={readFilter}
              onChange={(event) =>
                updateUrl({
                  read:
                    event.target.value === "all" ? null : event.target.value,
                })
              }
              className="h-11 rounded-xl border border-primary/15 bg-white px-4 text-sm text-primary"
            >
              <option value="all">Semua status baca</option>
              <option value="unread">Belum dibaca</option>
              <option value="read">Sudah dibaca</option>
            </select>

            {hasFilters && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => updateUrl({ q: null, type: null, read: null })}
              >
                <X className="size-4" /> Reset
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => void load(true)}
              disabled={refreshing}
              aria-label="Muat ulang notifikasi"
            >
              <RefreshCw
                className={cn("size-4", refreshing && "animate-spin")}
              />
            </Button>

            {selectedStatus === "active" && unread > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void mutate("read")}
                disabled={busyId === "all"}
              >
                {busyId === "all" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCheck className="size-4" />
                )}
                Tandai semua dibaca
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-primary">
            <input
              type="checkbox"
              checked={allCurrentSelected}
              onChange={toggleCurrentPage}
              className="size-4 rounded border-primary/20 accent-[var(--color-primary)]"
            />
            Pilih halaman ini
          </label>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold text-muted">
                {selectedIds.length} dipilih
              </span>
              {selectedStatus === "active" ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void mutate("read", selectedIds)}
                    disabled={busyId === "bulk"}
                  >
                    <CheckCheck className="size-4" /> Tandai dibaca
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void mutate("archive", selectedIds)}
                    disabled={busyId === "bulk"}
                  >
                    {busyId === "bulk" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Archive className="size-4" />
                    )}
                    Arsipkan
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void mutate("restore", selectedIds)}
                    disabled={busyId === "bulk"}
                  >
                    {busyId === "bulk" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArchiveRestore className="size-4" />
                    )}
                    Pulihkan
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void deletePermanently(selectedIds)}
                    disabled={busyId === "bulk"}
                    className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" /> Hapus permanen
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 space-y-3" aria-busy={loading || refreshing}>
        {loading ? (
          <div className="rounded-2xl border border-primary/10 bg-white px-6 py-20 text-center text-muted">
            <Loader2 className="mx-auto mb-3 size-6 animate-spin" />
            Memuat notifikasi…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-primary/10 bg-white px-6 py-20 text-center">
            {selectedStatus === "archived" ? (
              <Archive className="mx-auto size-8 text-primary/20" />
            ) : (
              <Bell className="mx-auto size-8 text-primary/20" />
            )}
            <h2 className="mt-4 font-serif text-2xl text-primary">
              {selectedStatus === "archived"
                ? "Arsip masih kosong"
                : "Tidak ada notifikasi"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {hasFilters
                ? "Belum ada data yang sesuai dengan filter saat ini."
                : selectedStatus === "archived"
                  ? "Notifikasi yang Anda arsipkan akan muncul di sini."
                  : "Notifikasi baru akan muncul secara otomatis."}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const type = normalizeNotificationType(item.type);
            const Icon = notificationIcons[type] ?? Bell;
            const isBusy = busyId === item.id;
            const isSelected = selectedIds.includes(item.id);

            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-2xl border bg-white p-5 transition",
                  isSelected && "ring-2 ring-gold/40",
                  item.read_at || selectedStatus === "archived"
                    ? "border-primary/8"
                    : "border-gold/45 bg-[#fffdf7] shadow-[0_8px_30px_rgba(38,53,43,.05)]",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <label className="flex shrink-0 cursor-pointer items-center gap-3 sm:block">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(item.id)}
                      aria-label={`Pilih notifikasi ${item.title}`}
                      className="size-4 rounded border-primary/20 accent-[var(--color-primary)] sm:mb-3 sm:block"
                    />
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-xl",
                        item.read_at
                          ? "bg-primary/5 text-muted"
                          : "bg-gold/20 text-primary",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                  </label>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-primary">
                        {item.title}
                      </h2>
                      <Badge
                        className={
                          item.read_at
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-100 text-amber-900"
                        }
                      >
                        {item.read_at ? "Sudah dibaca" : "Baru"}
                      </Badge>
                      {selectedStatus === "archived" && (
                        <Badge className="bg-primary/10 text-primary">
                          Diarsipkan
                        </Badge>
                      )}
                      <Badge className="bg-cream text-secondary">
                        {notificationTypeLabels[type]}
                      </Badge>
                    </div>

                    {item.body && (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                        {item.body}
                      </p>
                    )}

                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-secondary/75">
                      {formatNotificationTime(item.created_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {item.link_url && (
                      <Button asChild variant="dark" className="min-h-10 px-4">
                        <Link
                          href={item.link_url}
                          onClick={() => {
                            if (!item.read_at && selectedStatus === "active") {
                              void mutate("read", item.id);
                            }
                          }}
                        >
                          <ExternalLink className="size-4" /> Buka
                        </Link>
                      </Button>
                    )}

                    {selectedStatus === "active" ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() =>
                            void mutate(
                              item.read_at ? "unread" : "read",
                              item.id,
                            )
                          }
                          disabled={isBusy}
                          aria-label={
                            item.read_at
                              ? "Tandai belum dibaca"
                              : "Tandai sudah dibaca"
                          }
                          title={
                            item.read_at
                              ? "Tandai belum dibaca"
                              : "Tandai sudah dibaca"
                          }
                        >
                          {isBusy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : item.read_at ? (
                            <Bell className="size-4" />
                          ) : (
                            <Check className="size-4" />
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => void mutate("archive", item.id)}
                          disabled={isBusy}
                          aria-label="Arsipkan notifikasi"
                          title="Arsipkan notifikasi"
                        >
                          <Archive className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void mutate("restore", item.id)}
                          disabled={isBusy}
                          className="min-h-10 px-4"
                        >
                          {isBusy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ArchiveRestore className="size-4" />
                          )}
                          Pulihkan
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => void deletePermanently([item.id])}
                          disabled={isBusy}
                          aria-label="Hapus notifikasi secara permanen"
                          title="Hapus permanen"
                          className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white px-5 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            Halaman {Math.min(page, pageCount)} dari {pageCount}
          </span>
          <nav aria-label="Paginasi notifikasi" className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={page <= 1 || loading || isNavigating}
              onClick={() =>
                updateUrl(
                  { page: page - 1 === 1 ? null : String(page - 1) },
                  false,
                )
              }
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={page >= pageCount || loading || isNavigating}
              onClick={() => updateUrl({ page: String(page + 1) }, false)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        </div>
      )}

      {selectedStatus === "archived" && archivedCount > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/10 bg-cream/60 px-5 py-4 text-xs leading-5 text-muted">
          <RotateCcw className="mt-0.5 size-4 shrink-0 text-secondary" />
          <p>
            Notifikasi arsip dapat dipulihkan kapan saja. Hapus permanen akan
            membersihkan isi dan tautan notifikasi, lalu menyimpan penanda
            teknis minimum agar pengingat yang sama tidak muncul kembali.
          </p>
        </div>
      )}
    </div>
  );
}
