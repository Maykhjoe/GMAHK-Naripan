"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  HeartHandshake,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

type MonitoringSummary = {
  total_count: number;
  unread_count: number;
  in_prayer_count: number;
  follow_up_count: number;
  archived_count: number;
  prayer_team_count: number;
  pastor_count: number;
  overdue_count: number;
};

type MonitoringRow = {
  id: string;
  sharing_scope: "prayer_team" | "pastor";
  status: "unread" | "in_prayer" | "follow_up" | "archived";
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  age_hours: number;
  filtered_count: number;
};

type SensitivePrayer = {
  request_id: string;
  requester_name: string | null;
  is_anonymous: boolean;
  whatsapp: string | null;
  email: string | null;
  category: string;
  request_text: string;
  may_contact: boolean;
  sharing_scope: "prayer_team" | "pastor";
  status: string;
  internal_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

const emptySummary: MonitoringSummary = {
  total_count: 0,
  unread_count: 0,
  in_prayer_count: 0,
  follow_up_count: 0,
  archived_count: 0,
  prayer_team_count: 0,
  pastor_count: 0,
  overdue_count: 0,
};

const statusLabels: Record<MonitoringRow["status"], string> = {
  unread: "Belum dibaca",
  in_prayer: "Sedang didoakan",
  follow_up: "Perlu tindak lanjut",
  archived: "Diarsipkan",
};

function recipientLabel(scope: string) {
  return scope === "pastor"
    ? "Pendeta/Gembala Jemaat"
    : "Tim Pendoa Jemaat";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function statusClass(status: MonitoringRow["status"]) {
  if (status === "unread") return "bg-amber-100 text-amber-900";
  if (status === "in_prayer") return "bg-blue-100 text-blue-800";
  if (status === "follow_up") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

function DetailLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="border-b border-primary/8 py-4 last:border-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-primary">
        {value}
      </dd>
    </div>
  );
}

export function PrayerMonitoring() {
  const searchParams = useSearchParams();
  const requestedPrayer = searchParams.get("prayer");
  const [summary, setSummary] = useState<MonitoringSummary>(emptySummary);
  const [rows, setRows] = useState<MonitoringRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => requestedPrayer,
  );
  const [reason, setReason] = useState("");
  const [sensitive, setSensitive] = useState<SensitivePrayer | null>(null);
  const [accessing, setAccessing] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (scope) params.set("scope", scope);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/monitoring/prayers?${params}`, {
        cache: "no-store",
      });
      const result = await response
        .json()
        .catch(() => ({ message: "Respons server tidak valid" }));

      if (!response.ok) {
        setRows([]);
        setCount(0);
        setError(result.message ?? "Monitoring tidak dapat dimuat");
        return;
      }

      setSummary(result.summary ?? emptySummary);
      setRows(result.data ?? []);
      setCount(Number(result.count ?? 0));
    } catch {
      setRows([]);
      setCount(0);
      setError("Tidak dapat terhubung ke layanan monitoring");
    } finally {
      setLoading(false);
    }
  }, [page, scope, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const metrics = useMemo(
    () => [
      {
        label: "Total Permohonan",
        value: summary.total_count,
        icon: HeartHandshake,
      },
      {
        label: "Belum Dibaca",
        value: summary.unread_count,
        icon: Clock3,
      },
      {
        label: "Sedang Didoakan",
        value: summary.in_prayer_count,
        icon: UsersRound,
      },
      {
        label: "Melewati 24 Jam",
        value: summary.overdue_count,
        icon: AlertTriangle,
      },
    ],
    [summary],
  );

  function closeAccess() {
    setSelectedId(null);
    setReason("");
    setSensitive(null);
    setAccessError(null);
  }

  async function requestSensitiveAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;

    setAccessing(true);
    setAccessError(null);

    try {
      const response = await fetch(
        `/api/admin/monitoring/prayers/${selectedId}/access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      const result = await response
        .json()
        .catch(() => ({ message: "Respons server tidak valid" }));

      if (!response.ok) {
        setAccessError(result.message ?? "Akses khusus gagal");
        return;
      }

      setSensitive(result.data ?? null);
    } catch {
      setAccessError("Tidak dapat terhubung ke layanan akses khusus");
    } finally {
      setAccessing(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-primary/8 bg-white p-6"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-cream text-secondary">
              <Icon className="size-5" />
            </span>
            <p className="mt-5 font-serif text-4xl text-primary">{value}</p>
            <p className="mt-2 text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-primary/8 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
            Distribusi Penerima
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-cream p-4">
              <p className="font-serif text-3xl text-primary">
                {summary.prayer_team_count}
              </p>
              <p className="mt-1 text-xs text-muted">Tim Pendoa Jemaat</p>
            </div>
            <div className="rounded-xl bg-cream p-4">
              <p className="font-serif text-3xl text-primary">
                {summary.pastor_count}
              </p>
              <p className="mt-1 text-xs text-muted">
                Pendeta/Gembala Jemaat
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/8 bg-primary p-6 text-white">
          <div className="flex gap-4">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-gold" />
            <div>
              <h2 className="font-serif text-2xl">Privasi tetap dipisahkan</h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Monitoring hanya menampilkan metadata pelayanan. Nama, kontak,
                isi doa, dan catatan internal baru dibuka melalui akses khusus
                dengan alasan yang dicatat pada audit log.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-primary/8 bg-white">
        <div className="flex flex-col gap-4 border-b border-primary/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-serif text-2xl text-primary">
              Progres Permohonan Doa
            </h2>
            <p className="mt-1 text-xs text-muted">
              Identitas pemohon dan isi doa disembunyikan pada daftar ini.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={scope}
              onChange={(event) => {
                setScope(event.target.value);
                setPage(1);
              }}
              aria-label="Filter penerima"
              className="h-11 rounded-xl border border-primary/15 bg-white px-3 text-sm"
            >
              <option value="">Semua penerima</option>
              <option value="prayer_team">Tim Pendoa Jemaat</option>
              <option value="pastor">Pendeta/Gembala Jemaat</option>
            </select>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              aria-label="Filter status"
              className="h-11 rounded-xl border border-primary/15 bg-white px-3 text-sm"
            >
              <option value="">Semua status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => void load()}
              aria-label="Muat ulang monitoring"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="divide-y divide-primary/8">
          {loading ? (
            <div className="p-14 text-center text-sm text-muted">
              <Loader2 className="mx-auto mb-3 size-6 animate-spin" />
              Memuat monitoring…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-14 text-center text-sm text-muted">
              Tidak ada permohonan pada filter ini.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cream text-secondary">
                  <ShieldAlert className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-primary">
                      Permohonan #{row.id.slice(0, 8).toUpperCase()}
                    </p>
                    <Badge className={statusClass(row.status)}>
                      {statusLabels[row.status]}
                    </Badge>
                    {row.status === "unread" && row.age_hours >= 24 && (
                      <Badge className="bg-red-100 text-red-800">
                        Melewati 24 jam
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {recipientLabel(row.sharing_scope)} · Diterima {formatDate(row.created_at)} WIB
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Penanggung jawab: {row.assigned_to_name || "Belum ditentukan"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedId(row.id)}
                >
                  <Eye className="size-4" />
                  Akses Khusus
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-primary/10 px-5 py-4 text-xs text-muted">
          <span>
            {count} data · Halaman {page} dari {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((value) => value + 1)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <Dialog.Root open={Boolean(selectedId)} onOpenChange={(open) => !open && closeAccess()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-primary/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-cream p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                  Akses Data Sensitif
                </p>
                <Dialog.Title className="mt-2 font-serif text-3xl text-primary">
                  Permohonan #{selectedId?.slice(0, 8).toUpperCase()}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-muted">
                  Akses ini hanya untuk penanganan masalah sistem, pengawasan,
                  atau investigasi yang sah.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-muted"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>

            {!sensitive ? (
              <form onSubmit={requestSensitiveAccess} className="mt-7">
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                  <p>
                    Nama, kontak, isi doa, dan catatan internal akan dibuka.
                    Identitas Super Admin, waktu, ID permohonan, dan alasan akses
                    akan dicatat pada audit log.
                  </p>
                </div>

                <label className="mt-5 block text-sm font-semibold text-primary">
                  Alasan akses
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    minLength={10}
                    maxLength={500}
                    required
                    className="mt-2 min-h-32 bg-white"
                    placeholder="Contoh: Memeriksa laporan kegagalan akses akun Pendeta/Gembala Jemaat."
                  />
                </label>

                {accessError && (
                  <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                    {accessError}
                  </p>
                )}

                <div className="mt-5 flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={closeAccess}>
                    Batalkan
                  </Button>
                  <Button type="submit" disabled={accessing || reason.trim().length < 10}>
                    {accessing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShieldAlert className="size-4" />
                    )}
                    Buka dan Catat Audit
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-7">
                <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                  Akses khusus berhasil dan telah dicatat dalam audit log.
                </div>

                <dl className="mt-5 rounded-2xl border border-primary/10 bg-white px-6">
                  <DetailLine
                    label="Nama"
                    value={sensitive.is_anonymous ? "Anonim" : sensitive.requester_name}
                  />
                  <DetailLine label="Kategori" value={sensitive.category} />
                  <DetailLine
                    label="Penerima"
                    value={recipientLabel(sensitive.sharing_scope)}
                  />
                  <DetailLine label="WhatsApp" value={sensitive.whatsapp} />
                  <DetailLine label="Email" value={sensitive.email} />
                  <DetailLine label="Isi permohonan" value={sensitive.request_text} />
                  <DetailLine label="Catatan internal" value={sensitive.internal_notes} />
                </dl>

                <div className="mt-5 flex justify-end">
                  <Button type="button" onClick={closeAccess}>
                    Tutup Data Sensitif
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
