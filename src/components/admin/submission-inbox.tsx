"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  submissionConfigs,
  type SubmissionKind,
} from "@/lib/admin/submissions";

export type SubmissionRecord = Record<string, unknown> & { id: string };

type EventRelation = {
  title?: string;
  slug?: string;
  starts_at?: string;
};

function relation(value: unknown): EventRelation | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object"
      ? (first as EventRelation)
      : null;
  }

  return value && typeof value === "object" ? (value as EventRelation) : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatDate(value: unknown, withTime = true) {
  if (!value || typeof value !== "string") {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: withTime ? "short" : undefined,
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function statusClass(status: unknown) {
  const value = String(status ?? "");

  if (["unread", "new", "registered"].includes(value)) {
    return "bg-amber-100 text-amber-900";
  }

  if (["archived", "cancelled"].includes(value)) {
    return "bg-slate-100 text-slate-700";
  }

  if (["replied", "visited", "attended", "confirmed"].includes(value)) {
    return "bg-green-100 text-green-800";
  }

  return "bg-blue-100 text-blue-800";
}

function displayTitle(kind: SubmissionKind, row: SubmissionRecord) {
  if (kind === "prayer") {
    return row.is_anonymous
      ? "Permohonan anonim"
      : stringValue(row.name) || "Tanpa nama";
  }

  if (kind === "contact") {
    return stringValue(row.subject) || "Pesan tanpa subjek";
  }

  if (kind === "registration") {
    const event = relation(row.event);
    return event?.title || "Pendaftaran kegiatan";
  }

  return stringValue(row.name) || "Tanpa nama";
}

function displaySubtitle(kind: SubmissionKind, row: SubmissionRecord) {
  if (kind === "prayer") {
    return stringValue(row.category) || "Permohonan doa";
  }

  if (kind === "contact") {
    return stringValue(row.name) || stringValue(row.email);
  }

  if (kind === "registration") {
    return `${stringValue(row.name) || "Peserta"} · ${String(row.people_count ?? 1)} orang`;
  }

  return `${formatDate(row.visit_date, false)} · ${String(row.people_count ?? 1)} orang`;
}

function whatsappHref(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

function emailHref(value: unknown) {
  const email = stringValue(value).trim();
  return email ? `mailto:${email}` : null;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

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

function SubmissionDetails({
  kind,
  row,
}: {
  kind: SubmissionKind;
  row: SubmissionRecord;
}) {
  const event = relation(row.event);

  if (kind === "prayer") {
    return (
      <dl>
        <DetailRow
          label="Nama"
          value={row.is_anonymous ? "Anonim" : stringValue(row.name)}
        />
        <DetailRow label="Kategori" value={stringValue(row.category)} />
        <DetailRow
          label="Akses permohonan"
          value={
            row.sharing_scope === "pastor"
              ? "Pendeta/Gembala Jemaat"
              : "Tim Pendoa Jemaat"
          }
        />
        <DetailRow
          label="Bersedia dihubungi"
          value={row.may_contact ? "Ya" : "Tidak"}
        />
        <DetailRow label="WhatsApp" value={stringValue(row.whatsapp)} />
        <DetailRow label="Email" value={stringValue(row.email)} />
        <DetailRow label="Isi permohonan" value={stringValue(row.request_text)} />
      </dl>
    );
  }

  if (kind === "visitor") {
    return (
      <dl>
        <DetailRow label="Nama" value={stringValue(row.name)} />
        <DetailRow label="WhatsApp" value={stringValue(row.whatsapp)} />
        <DetailRow
          label="Tanggal kunjungan"
          value={formatDate(row.visit_date, false)}
        />
        <DetailRow label="Jumlah orang" value={String(row.people_count ?? 1)} />
        <DetailRow
          label="Membawa anak"
          value={row.bringing_children ? "Ya" : "Tidak"}
        />
        <DetailRow label="Catatan" value={stringValue(row.notes)} />
      </dl>
    );
  }

  if (kind === "contact") {
    return (
      <dl>
        <DetailRow label="Nama" value={stringValue(row.name)} />
        <DetailRow label="Email" value={stringValue(row.email)} />
        <DetailRow label="Telepon" value={stringValue(row.phone)} />
        <DetailRow label="Subjek" value={stringValue(row.subject)} />
        <DetailRow label="Pesan" value={stringValue(row.message)} />
      </dl>
    );
  }

  return (
    <dl>
      <DetailRow label="Kegiatan" value={event?.title} />
      <DetailRow
        label="Waktu kegiatan"
        value={event?.starts_at ? formatDate(event.starts_at) : "—"}
      />
      <DetailRow label="Nama peserta" value={stringValue(row.name)} />
      <DetailRow label="WhatsApp" value={stringValue(row.whatsapp)} />
      <DetailRow label="Email" value={stringValue(row.email)} />
      <DetailRow label="Jumlah peserta" value={String(row.people_count ?? 1)} />
      <DetailRow label="Catatan peserta" value={stringValue(row.notes)} />
    </dl>
  );
}

export function SubmissionInbox({ kind }: { kind: SubmissionKind }) {
  const config = submissionConfigs[kind];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSubmissionId = searchParams.get("submission");
  const directSubmissionRef = useRef<string | null>(null);
  const [rows, setRows] = useState<SubmissionRecord[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SubmissionRecord | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (search) {
      params.set("search", search);
    }

    if (status) {
      params.set("status", status);
    }

    const response = await fetch(
      `/api/admin/submissions/${kind}?${params}`,
      { cache: "no-store" },
    );
    const result = await response
      .json()
      .catch(() => ({ message: "Respons server tidak valid" }));

    if (!response.ok) {
      setRows([]);
      setCount(0);
      setError(result.message ?? "Data formulir tidak dapat dimuat");
      setLoading(false);
      return;
    }

    setRows(result.data ?? []);
    setCount(result.count ?? 0);
    setLoading(false);
  }, [kind, page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!requestedSubmissionId) {
      directSubmissionRef.current = null;
      return;
    }

    if (directSubmissionRef.current === requestedSubmissionId) {
      return;
    }

    directSubmissionRef.current = requestedSubmissionId;
    const controller = new AbortController();

    void fetch(
      `/api/admin/submissions/${kind}/${requestedSubmissionId}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const result = await response
          .json()
          .catch(() => ({ message: "Respons server tidak valid" }));

        if (!response.ok) {
          throw new Error(
            result.message ?? "Detail formulir tidak dapat dimuat",
          );
        }

        const row = result.data as SubmissionRecord;
        setSelected(row);
        setSelectedStatus(
          String(row.status ?? config.statusOptions[0].value),
        );
        setInternalNotes(stringValue(row.internal_notes));
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Detail formulir tidak dapat dimuat",
        );
      });

    return () => controller.abort();
  }, [config.statusOptions, kind, requestedSubmissionId]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(queryInput.trim());
  }

  function openDetails(row: SubmissionRecord) {
    setSelected(row);
    setSelectedStatus(String(row.status ?? config.statusOptions[0].value));
    setInternalNotes(stringValue(row.internal_notes));
  }

  function closeDetails() {
    setSelected(null);

    if (requestedSubmissionId) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("submission");
      router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, {
        scroll: false,
      });
    }
  }

  async function saveDetails() {
    if (!selected) {
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(
      `/api/admin/submissions/${kind}/${selected.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          internalNotes,
        }),
      },
    );
    const result = await response
      .json()
      .catch(() => ({ message: "Respons server tidak valid" }));

    if (!response.ok) {
      setError(result.message ?? "Perubahan tidak dapat disimpan");
      setSaving(false);
      return;
    }

    const updated = {
      ...selected,
      ...result.data,
      status: selectedStatus,
      internal_notes: internalNotes || null,
    } as SubmissionRecord;

    setRows((current) =>
      current.map((item) => (item.id === selected.id ? updated : item)),
    );
    setSelected(updated);
    setSaving(false);
  }

  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const selectedWhatsapp = useMemo(
    () => whatsappHref(selected?.whatsapp ?? selected?.phone),
    [selected],
  );
  const selectedEmail = useMemo(
    () => emailHref(selected?.email),
    [selected],
  );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
        <div className="flex flex-col gap-3 border-b border-primary/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={submitSearch} className="flex w-full max-w-md gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Cari data formulir</span>
              <Search className="absolute left-3 top-3.5 size-4 text-muted" />
              <Input
                className="pl-10"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder={`Cari ${config.singular.toLowerCase()}…`}
              />
            </label>
            <Button type="submit" variant="secondary">
              Cari
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Filter status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-12 rounded-xl border border-primary/15 px-4 text-sm"
            >
              <option value="">Semua status</option>
              {config.statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => void load()}
              aria-label="Muat ulang"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="border-b border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <div className="divide-y divide-primary/8">
          {loading ? (
            <div className="px-5 py-16 text-center text-muted">
              <Loader2 className="mx-auto mb-3 size-6 animate-spin" />
              Memuat data…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-16 text-center text-muted">
              Belum ada data yang dapat ditampilkan.
            </div>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openDetails(row)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-cream/50"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cream text-secondary">
                  {kind === "prayer" ? (
                    <ShieldCheck className="size-5" />
                  ) : kind === "visitor" ? (
                    <UserRound className="size-5" />
                  ) : kind === "registration" ? (
                    <CalendarDays className="size-5" />
                  ) : (
                    <Mail className="size-5" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-primary">
                    {displayTitle(kind, row)}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted">
                    {displaySubtitle(kind, row)}
                  </span>
                </span>

                {kind === "prayer" && row.sharing_scope === "pastor" && (
                  <Badge className="hidden bg-purple-100 text-purple-800 sm:inline-flex">
                    Pendeta
                  </Badge>
                )}

                <Badge className={statusClass(row.status)}>
                  {config.statusOptions.find(
                    (option) => option.value === String(row.status),
                  )?.label ?? String(row.status ?? "—")}
                </Badge>

                <span className="hidden min-w-32 text-right text-xs text-muted md:block">
                  {formatDate(row.created_at)}
                </span>

                <Eye className="size-4 shrink-0 text-muted" />
              </button>
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
      </div>

      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => !open && closeDetails()}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-primary/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-[101] w-full max-w-2xl overflow-y-auto bg-cream p-6 shadow-2xl sm:p-10">
            {selected && (
              <>
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                      {config.singular}
                    </p>
                    <Dialog.Title className="mt-2 font-serif text-3xl text-primary">
                      {displayTitle(kind, selected)}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-muted">
                      Diterima {formatDate(selected.created_at)} WIB
                    </Dialog.Description>
                  </div>
                  <Dialog.Close
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-muted hover:text-primary"
                    aria-label="Tutup"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  {selectedWhatsapp && (
                    <a
                      href={selectedWhatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#e8f1e9] px-4 text-sm font-semibold text-primary"
                    >
                      <MessageCircle className="size-4" />
                      WhatsApp
                    </a>
                  )}
                  {selectedEmail && (
                    <a
                      href={selectedEmail}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-primary"
                    >
                      <Mail className="size-4" />
                      Email
                    </a>
                  )}
                </div>

                <div className="mt-7 rounded-2xl border border-primary/10 bg-white px-6">
                  <SubmissionDetails kind={kind} row={selected} />
                </div>

                <div className="mt-7 rounded-2xl border border-primary/10 bg-white p-6">
                  <h3 className="font-serif text-2xl text-primary">
                    Tindak lanjut internal
                  </h3>
                  <div className="mt-5 grid gap-5">
                    <label className="text-sm font-semibold text-primary">
                      Status
                      <select
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-primary/15 bg-cream px-4 text-sm"
                      >
                        {config.statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-primary">
                      Catatan internal
                      <Textarea
                        className="mt-2 min-h-32 bg-cream"
                        value={internalNotes}
                        maxLength={2000}
                        onChange={(event) => setInternalNotes(event.target.value)}
                        placeholder="Catatan ini hanya terlihat oleh admin yang berwenang."
                      />
                    </label>

                    <Button
                      type="button"
                      onClick={() => void saveDetails()}
                      disabled={saving}
                      className="w-fit"
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Simpan Tindak Lanjut
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                  <Archive className="mt-0.5 size-4 shrink-0" />
                  Data formulir bersifat privat. Gunakan hanya untuk pelayanan dan
                  tindak lanjut yang telah disetujui pemohon.
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
