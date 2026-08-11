"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  SecurityCheck,
  SecuritySummary,
} from "@/lib/security/security-posture";
import { cn } from "@/lib/utils";

type SecurityEvent = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

type SecurityPayload = {
  generatedAt: string;
  summary: SecuritySummary;
  checks: SecurityCheck[];
  recentSecurityEvents: SecurityEvent[];
};

const statusMeta = {
  pass: {
    label: "Lulus",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  warning: {
    label: "Peringatan",
    icon: AlertTriangle,
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  fail: {
    label: "Gagal",
    icon: ShieldAlert,
    className: "bg-red-50 text-red-800 border-red-200",
  },
  info: {
    label: "Info",
    icon: CircleHelp,
    className: "bg-slate-50 text-slate-700 border-slate-200",
  },
} as const;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function SecurityDashboard() {
  const [payload, setPayload] = useState<SecurityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/security", {
        cache: "no-store",
      });
      const body = (await response.json()) as SecurityPayload & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(body.message || "Pemeriksaan keamanan gagal dimuat");
      }

      setPayload(body);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Pemeriksaan keamanan gagal dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await fetch("/api/admin/security", {
          cache: "no-store",
        });
        const body = (await response.json()) as SecurityPayload & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(body.message || "Pemeriksaan keamanan gagal dimuat");
        }

        if (!cancelled) {
          setPayload(body);
          setError("");
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Pemeriksaan keamanan gagal dimuat",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, SecurityCheck[]>();
    for (const check of payload?.checks ?? []) {
      const current = map.get(check.category) ?? [];
      current.push(check);
      map.set(check.category, current);
    }
    return [...map.entries()];
  }, [payload]);

  if (loading && !payload) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 text-center text-sm text-muted shadow-sm">
        Menjalankan pemeriksaan keamanan…
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <p>{error}</p>
        <Button className="mt-4" type="button" onClick={() => void load()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  const summary = payload?.summary;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-primary">
                Postur Keamanan
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                Pemeriksaan ini membaca konfigurasi database dan runtime tanpa
                menampilkan nilai secret. Hasilnya adalah alat diagnosis, bukan
                pengganti RLS, otorisasi API, atau audit berkala.
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Periksa Ulang
          </Button>
        </div>

        {summary && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl bg-primary p-4 text-white">
              <p className="text-xs uppercase tracking-[0.14em] text-white/60">
                Skor
              </p>
              <p className="mt-1 text-3xl font-bold">{summary.score}%</p>
            </div>
            {(["pass", "warning", "fail", "info"] as const).map((status) => {
              const meta = statusMeta[status];
              const Icon = meta.icon;
              return (
                <div key={status} className={cn("rounded-2xl border p-4", meta.className)}>
                  <div className="flex items-center gap-2">
                    <Icon className="size-4" />
                    <p className="text-xs font-bold uppercase tracking-[0.12em]">
                      {meta.label}
                    </p>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{summary[status]}</p>
                </div>
              );
            })}
          </div>
        )}

        {payload?.generatedAt && (
          <p className="mt-4 text-xs text-muted">
            Pemeriksaan terakhir: {formatDate(payload.generatedAt)}
          </p>
        )}
      </section>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {groups.map(([category, checks]) => (
        <section key={category} className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <div className="border-b border-black/5 px-5 py-4 sm:px-6">
            <h3 className="font-serif text-xl text-primary">{category}</h3>
          </div>
          <div className="divide-y divide-black/5">
            {checks.map((check) => {
              const meta = statusMeta[check.status];
              const Icon = meta.icon;
              return (
                <article key={check.key} className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-primary">{check.title}</h4>
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide", meta.className)}>
                          <Icon className="size-3.5" />
                          {meta.label}
                        </span>
                        {check.issueCount > 0 && (
                          <span className="text-xs text-muted">
                            {check.issueCount.toLocaleString("id-ID")} temuan
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">{check.summary}</p>
                      {check.remediation && check.status !== "pass" && (
                        <p className="mt-3 rounded-xl bg-[#f7f7f4] p-3 text-xs leading-5 text-primary">
                          <strong>Tindakan:</strong> {check.remediation}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="font-serif text-xl text-primary">Akses Ditolak 24 Jam Terakhir</h3>
        <p className="mt-1 text-sm text-muted">
          Hanya metadata kejadian keamanan yang ditampilkan; tidak ada token,
          password, atau isi permohonan doa.
        </p>

        {(payload?.recentSecurityEvents ?? []).length === 0 ? (
          <p className="mt-4 rounded-2xl bg-[#f7f7f4] p-4 text-sm text-muted">
            Tidak ada kejadian penolakan yang tercatat dalam 24 jam terakhir.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5">
            {payload?.recentSecurityEvents.map((event) => (
              <div key={event.id} className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-primary">{event.action}</p>
                  <p className="text-xs text-muted">
                    {event.entity_type}{event.entity_id ? ` · ${event.entity_id}` : ""}
                  </p>
                </div>
                <time className="text-xs text-muted">{formatDate(event.created_at)}</time>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
