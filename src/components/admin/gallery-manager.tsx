"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowUp,
  FolderOpen,
  ImageIcon,
  Images,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import {
  ResourceFormDialog,
  type AdminRecord,
} from "@/components/admin/resource-form-dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { ResourceCapabilities } from "@/lib/admin/access-control";
import type { AdminResource } from "@/lib/admin/resources";

const MAX_SELECTION = 40;

type Album = AdminRecord & {
  slug: string;
  title: string;
  description: string | null;
  event_date: string | null;
  category: string | null;
  cover_id: string | null;
  display_order: number;
  status: string;
  image_count: number;
  cover_url: string | null;
};

type GalleryImage = {
  id: string;
  album_id: string;
  media_id: string;
  title: string | null;
  description: string | null;
  display_order: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  file_name: string;
  alt_text: string | null;
  mime_type: string;
  url: string;
};

type LibraryItem = {
  id: string;
  file_name: string;
  alt_text: string | null;
  created_at: string;
  attached_status: "active" | "inactive" | null;
  url: string;
};

const defaultCapabilities: ResourceCapabilities = {
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  scope: "all",
};

function formatDate(value: string | null) {
  if (!value) return "Tanpa tanggal";
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function statusLabel(status: string) {
  if (status === "published") return "Dipublikasikan";
  if (status === "scheduled") return "Terjadwal";
  if (status === "inactive") return "Tidak aktif";
  return "Draf";
}

function ImageEditor({
  image,
  cover,
  first,
  last,
  busy,
  onSave,
  onMove,
  onCover,
  onToggle,
}: {
  image: GalleryImage;
  cover: boolean;
  first: boolean;
  last: boolean;
  busy: boolean;
  onSave: (
    image: GalleryImage,
    title: string,
    description: string,
    altText: string,
  ) => Promise<void>;
  onMove: (image: GalleryImage, direction: -1 | 1) => Promise<void>;
  onCover: (image: GalleryImage) => Promise<void>;
  onToggle: (image: GalleryImage) => Promise<void>;
}) {
  const [title, setTitle] = useState(image.title ?? "");
  const [description, setDescription] = useState(image.description ?? "");
  const [altText, setAltText] = useState(image.alt_text ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTitle(image.title ?? "");
      setDescription(image.description ?? "");
      setAltText(image.alt_text ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [image.alt_text, image.description, image.title]);

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white ${
        image.status === "inactive"
          ? "border-slate-200 opacity-65"
          : cover
            ? "border-gold shadow-[0_0_0_2px_rgba(200,169,107,.15)]"
            : "border-primary/10"
      }`}
    >
      <div className="relative aspect-[4/3] bg-primary/5">
        <Image
          src={image.url}
          alt={image.alt_text || image.title || image.file_name}
          fill
          sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
          className="object-cover"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {cover && (
            <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-bold text-primary shadow">
              COVER
            </span>
          )}
          {image.status === "inactive" && (
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-white">
              NONAKTIF
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="truncate text-xs font-semibold text-muted" title={image.file_name}>
            {image.file_name}
          </p>
          <p className="mt-1 text-[11px] text-muted">Urutan {image.display_order + 1}</p>
        </div>

        <label className="block text-xs font-semibold text-primary">
          Judul / caption
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={140}
            className="mt-2 h-10 bg-cream"
            placeholder="Contoh: Pelayanan kepada masyarakat"
          />
        </label>

        <label className="block text-xs font-semibold text-primary">
          Alt text aksesibilitas
          <Input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            maxLength={250}
            className="mt-2 h-10 bg-cream"
            placeholder="Jelaskan isi foto secara singkat"
          />
        </label>

        <label className="block text-xs font-semibold text-primary">
          Keterangan
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={600}
            className="mt-2 min-h-20 bg-cream"
            placeholder="Keterangan foto (opsional)"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-10 min-h-10 px-4 text-xs"
            disabled={busy}
            onClick={() => void onSave(image, title, description, altText)}
          >
            Simpan
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-10 min-h-10"
            disabled={busy || first}
            onClick={() => void onMove(image, -1)}
            aria-label="Naikkan urutan foto"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-10 min-h-10"
            disabled={busy || last}
            onClick={() => void onMove(image, 1)}
            aria-label="Turunkan urutan foto"
          >
            <ArrowDown className="size-4" />
          </Button>
          {!cover && image.status === "active" && (
            <Button
              type="button"
              variant="secondary"
              className="h-10 min-h-10 px-4 text-xs"
              disabled={busy}
              onClick={() => void onCover(image)}
            >
              <Star className="size-4" /> Cover
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            className={`h-10 min-h-10 px-4 text-xs ${
              image.status === "active" ? "text-red-700" : "text-secondary"
            }`}
            disabled={busy}
            onClick={() => void onToggle(image)}
          >
            {image.status === "active" ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function GalleryManager({ resource }: { resource: AdminResource }) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [capabilities, setCapabilities] = useState(defaultCapabilities);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);
  const [deleting, setDeleting] = useState<Album | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageBusy, setImageBusy] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = albums.find((album) => album.id === selectedId) ?? null;

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/admin/gallery", { cache: "no-store" });
    const result = await response
      .json()
      .catch(() => ({ message: "Respons server tidak valid" }));

    if (!response.ok) {
      setAlbums([]);
      setMessage(result.message ?? "Album tidak dapat dimuat");
      setLoading(false);
      return;
    }

    setAlbums((result.data ?? []) as Album[]);
    if (result.capabilities) {
      setCapabilities(result.capabilities as ResourceCapabilities);
    }
    setLoading(false);
  }, []);

  const loadImages = useCallback(async (albumId: string) => {
    setImagesLoading(true);
    setMessage(null);
    const response = await fetch(`/api/admin/gallery/${albumId}/images`, {
      cache: "no-store",
    });
    const result = await response
      .json()
      .catch(() => ({ message: "Respons server tidak valid" }));

    if (!response.ok) {
      setImages([]);
      setMessage(result.message ?? "Foto album tidak dapat dimuat");
      setImagesLoading(false);
      return;
    }

    setImages((result.data ?? []) as GalleryImage[]);
    if (result.album?.cover_id !== undefined) {
      setAlbums((current) =>
        current.map((album) =>
          album.id === albumId
            ? { ...album, cover_id: result.album.cover_id }
            : album,
        ),
      );
    }
    setImagesLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAlbums(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAlbums]);

  useEffect(() => {
    if (!selectedId) {
      const timer = window.setTimeout(() => setImages([]), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => void loadImages(selectedId), 0);
    return () => window.clearTimeout(timer);
  }, [loadImages, selectedId]);

  function savedAlbum(record: AdminRecord) {
    const next = record as Album;
    setAlbums((current) => {
      const found = current.some((album) => album.id === next.id);
      if (!found) {
        return [
          { ...next, image_count: 0, cover_url: null },
          ...current,
        ];
      }
      return current.map((album) =>
        album.id === next.id
          ? {
              ...album,
              ...next,
              image_count: album.image_count,
              cover_url: album.cover_url,
            }
          : album,
      );
    });
    setEditing(null);
    void loadAlbums();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const response = await fetch(`/api/admin/galeri/${deleting.id}`, {
      method: "DELETE",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.message ?? "Album tidak dapat dihapus");
      setDeleteBusy(false);
      return;
    }

    if (selectedId === deleting.id) setSelectedId(null);
    setDeleting(null);
    setDeleteBusy(false);
    await loadAlbums();
  }

  async function uploadSelected() {
    if (!selected || files.length === 0) return;
    setUploading(true);
    setMessage(null);
    setUploadProgress(0);

    let succeeded = 0;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const form = new FormData();
      form.set("file", file);
      form.set("altText", `${selected.title} - ${file.name}`);

      const response = await fetch(`/api/admin/gallery/${selected.id}/images`, {
        method: "POST",
        body: form,
      });
      const result = await response.json().catch(() => ({}));
      setUploadProgress(index + 1);

      if (!response.ok) {
        setMessage(
          `${succeeded} foto berhasil. ${file.name}: ${result.message ?? "upload gagal"}`,
        );
        break;
      }
      succeeded += 1;
    }

    if (succeeded === files.length) {
      setMessage(`${succeeded} foto berhasil ditambahkan ke album.`);
    }

    setFiles([]);
    if (fileInput.current) fileInput.current.value = "";
    setUploading(false);
    await Promise.all([loadImages(selected.id), loadAlbums()]);
  }

  async function patchImage(imageId: string, payload: Record<string, unknown>) {
    if (!selected) return false;
    setImageBusy(imageId);
    setMessage(null);
    const response = await fetch(
      `/api/admin/gallery/${selected.id}/images/${imageId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.message ?? "Foto tidak dapat diperbarui");
      setImageBusy(null);
      return false;
    }
    setImageBusy(null);
    return true;
  }

  async function saveImage(
    image: GalleryImage,
    title: string,
    description: string,
    altText: string,
  ) {
    const ok = await patchImage(image.id, { title, description, alt_text: altText });
    if (ok && selected) await loadImages(selected.id);
  }

  async function moveImage(image: GalleryImage, direction: -1 | 1) {
    if (!selected) return;
    const ordered = [...images].sort(
      (a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at),
    );
    const index = ordered.findIndex((item) => item.id === image.id);
    const neighbor = ordered[index + direction];
    if (!neighbor) return;

    setImageBusy(image.id);
    const currentOrder = index;
    const neighborOrder = index + direction;
    const first = await fetch(
      `/api/admin/gallery/${selected.id}/images/${image.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: neighborOrder }),
      },
    );
    const second = first.ok
      ? await fetch(
          `/api/admin/gallery/${selected.id}/images/${neighbor.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ display_order: currentOrder }),
          },
        )
      : first;

    if (!first.ok || !second.ok) {
      const result = await (!first.ok ? first : second).json().catch(() => ({}));
      setMessage(result.message ?? "Urutan foto tidak dapat diubah");
    }
    setImageBusy(null);
    await loadImages(selected.id);
  }

  async function setCover(image: GalleryImage) {
    if (!selected) return;
    const ok = await patchImage(image.id, { set_cover: true });
    if (!ok) return;
    setAlbums((current) =>
      current.map((album) =>
        album.id === selected.id ? { ...album, cover_id: image.media_id, cover_url: image.url } : album,
      ),
    );
    await loadImages(selected.id);
  }

  async function toggleImage(image: GalleryImage) {
    if (!selected) return;
    const ok = await patchImage(image.id, {
      status: image.status === "active" ? "inactive" : "active",
    });
    if (ok) await Promise.all([loadImages(selected.id), loadAlbums()]);
  }

  const loadLibrary = useCallback(async () => {
    if (!selectedId) return;
    setLibraryLoading(true);
    const params = new URLSearchParams({ albumId: selectedId });
    if (libraryQuery.trim()) params.set("q", libraryQuery.trim());
    const response = await fetch(`/api/admin/gallery/media?${params}`, {
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLibrary([]);
      setMessage(result.message ?? "Pustaka media tidak dapat dimuat");
    } else {
      setLibrary((result.data ?? []) as LibraryItem[]);
    }
    setLibraryLoading(false);
  }, [libraryQuery, selectedId]);

  useEffect(() => {
    if (!libraryOpen || !selectedId) return;
    const timer = window.setTimeout(() => void loadLibrary(), 150);
    return () => window.clearTimeout(timer);
  }, [libraryOpen, loadLibrary, selectedId]);

  async function attachLibrary(item: LibraryItem) {
    if (!selected) return;
    setImageBusy(item.id);
    const response = await fetch(`/api/admin/gallery/${selected.id}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId: item.id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.message ?? "Media tidak dapat ditambahkan");
    } else {
      await Promise.all([loadImages(selected.id), loadAlbums(), loadLibrary()]);
    }
    setImageBusy(null);
  }

  const orderedImages = [...images].sort(
    (a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-primary">Album Galeri</h2>
          <p className="mt-1 text-sm text-muted">
            Buat album terlebih dahulu, lalu kelola seluruh foto dari satu tempat.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => void loadAlbums()}
            aria-label="Muat ulang album"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {capabilities.canCreate && (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Buat Album
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          {message}
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid min-h-48 place-items-center rounded-2xl border border-primary/10 bg-white text-muted">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : albums.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center">
          <Images className="mx-auto size-12 text-primary/30" />
          <p className="mt-4 font-serif text-2xl text-primary">Belum ada album</p>
          <p className="mt-2 text-sm text-muted">
            Buat album pertama, kemudian unggah beberapa foto sekaligus.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {albums.map((album) => (
            <article
              key={album.id}
              className={`overflow-hidden rounded-2xl border bg-white transition ${
                selectedId === album.id ? "border-gold shadow-lg" : "border-primary/10"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(album.id)}
                className="block w-full text-left"
              >
                <div className="relative aspect-[16/8] bg-primary/5">
                  {album.cover_url ? (
                    <Image
                      src={album.cover_url}
                      alt={`Cover ${album.title}`}
                      fill
                      sizes="(max-width:768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-primary/25">
                      <ImageIcon className="size-12" />
                    </div>
                  )}
                  <span className="absolute bottom-3 right-3 rounded-full bg-primary/85 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    {album.image_count} foto
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-primary">
                        {album.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {album.category || "Tanpa kategori"} · {formatDate(album.event_date)}
                      </p>
                    </div>
                    <span className="rounded-full bg-cream px-3 py-1 text-[10px] font-bold text-secondary">
                      {statusLabel(album.status)}
                    </span>
                  </div>
                </div>
              </button>
              <div className="flex flex-wrap gap-2 border-t border-primary/10 px-5 py-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 min-h-10 px-4 text-xs"
                  onClick={() => setSelectedId(album.id)}
                >
                  <Images className="size-4" /> Kelola Foto
                </Button>
                {capabilities.canUpdate && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 min-h-10 px-4 text-xs"
                    onClick={() => {
                      setEditing(album);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" /> Edit
                  </Button>
                )}
                {capabilities.canDelete && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="size-10 min-h-10 text-red-700"
                    onClick={() => setDeleting(album)}
                    aria-label={`Hapus album ${album.title}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <section className="mt-10 rounded-[1.75rem] border border-primary/10 bg-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-secondary">
                Kelola Foto Album
              </p>
              <h2 className="mt-2 font-serif text-3xl text-primary">{selected.title}</h2>
              <p className="mt-2 text-sm text-muted">
                JPG, PNG, atau WebP · maksimal 5 MB per foto · hingga {MAX_SELECTION} foto sekali pilih.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files ?? []).slice(0, MAX_SELECTION);
                  setFiles(selectedFiles);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                <UploadCloud className="size-4" /> Pilih Foto
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLibraryOpen(true)}
                disabled={uploading}
              >
                <FolderOpen className="size-4" /> Pustaka Media
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-cream p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">
                  {files.length} foto siap diunggah
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-muted">
                  {files.map((file) => file.name).join(", ")}
                </p>
              </div>
              <Button type="button" onClick={() => void uploadSelected()} disabled={uploading}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                {uploading
                  ? `Mengunggah ${uploadProgress}/${files.length}`
                  : "Upload Semua"}
              </Button>
            </div>
          )}

          {imagesLoading ? (
            <div className="mt-6 grid min-h-48 place-items-center text-muted">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : orderedImages.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-cream p-10 text-center text-sm text-muted">
              Album ini belum memiliki foto. Gunakan <strong>Pilih Foto</strong> untuk upload baru atau <strong>Pustaka Media</strong> untuk menggunakan gambar yang sudah ada.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {orderedImages.map((image, index) => (
                <ImageEditor
                  key={image.id}
                  image={image}
                  cover={selected.cover_id === image.media_id}
                  first={index === 0}
                  last={index === orderedImages.length - 1}
                  busy={imageBusy === image.id}
                  onSave={saveImage}
                  onMove={moveImage}
                  onCover={setCover}
                  onToggle={toggleImage}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <ResourceFormDialog
        resource={resource}
        record={editing}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        onSaved={savedAlbum}
      />

      <ConfirmationDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title="Hapus album?"
        description="Album akan disembunyikan dari website. File foto tetap tersimpan di Pustaka Media sehingga tidak hilang secara permanen."
      />

      <Dialog.Root open={libraryOpen} onOpenChange={setLibraryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-primary/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] max-h-[88vh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-cream p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <Dialog.Title className="font-serif text-3xl text-primary">
                  Pilih dari Pustaka Media
                </Dialog.Title>
                <Dialog.Description className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Media dan Super Admin dapat memilih gambar publik yang tersedia. Admin Departemen hanya melihat gambar miliknya sendiri.
                </Dialog.Description>
              </div>
              <Dialog.Close className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-primary" aria-label="Tutup pustaka media">
                <X className="size-5" />
              </Dialog.Close>
            </div>

            <form
              className="mt-6 flex gap-2"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                void loadLibrary();
              }}
            >
              <Input
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder="Cari nama file..."
                className="bg-white"
              />
              <Button type="submit" variant="secondary">
                Cari
              </Button>
            </form>

            {libraryLoading ? (
              <div className="grid min-h-56 place-items-center text-muted">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : library.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center text-sm text-muted">
                Tidak ada gambar yang dapat dipilih.
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {library.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
                    <div className="relative aspect-[4/3] bg-primary/5">
                      <Image src={item.url} alt={item.alt_text || item.file_name} fill sizes="(max-width:768px) 50vw, 33vw" className="object-cover" />
                    </div>
                    <div className="p-4">
                      <p className="truncate text-sm font-semibold text-primary" title={item.file_name}>
                        {item.file_name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">
                        {item.alt_text || "Tanpa alt text"}
                      </p>
                      <Button
                        type="button"
                        className="mt-4 w-full"
                        variant={item.attached_status === "active" ? "secondary" : "primary"}
                        disabled={item.attached_status === "active" || imageBusy === item.id}
                        onClick={() => void attachLibrary(item)}
                      >
                        {imageBusy === item.id && <Loader2 className="size-4 animate-spin" />}
                        {item.attached_status === "active"
                          ? "Sudah di album"
                          : item.attached_status === "inactive"
                            ? "Pulihkan ke Album"
                            : "Tambahkan ke Album"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
