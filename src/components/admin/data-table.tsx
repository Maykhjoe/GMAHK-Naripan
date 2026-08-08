"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import type {
  AdminFieldOption,
  AdminResource,
} from "@/lib/admin/resources";
import { articleStatusLabel } from "@/lib/admin/article-workflow";
import type { ArticleWorkflowCapabilities } from "@/lib/admin/article-workflow";
import type { ResourceCapabilities } from "@/lib/admin/access-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "./confirmation-dialog";
import { ResourceFormDialog, type AdminRecord } from "./resource-form-dialog";

type SelectOption = { value: string; label: string };

function previewPath(section: string, row: AdminRecord) {
  if (!row.slug) return null;

  const roots: Record<string, string> = {
    kegiatan: "/kegiatan",
    khotbah: "/khotbah",
    berita: "/berita",
    departemen: "/pelayanan",
  };

  return roots[section] ? `${roots[section]}/${row.slug}` : null;
}

function displayDate(value: unknown) {
  if (!value || typeof value !== "string") return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: value.includes("T") ? "short" : undefined,
      }).format(date);
}

function badgeClass(status: unknown) {
  if (["draft", "unread", "new"].includes(String(status))) {
    return "bg-amber-100 text-amber-900";
  }

  if (["inactive", "archived", "cancelled"].includes(String(status))) {
    return "bg-slate-100 text-slate-700";
  }

  if (
    ["published", "live", "confirmed", "visited", "replied"].includes(
      String(status),
    )
  ) {
    return "bg-green-100 text-green-800";
  }

  return "bg-blue-100 text-blue-800";
}

function optionValue(option: AdminFieldOption): SelectOption {
  return typeof option === "string"
    ? { value: option, label: option }
    : option;
}

function pageTokens(page: number, pageCount: number) {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  return [...new Set([1, page - 1, page, page + 1, pageCount])].filter(
    (value) => value >= 1 && value <= pageCount,
  );
}

