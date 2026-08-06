"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { FileImage, FileText, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "./confirmation-dialog";

type MediaItem = { id: string; file_name: string; mime_type: string; size_bytes: number; bucket: string; alt_text: string | null; created_at: string; url: string | null };
function fileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

export function MediaManager() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [count, setCount] = useState(0);
  const [bucket, setBucket] = useState("public-media");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MediaItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setMessage(null);
    const response = await fetch(`/api/admin/media?bucket=${bucket}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({ message: "Respons tidak valid" }));
    if (!response.ok) { setItems([]); setCount(0); setMessage(result.message ?? "Media tidak dapat dimuat"); setLoading(false); return; }
    setItems(result.data ?? []); setCount(result.count ?? 0); setLoading(false);
  }, [bucket]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) { setMessage("Pilih file sebelum mengunggah."); return; }
    setUploading(true);
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const result = await response.json().catch(() => ({ message: "Respons tidak valid" }));
    if (!response.ok) setMessage(result.message ?? "Upload gagal");
    else { setItems((current) => [result.data, ...current]); setCount((value) => value + 1); formElement.reset(); }
    setUploading(false);
  }
  async function confirmDelete() {
    if (!deleting) return;
    const response = await fetch(`/api/admin/media/${deleting.id}`, { method: "DELETE" });
    if (response.ok) { setItems((current) => current.filter((item) => item.id !== deleting.id)); setCount((value) => Math.max(0, value - 1)); setDeleting(null); }
    else { const result = await response.json().catch(() => ({})); setMessage(result.message ?? "File tidak dapat dihapus"); }
  }

  return <>
    <form onSubmit={upload} className="grid gap-4 rounded-2xl border border-primary/10 bg-white p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
      <label className="text-sm font-semibold text-primary">File<Input ref={fileInput} name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-2 bg-cream file:mr-3 file:border-0 file:bg-transparent file:font-semibold" /></label>
      <label className="text-sm font-semibold text-primary">Alt text / keterangan<Input name="altText" className="mt-2 bg-cream" placeholder="Jelaskan isi gambar" /></label>
      <div className="flex gap-2"><select name="bucket" value={bucket} onChange={(event) => setBucket(event.target.value)} className="h-12 rounded-xl border border-primary/15 px-3 text-sm"><option value="public-media">Media Publik</option><option value="private-documents">Dokumen Privat</option></select><Button type="submit" disabled={uploading}>{uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}Unggah</Button></div>
    </form>
    {message && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
    <div className="mt-5 overflow-hidden rounded-2xl border border-primary/10 bg-white"><div className="flex items-center justify-between border-b border-primary/10 p-5"><div><h2 className="font-serif text-2xl text-primary">Pustaka Media</h2><p className="text-xs text-muted">{count} file di {bucket}</p></div><Button variant="secondary" size="icon" onClick={() => void load()} aria-label="Muat ulang"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button></div>
      {loading ? <div className="grid min-h-48 place-items-center text-sm text-muted"><Loader2 className="size-6 animate-spin" /></div> : items.length === 0 ? <div className="grid min-h-48 place-items-center px-6 text-center text-sm text-muted">Belum ada file pada bucket ini.</div> : <div className="grid gap-px bg-primary/10 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="bg-white p-5"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-cream text-secondary">{item.mime_type.startsWith("image/") ? <FileImage /> : <FileText />}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-primary" title={item.file_name}>{item.file_name}</p><p className="mt-1 text-xs text-muted">{fileSize(item.size_bytes)} · {item.bucket}</p><p className="mt-2 line-clamp-2 text-xs text-muted">{item.alt_text || "Tanpa keterangan"}</p></div><button type="button" onClick={() => setDeleting(item)} className="grid size-9 shrink-0 place-items-center rounded-lg text-red-700 hover:bg-red-50" aria-label={`Hapus ${item.file_name}`}><Trash2 className="size-4" /></button></div>{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs font-semibold text-secondary underline decoration-gold underline-offset-4">Buka file</a>}</article>)}</div>}
    </div>
    <ConfirmationDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} onConfirm={confirmDelete} title="Hapus file?" description="File akan dihapus dari Supabase Storage dan ditandai nonaktif dalam pustaka media." />
  </>;
}
