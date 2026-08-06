"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import type { AdminResource } from "@/lib/admin/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "./confirmation-dialog";
import { ResourceFormDialog, type AdminRecord } from "./resource-form-dialog";

function previewPath(section: string, row: AdminRecord) {
  if (!row.slug) return null;
  const roots: Record<string, string> = { kegiatan: "/kegiatan", khotbah: "/khotbah", berita: "/berita", departemen: "/pelayanan" };
  return roots[section] ? `${roots[section]}/${row.slug}` : null;
}
function displayDate(value: unknown) {
  if (!value || typeof value !== "string") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(date);
}
function badgeClass(status: unknown) {
  if (["draft", "unread", "new"].includes(String(status))) return "bg-amber-100 text-amber-900";
  if (["inactive", "archived", "cancelled"].includes(String(status))) return "bg-slate-100 text-slate-700";
  if (["published", "live", "confirmed", "visited", "replied"].includes(String(status))) return "bg-green-100 text-green-800";
  return "bg-blue-100 text-blue-800";
}

export function DataTable({ resource }: { resource: AdminResource }) {
  const [rows, setRows] = useState<AdminRecord[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [deleting, setDeleting] = useState<AdminRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const response = await fetch(`/api/admin/${resource.section}?${params}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({ message: "Respons server tidak valid" }));
    if (!response.ok) { setRows([]); setCount(0); setError(result.message ?? "Data tidak dapat dimuat"); setLoading(false); return; }
    setRows(result.data ?? []); setCount(result.count ?? 0); setLoading(false);
  }, [page, resource.section, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function submitSearch(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(queryInput.trim()); }
  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(row: AdminRecord) { setEditing(row); setFormOpen(true); }
  function saved(row: AdminRecord) {
    setRows((current) => editing ? current.map((item) => item.id === row.id ? row : item) : [row, ...current]);
    if (!editing) setCount((value) => value + 1);
  }
  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const response = await fetch(`/api/admin/${resource.section}/${deleting.id}`, { method: "DELETE" });
    if (response.ok) { setRows((current) => current.filter((item) => item.id !== deleting.id)); setCount((value) => Math.max(0, value - 1)); setDeleting(null); }
    else { const result = await response.json().catch(() => ({})); setError(result.message ?? "Data tidak dapat dihapus"); }
    setDeleteBusy(false);
  }

  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  return <>
    <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
      <div className="flex flex-col gap-3 border-b border-primary/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={submitSearch} className="flex w-full max-w-md gap-2"><label className="relative flex-1"><span className="sr-only">Cari konten</span><Search className="absolute left-3 top-3.5 size-4 text-muted" /><Input className="pl-10" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder={`Cari ${resource.singular.toLowerCase()}…`} /></label><Button type="submit" variant="secondary">Cari</Button></form>
        <div className="flex flex-wrap gap-2"><select aria-label="Filter status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-12 rounded-xl border border-primary/15 px-4 text-sm"><option value="">Semua status</option><option value="draft">Draft</option><option value="scheduled">Terjadwal</option><option value="published">Dipublikasi</option><option value="inactive">Nonaktif</option><option value="unread">Belum dibaca</option><option value="archived">Diarsipkan</option></select><Button type="button" variant="secondary" size="icon" onClick={() => void load()} aria-label="Muat ulang"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button>{resource.createEnabled !== false && <Button type="button" onClick={openCreate}><Plus className="size-4" />Tambah</Button>}</div>
      </div>
      {error && <div role="alert" className={`border-b px-5 py-4 text-sm ${error.includes("belum dikonfigurasi") ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800"}`}>{error}{error.includes("belum dikonfigurasi") && <span className="block text-xs opacity-75">Isi environment variables Supabase untuk mengaktifkan data dan CRUD.</span>}</div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-cream text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4">{resource.titleColumn === "name" ? "Nama" : "Judul"}</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Tanggal</th><th className="px-5 py-4 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-primary/8">
        {loading ? <tr><td colSpan={4} className="px-5 py-16 text-center text-muted"><Loader2 className="mx-auto mb-3 size-6 animate-spin" />Memuat data…</td></tr> : rows.length === 0 ? <tr><td colSpan={4} className="px-5 py-16 text-center text-muted">Belum ada data yang dapat ditampilkan.</td></tr> : rows.map((row) => { const path = previewPath(resource.section, row); return <tr key={row.id} className="hover:bg-cream/50"><td className="px-5 py-4 font-semibold text-primary">{String(row[resource.titleColumn] ?? "Tanpa judul")}</td><td className="px-5 py-4"><Badge className={badgeClass(row.status)}>{String(row.status ?? "—")}</Badge></td><td className="px-5 py-4 text-muted">{displayDate(row[resource.dateColumn ?? "updated_at"])}</td><td className="px-5 py-4"><div className="flex justify-end gap-1">{path && <a href={path} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-lg hover:bg-cream" aria-label="Preview"><Eye className="size-4" /></a>}<button onClick={() => openEdit(row)} className="grid size-9 place-items-center rounded-lg hover:bg-cream" aria-label="Edit"><Pencil className="size-4" /></button><button onClick={() => setDeleting(row)} className="grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50" aria-label="Hapus"><Trash2 className="size-4" /></button></div></td></tr>; })}
      </tbody></table></div>
      <div className="flex items-center justify-between border-t border-primary/10 px-5 py-4 text-xs text-muted"><span>{count} data · Halaman {page} dari {pageCount}</span><div className="flex gap-2"><Button variant="secondary" size="icon" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} aria-label="Halaman sebelumnya"><ChevronLeft className="size-4" /></Button><Button variant="secondary" size="icon" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)} aria-label="Halaman berikutnya"><ChevronRight className="size-4" /></Button></div></div>
    </div>
    <ResourceFormDialog resource={resource} record={editing} open={formOpen} onOpenChange={setFormOpen} onSaved={saved} />
    <ConfirmationDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} onConfirm={confirmDelete} busy={deleteBusy} title={`Hapus ${resource.singular}?`} description="Data akan dinonaktifkan dan disembunyikan dari website. Tindakan ini dicatat dalam audit log." />
  </>;
}