export function DataTable({ resource }: { resource: AdminResource }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directRecordRef = useRef<string | null>(null);

  const requestedRecordId = searchParams.get("record");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const search = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const requestedPageSize = Number(searchParams.get("limit"));
  const pageSize = [10, 20, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 20;

  const [rows, setRows] = useState<AdminRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [deleting, setDeleting] = useState<AdminRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [workflow, setWorkflow] = useState<ArticleWorkflowCapabilities | null>(null);
  const [capabilities, setCapabilities] = useState<ResourceCapabilities>({
    canRead: true,
    canCreate: resource.createEnabled !== false && resource.readOnly !== true,
    canUpdate: resource.readOnly !== true,
    canDelete: resource.readOnly !== true,
    scope: "all",
  });

  const statusField = resource.fields.find((field) => field.key === "status");
  const statusOptions = (statusField?.options ?? []).map(optionValue);
  const categoryField = resource.fields.find(
    (field) => field.key === resource.categoryColumn,
  );

  const updateUrl = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }

      if (resetPage && !("page" in updates)) {
        next.delete("page");
      }

      startTransition(() => {
        router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const response = await fetch(`/api/admin/${resource.section}?${params}`, {
      cache: "no-store",
    });
    const result = await response
      .json()
      .catch(() => ({ message: "Respons server tidak valid" }));

    if (!response.ok) {
      setRows([]);
      setCount(0);
      setWorkflow(null);
      setCapabilities((current) => ({
        ...current,
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      }));
      setError(result.message ?? "Data tidak dapat dimuat");
      setLoading(false);
      return;
    }

    setRows(result.data ?? []);
    setCount(result.count ?? 0);
    setWorkflow(result.workflow ?? null);
    if (result.capabilities) {
      setCapabilities(result.capabilities as ResourceCapabilities);
    }
    setLoading(false);
  }, [
    category,
    dateFrom,
    dateTo,
    page,
    pageSize,
    resource.section,
    search,
    status,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!requestedRecordId) {
      directRecordRef.current = null;
      return;
    }

    if (directRecordRef.current === requestedRecordId) {
      return;
    }

    directRecordRef.current = requestedRecordId;
    const controller = new AbortController();

    void fetch(`/api/admin/${resource.section}/${requestedRecordId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response
          .json()
          .catch(() => ({ message: "Respons server tidak valid" }));

        if (!response.ok) {
          throw new Error(result.message ?? "Detail data tidak dapat dimuat");
        }

        setEditing(result.data as AdminRecord);
        setFormOpen(true);
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
            : "Detail data tidak dapat dimuat",
        );
      });

    return () => controller.abort();
  }, [requestedRecordId, resource.section]);

  useEffect(() => {
    if (!categoryField) {
      return;
    }

    if (categoryField.options?.length) {
      const timer = window.setTimeout(
        () => setCategoryOptions(categoryField.options!.map(optionValue)),
        0,
      );
      return () => window.clearTimeout(timer);
    }

    if (!categoryField.optionsEndpoint) {
      return;
    }

    const controller = new AbortController();

    void fetch(categoryField.optionsEndpoint, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Filter gagal dimuat");
        setCategoryOptions(result.data ?? []);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        console.error("Kategori admin tidak dapat dimuat:", requestError);
      });

    return () => controller.abort();
  }, [categoryField]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  function scheduleSearch(value: string) {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      updateUrl({ q: value.trim() || null });
    }, 450);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }

    const data = new FormData(event.currentTarget);
    updateUrl({ q: String(data.get("q") ?? "").trim() || null });
  }

  function clearFilters() {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }

    updateUrl(
      {
        q: null,
        status: null,
        category: null,
        from: null,
        to: null,
        limit: null,
        page: null,
      },
      false,
    );
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: AdminRecord) {
    setEditing(row);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);

    if (!open && requestedRecordId) {
      updateUrl({ record: null }, false);
    }
  }

  function saved() {
    void load();
  }

  async function confirmDelete() {
    if (!deleting) return;

    setDeleteBusy(true);
    const response = await fetch(
      `/api/admin/${resource.section}/${deleting.id}`,
      { method: "DELETE" },
    );

    if (response.ok) {
      setDeleting(null);
      await load();
    } else {
      const result = await response.json().catch(() => ({}));
      setError(result.message ?? "Data tidak dapat dihapus");
    }

    setDeleteBusy(false);
  }

  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const hasFilters = Boolean(
    search || status || category || dateFrom || dateTo || pageSize !== 20,
  );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
        <div className="border-b border-primary/10 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form
              onSubmit={submitSearch}
              className="flex w-full max-w-xl gap-2"
              role="search"
            >
              <label className="relative flex-1">
                <span className="sr-only">Cari konten</span>
                <Search
                  className="absolute left-3 top-3.5 size-4 text-muted"
                  aria-hidden="true"
                />
                <Input
                  key={search}
                  name="q"
                  className="pl-10"
                  defaultValue={search}
                  onChange={(event) => scheduleSearch(event.target.value)}
                  placeholder={`Cari ${resource.singular.toLowerCase()}…`}
                  autoComplete="off"
                />
              </label>
              <Button type="submit" variant="secondary">
                Cari
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => void load()}
                aria-label="Muat ulang"
              >
                <RefreshCw
                  className={`size-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>

              {hasFilters && (
                <Button type="button" variant="secondary" onClick={clearFilters}>
                  <X className="size-4" aria-hidden="true" />
                  Reset
                </Button>
              )}

              {resource.createEnabled !== false && capabilities.canCreate && (
                <Button type="button" onClick={openCreate}>
                  <Plus className="size-4" aria-hidden="true" />
                  Tambah
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {statusOptions.length > 0 && (
              <select
                aria-label="Filter status"
                value={status}
                onChange={(event) =>
                  updateUrl({ status: event.target.value || null })
                }
                className="h-12 rounded-xl border border-primary/15 bg-white px-4 text-sm"
              >
                <option value="">Semua status</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {categoryField && (
              <select
                aria-label={`Filter ${categoryField.label.toLowerCase()}`}
                value={category}
                onChange={(event) =>
                  updateUrl({ category: event.target.value || null })
                }
                className="h-12 rounded-xl border border-primary/15 bg-white px-4 text-sm"
              >
                <option value="">Semua {categoryField.label.toLowerCase()}</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {resource.dateColumn && (
              <>
                <label>
                  <span className="sr-only">Tanggal mulai</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(event) =>
                      updateUrl({ from: event.target.value || null })
                    }
                    aria-label="Tanggal mulai"
                    title="Tanggal mulai"
                  />
                </label>

                <label>
                  <span className="sr-only">Tanggal akhir</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(event) =>
                      updateUrl({ to: event.target.value || null })
                    }
                    aria-label="Tanggal akhir"
                    title="Tanggal akhir"
                  />
                </label>
              </>
            )}

            <select
              aria-label="Jumlah data per halaman"
              value={pageSize}
              onChange={(event) =>
                updateUrl({
                  limit:
                    event.target.value === "20" ? null : event.target.value,
                })
              }
              className="h-12 rounded-xl border border-primary/15 bg-white px-4 text-sm"
            >
              <option value="10">10 data per halaman</option>
              <option value="20">20 data per halaman</option>
              <option value="50">50 data per halaman</option>
            </select>
          </div>
        </div>

        {resource.section === "berita" && workflow && (
          <div className="border-b border-primary/10 bg-cream/60 px-5 py-3 text-xs leading-5 text-muted">
            {workflow.canPublish ? (
              <span>
                Anda dapat meninjau dan menerbitkan artikel. Artikel berstatus
                <strong className="mx-1 text-primary">Menunggu Peninjauan</strong>
                siap diperiksa sebelum dipublikasikan.
              </span>
            ) : (
              <span>
                Anda dapat membuat dan mengedit artikel milik sendiri. Pilih
                <strong className="mx-1 text-primary">Menunggu Peninjauan</strong>
                untuk mengirim artikel kepada reviewer.
              </span>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className={`border-b px-5 py-4 text-sm ${
              error.includes("belum dikonfigurasi")
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {error}
            {error.includes("belum dikonfigurasi") && (
              <span className="block text-xs opacity-75">
                Isi environment variables Supabase untuk mengaktifkan data dan
                CRUD.
              </span>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-4">
                  {resource.titleColumn === "name" ? "Nama" : "Judul"}
                </th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Tanggal</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/8">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-16 text-center text-muted"
                  >
                    <Loader2 className="mx-auto mb-3 size-6 animate-spin" />
                    Memuat data…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-16 text-center text-muted"
                  >
                    Tidak ada data yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const path =
                    row.status === "published"
                      ? previewPath(resource.section, row)
                      : null;
                  const isArticle = resource.section === "berita";
                  const isOwner =
                    !isArticle ||
                    !workflow ||
                    String(row.created_by ?? "") === workflow.userId;
                  const articleLocked =
                    isArticle &&
                    !workflow?.canEditAll &&
                    (!isOwner || row.status === "published");
                  const canEditRow = capabilities.canUpdate && !articleLocked;
                  const canArchiveRow =
                    capabilities.canDelete &&
                    (!isArticle ||
                    (row.status !== "archived" &&
                      (Boolean(workflow?.canEditAll) ||
                        (isOwner && row.status !== "published"))));

                  return (
                    <tr key={row.id} className="hover:bg-cream/50">
                      <td className="px-5 py-4 font-semibold text-primary">
                        {String(row[resource.titleColumn] ?? "Tanpa judul")}
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={badgeClass(row.status)}>
                          {resource.section === "berita"
                            ? articleStatusLabel(row.status)
                            : String(row.status ?? "—")}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {displayDate(row[resource.dateColumn ?? "updated_at"])}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {path && (
                            <a
                              href={path}
                              target="_blank"
                              rel="noreferrer"
                              className="grid size-9 place-items-center rounded-lg hover:bg-cream"
                              aria-label="Preview"
                            >
                              <Eye className="size-4" />
                            </a>
                          )}
                          {canEditRow && (
                            <button
                              onClick={() => openEdit(row)}
                              className="grid size-9 place-items-center rounded-lg hover:bg-cream"
                              aria-label="Edit"
                            >
                              <Pencil className="size-4" />
                            </button>
                          )}
                          {canArchiveRow && (
                            <button
                              onClick={() => setDeleting(row)}
                              className="grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50"
                              aria-label="Arsipkan"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-primary/10 px-5 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            {count} data · Halaman {Math.min(page, pageCount)} dari {pageCount}
          </span>

          <nav aria-label="Paginasi data admin" className="flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              disabled={page <= 1 || loading || isNavigating}
              onClick={() => updateUrl({ page: String(page - 1) }, false)}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>

            {pageTokens(page, pageCount).map((pageNumber) => (
              <Button
                key={pageNumber}
                variant={pageNumber === page ? "dark" : "secondary"}
                size="icon"
                disabled={loading || isNavigating}
                onClick={() =>
                  updateUrl(
                    { page: pageNumber === 1 ? null : String(pageNumber) },
                    false,
                  )
                }
                aria-current={pageNumber === page ? "page" : undefined}
                aria-label={`Halaman ${pageNumber}`}
              >
                {pageNumber}
              </Button>
            ))}

            <Button
              variant="secondary"
              size="icon"
              disabled={page >= pageCount || loading || isNavigating}
              onClick={() => updateUrl({ page: String(page + 1) }, false)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        </div>
      </div>

      <ResourceFormDialog
        resource={resource}
        record={editing}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSaved={saved}
        workflow={workflow}
      />
      <ConfirmationDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title={`${resource.section === "berita" ? "Arsipkan" : "Hapus"} ${resource.singular}?`}
        description={
          resource.section === "berita"
            ? "Artikel akan dipindahkan ke status Diarsipkan dan tidak tampil di website. Data tidak dihapus permanen."
            : "Data akan dinonaktifkan dan disembunyikan dari website. Tindakan ini dicatat dalam audit log."
        }
      />
    </>
  );
}
