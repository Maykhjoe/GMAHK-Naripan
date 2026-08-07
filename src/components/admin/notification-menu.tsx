"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  CalendarCheck2,
  CalendarClock,
  CheckCheck,
  Mail,
  MessageSquare,
  Radio,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  ADMIN_NOTIFICATIONS_CHANGED_EVENT,
  type AdminNotification,
  formatNotificationTime,
  normalizeNotificationType,
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

export function NotificationMenu() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (document.visibilityState === "hidden") {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/notifications?page=1&pageSize=8",
        { cache: "no-store" },
      );

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      setItems(result.data ?? []);
      setUnread(result.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 30_000);
    const handleChange = () => void load();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    window.addEventListener(
      ADMIN_NOTIFICATIONS_CHANGED_EVENT,
      handleChange,
    );
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener(
        ADMIN_NOTIFICATIONS_CHANGED_EVENT,
        handleChange,
      );
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  async function markRead(id?: string) {
    const response = await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id, action: "read" } : { all: true }),
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json().catch(() => ({}));
    const now = new Date().toISOString();

    if (id) {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read_at: item.read_at ?? now } : item,
        ),
      );
    } else {
      setItems((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? now })),
      );
    }

    setUnread(result.unread ?? 0);
    window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED_EVENT));
  }

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        if (open) {
          void load();
        }
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          className="relative grid size-10 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
        >
          <Bell className={cn("size-4", loading && "animate-pulse")} />
          {unread > 0 && (
            <span
              className="absolute right-1 top-1 min-w-4 rounded-full bg-gold px-1 text-center text-[9px] font-bold leading-4 text-primary"
              aria-hidden="true"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="right"
          align="end"
          sideOffset={12}
          collisionPadding={12}
          className="z-[70] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-primary/8 px-4 py-3">
            <div>
              <p className="font-serif text-xl text-primary">Notifikasi</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
              </p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markRead()}
                className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-secondary hover:bg-cream"
              >
                <CheckCheck className="size-3.5" />
                Baca semua
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto size-6 text-primary/20" />
                <p className="mt-3 text-sm text-muted">
                  Belum ada notifikasi.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const type = normalizeNotificationType(item.type);
                const Icon = notificationIcons[type] ?? Bell;

                return (
                  <DropdownMenu.Item key={item.id} asChild>
                    <Link
                      href={item.link_url || "/admin/notifikasi"}
                      onClick={() => {
                        if (!item.read_at) {
                          void markRead(item.id);
                        }
                      }}
                      className={cn(
                        "flex gap-3 rounded-xl px-3 py-3 outline-none transition hover:bg-cream focus:bg-cream",
                        !item.read_at && "bg-cream/55",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
                          item.read_at
                            ? "bg-primary/5 text-muted"
                            : "bg-gold/20 text-primary",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-primary">
                            {item.title}
                          </span>
                          {!item.read_at && (
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
                          )}
                        </span>
                        {item.body && (
                          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted">
                            {item.body}
                          </span>
                        )}
                        <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary/75">
                          {formatNotificationTime(item.created_at)}
                        </span>
                      </span>
                    </Link>
                  </DropdownMenu.Item>
                );
              })
            )}
          </div>

          <div className="border-t border-primary/8 p-2">
            <DropdownMenu.Item asChild>
              <Link
                href="/admin/notifikasi"
                className="flex min-h-10 items-center justify-center rounded-xl text-sm font-semibold text-secondary outline-none hover:bg-cream focus:bg-cream"
              >
                Lihat semua notifikasi
              </Link>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
