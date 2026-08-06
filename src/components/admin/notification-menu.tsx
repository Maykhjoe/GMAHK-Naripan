"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";

type Notification = { id: string; title: string; body: string | null; link_url: string | null; read_at: string | null; created_at: string };
export function NotificationMenu() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  useEffect(() => { const timer = window.setTimeout(async () => { const response = await fetch("/api/admin/notifications", { cache: "no-store" }); if (!response.ok) return; const result = await response.json(); setItems(result.data ?? []); setUnread(result.unread ?? 0); }, 0); return () => window.clearTimeout(timer); }, []);
  async function markRead() { const response = await fetch("/api/admin/notifications", { method: "PATCH" }); if (response.ok) { setUnread(0); setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))); } }
  return <DropdownMenu.Root><DropdownMenu.Trigger asChild><button className="relative grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}><Bell className="size-4" />{unread > 0 && <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-gold px-1 text-[9px] font-bold leading-4 text-primary">{Math.min(unread, 99)}</span>}</button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content side="right" align="end" sideOffset={12} className="z-[70] w-[min(360px,calc(100vw-24px))] rounded-2xl border border-primary/10 bg-white p-2 shadow-2xl"><div className="flex items-center justify-between px-3 py-2"><p className="font-serif text-xl text-primary">Notifikasi</p>{unread > 0 && <button onClick={() => void markRead()} className="flex items-center gap-1 text-xs font-semibold text-secondary"><CheckCheck className="size-3.5" />Tandai dibaca</button>}</div><div className="max-h-96 overflow-y-auto">{items.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted">Belum ada notifikasi.</p> : items.map((item) => <DropdownMenu.Item key={item.id} asChild><Link href={item.link_url || "/admin"} className="block rounded-xl px-3 py-3 outline-none hover:bg-cream focus:bg-cream"><div className="flex gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read_at ? "bg-primary/15" : "bg-gold"}`} /><div><p className="text-sm font-semibold text-primary">{item.title}</p>{item.body && <p className="mt-1 text-xs leading-5 text-muted">{item.body}</p>}</div></div></Link></DropdownMenu.Item>)}</div></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}
