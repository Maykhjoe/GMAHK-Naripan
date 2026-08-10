"use client";

import {
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";

type AuditRow = {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_data?: unknown;
  new_data?: unknown;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type RetentionPolicy = {
  entity_type: string;
  retention_days: number | null;
  strategy: string;
  enabled: boolean;
  description?: string | null;
};

function actorName(row: AuditRow) {
  if (Array.isArray(row.profiles)) {
    return row.profiles[0]?.full_name?.trim() || "Sistem";
  }
  return row.profiles?.full_name?.trim() || "Sistem";
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function summarizeData(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const text = JSON.stringify(value, null, 2);
  return text.length > 1400 ? `${text.slice(0, 1400)}\n…` : text;
}

export function AuditLogViewer() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 30,
    total: 0,
    totalPages: 1,
  });
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [retentionRunning, setRetentionRunning] = useState(false);
  const [retentionMessage, setRetentionMessage] = useState("");

  const loadRows = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pagination.pageSize),
      });
      if (query.trim()) params.set("q", query.trim());
      if (entity.trim()) params.set("entity", entity.trim());
      if (action.trim()) params.set("action", action.trim());

      try {
        const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: AuditRow[];
          pagination?: Pagination;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message || "Audit log tidak dapat dimuat");
        }

        setRows(payload.data ?? []);
        if (payload.pagination) setPagination(payload.pagination);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Audit log tidak dapat dimuat");
      } finally {
        setLoading(false);
      }
    },
    [action, entity, pagination.pageSize, query],
  );

  const loadRetentionPolicies = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/retention", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: RetentionPolicy[];
      };
      if (response.ok) setRetentionPolicies(payload.data ?? []);
    } catch {
      // Audit history remains usable even when policy metadata cannot load.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void loadRows(1);
      void loadRetentionPolicies();
    }, 0);

    return () => window.clearTimeout(initial);
  }, [loadRows, loadRetentionPolicies]);

  async function runRetention() {
    const confirmed = window.confirm(
      "Jalankan kebijakan retensi sekarang? Data lama yang memenuhi syarat dapat dianonimkan atau dihapus permanen sesuai kebijakan.",
    );
    if (!confirmed) return;

    setRetentionRunning(true);
    setRetentionMessage("");
    try {
      const response = await fetch("/api/admin/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json()) as {
        message?: string;
        data?: Record<string, unknown>;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Retensi data gagal dijalankan");
      }

      const summary = payload.data ? JSON.stringify(payload.data) : "";
      setRetentionMessage(`${payload.message ?? "Retensi selesai"}${summary ? ` — ${summary}` : ""}`);
      await loadRows(1);
    } catch (caught) {
      setRetentionMessage(
        caught instanceof Error ? caught.message : "Retensi data gagal dijalankan",
      );
    } finally {
      setRetentionRunning(false);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadRows(1);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <h2 className="font-serif text-2xl">Audit Keamanan</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Log bersifat append-only. Payload sensitif, isi permohonan doa, token,
              password, dan catatan internal disaring sebelum disimpan.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadRows(pagination.page)}
            disabled={loading}
          >
            <RefreshCw className="size-4" />
            Muat Ulang
          </Button>
        </div>

        <form onSubmit={submitFilters} className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <label className="relative">
            <span className="sr-only">Cari audit log</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:border-primary"
              placeholder="Cari action atau entity…"
              maxLength={80}
            />
          </label>
          <input
            value={entity}
            onChange={(event) => setEntity(event.target.value)}
            className="min-h-11 rounded-xl border border-black/10 px-3 text-sm outline-none focus:border-primary"
            placeholder="Entity, mis. posts"
            maxLength={80}
          />
          <input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="min-h-11 rounded-xl border border-black/10 px-3 text-sm outline-none focus:border-primary"
            placeholder="Action, mis. update"
            maxLength={80}
          />
          <Button type="submit" disabled={loading}>Terapkan</Button>
        </form>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ArchiveRestore className="size-5" />
              <h2 className="font-serif text-xl">Retensi Data</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Permohonan doa tidak pernah dihapus otomatis; retensinya tetap melalui keputusan pelayanan.
            </p>
          </div>
          <Button type="button" onClick={runRetention} disabled={retentionRunning}>
            {retentionRunning ? "Memproses…" : "Jalankan Retensi"}
          </Button>
        </div>

        {retentionPolicies.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {retentionPolicies.map((policy) => (
              <div key={policy.entity_type} className="rounded-2xl border border-black/5 bg-[#f7f7f4] p-4">
                <p className="font-semibold text-primary">{policy.entity_type}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                  {policy.enabled
                    ? `${policy.strategy} · ${policy.retention_days ?? "manual"} hari`
                    : "manual / tidak otomatis"}
                </p>
                {policy.description && (
                  <p className="mt-2 text-xs leading-5 text-muted">{policy.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {retentionMessage && (
          <p className="mt-4 break-words rounded-xl bg-[#f3f4f1] p-3 text-xs text-primary">
            {retentionMessage}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 sm:px-6">
          <p className="text-sm text-muted">
            {pagination.total.toLocaleString("id-ID")} catatan audit
          </p>
          <p className="text-xs text-muted">
            Halaman {pagination.page} / {pagination.totalPages}
          </p>
        </div>

        {error ? (
          <div className="p-6 text-sm text-red-700">{error}</div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-muted">Memuat audit log…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">Belum ada audit log yang cocok.</div>
        ) : (
          <div className="divide-y divide-black/5">
            {rows.map((row) => {
              const oldData = summarizeData(row.old_data);
              const newData = summarizeData(row.new_data);
              return (
                <article key={row.id} className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                          {row.action}
                        </span>
                        <span className="text-sm font-semibold text-primary">{row.entity_type}</span>
                        {row.entity_id && (
                          <code className="text-[11px] text-muted">{row.entity_id}</code>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {actorName(row)} · {formatDate(row.created_at)}
                        {row.ip_address ? ` · IP ${row.ip_address}` : ""}
                      </p>
                    </div>
                  </div>

                  {(oldData || newData) && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {oldData && (
                        <details className="rounded-xl border border-black/5 bg-[#fafaf8] p-3">
                          <summary className="cursor-pointer text-xs font-semibold text-muted">Data sebelumnya</summary>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-primary">{oldData}</pre>
                        </details>
                      )}
                      {newData && (
                        <details className="rounded-xl border border-black/5 bg-[#fafaf8] p-3">
                          <summary className="cursor-pointer text-xs font-semibold text-muted">Data baru / metadata</summary>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-primary">{newData}</pre>
                        </details>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-black/5 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            disabled={loading || pagination.page <= 1}
            onClick={() => void loadRows(Math.max(1, pagination.page - 1))}
          >
            <ChevronLeft className="size-4" /> Sebelumnya
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || pagination.page >= pagination.totalPages}
            onClick={() => void loadRows(Math.min(pagination.totalPages, pagination.page + 1))}
          >
            Berikutnya <ChevronRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
