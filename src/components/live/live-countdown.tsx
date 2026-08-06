"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { getCountdownState } from "@/lib/countdown";

export function LiveCountdown({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { const tick = () => setNow(new Date()); const timeout = window.setTimeout(tick, 0); const interval = window.setInterval(tick, 1000); return () => { window.clearTimeout(timeout); window.clearInterval(interval); }; }, []);
  if (!now) return <div className="mt-7 h-16 animate-pulse rounded-xl bg-white/5" aria-label="Memuat waktu siaran" />;
  const state = getCountdownState(startsAt, endsAt, now);
  if (state.status === "live") return <div className="mt-6 rounded-xl border border-red-400/25 bg-red-400/10 p-4" role="status"><p className="flex items-center gap-2 font-semibold text-red-200"><Radio className="size-5 animate-pulse" />Sedang Live</p><p className="mt-1 text-xs text-white/60">Ibadah sedang berlangsung. Bergabunglah melalui YouTube.</p></div>;
  if (state.status === "ended") return <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4" role="status"><p className="font-semibold text-white">Siaran telah selesai</p><p className="mt-1 text-xs text-white/55">Rekaman akan tersedia pada arsip khotbah.</p></div>;
  return <div className="mt-7"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold">Live berikutnya</p><div className="grid grid-cols-4 gap-2" aria-live="polite">{[[state.days,"Hari"],[state.hours,"Jam"],[state.minutes,"Menit"],[state.seconds,"Detik"]].map(([value, label]) => <div key={String(label)} className="rounded-lg bg-white/5 p-2 text-center"><b className="block font-serif text-xl tabular-nums text-gold">{String(value).padStart(2,"0")}</b><span className="text-[8px] uppercase text-white/65">{label}</span></div>)}</div></div>;
}
