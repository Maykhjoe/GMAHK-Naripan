"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm, useWatch } from "react-hook-form";
import {
  ImageIcon,
  Loader2,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getOptionLabel,
  getOptionValue,
  type AdminField,
  type AdminFieldOption,
  type AdminResource,
} from "@/lib/admin/resources";

export type AdminRecord = Record<string, unknown> & { id: string };
type FormValues = Record<string, string | number | boolean>;
type UploadResult = {
  id: string;
  url: string;
  file_name: string;
};

function textFromLineItem(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const label = [record.item, record.title, record.name].find(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  );
  const time = typeof record.time === "string" ? record.time.trim() : "";

  if (time && label) {
    return `${time} — ${label}`;
  }

  return label ?? "";
}

function valueAtPath(record: AdminRecord | null, path?: string) {
  if (!record || !path) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, record);
}

function sourceValue(record: AdminRecord | null, field: AdminField) {
  const directValue = record?.[field.key];

  if (directValue !== undefined && directValue !== null) {
    return directValue;
  }

  const nestedValue = valueAtPath(record, field.sourcePath);

  if (nestedValue !== undefined && nestedValue !== null) {
    return nestedValue;
  }

  return field.defaultValue;
}

function formValue(value: unknown, field: AdminField) {
  if (value == null) {
    return field.type === "checkbox" ? false : "";
  }

  if (field.format === "paragraphs") {
    if (typeof value === "string") {
      return value;
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "paragraphs" in value
    ) {
      const paragraphs = (value as { paragraphs: unknown }).paragraphs;

      if (Array.isArray(paragraphs)) {
        return paragraphs
          .filter((item): item is string => typeof item === "string")
          .join("\n\n");
      }
    }

    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string")
        .join("\n\n");
    }
  }

  if (field.format === "lines" && Array.isArray(value)) {
    return value.map(textFromLineItem).filter(Boolean).join("\n");
  }

  if (field.format === "setting-value") {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    return JSON.stringify(value, null, 2);
  }

  if (field.type === "datetime-local" && typeof value === "string") {
    return value.slice(0, 16);
  }

  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  return "";
}

function fieldRows(field: AdminField) {
  if (field.format === "paragraphs") {
    return 12;
  }

  if (field.format === "lines") {
    return 7;
  }

  return 5;
}

export function ResourceFormDialog({
  resource,
  record,
  open,
  onOpenChange,
  onSaved,
}: {
  resource: AdminResource;
  record: AdminRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (record: AdminRecord) => void;
}) {
  const [remoteOptions, setRemoteOptions] = useState<
    Record<string, AdminFieldOption[]>
  >({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const watchedValues = useWatch({ control }) as Partial<FormValues>;

  useEffect(() => {
    reset(
      Object.fromEntries(
        resource.fields.map((field) => [
          field.key,
          formValue(sourceValue(record, field), field),
        ]),
      ),
    );
  }, [record, resource, reset, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const remoteFields = resource.fields.filter(
      (field) => field.optionsEndpoint,
    );

    if (remoteFields.length === 0) {
      return;
    }

    const controller = new AbortController();

    void Promise.all(
      remoteFields.map(async (field) => {
        const response = await fetch(field.optionsEndpoint!, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response
          .json()
          .catch(() => ({ data: [] as AdminFieldOption[] }));

        if (!response.ok) {
          throw new Error(result.message ?? "Pilihan tidak dapat dimuat");
        }

        return [field.key, result.data ?? []] as const;
      }),
    )
      .then((entries) => {
        setRemoteOptions((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setUploadMessage(
            error instanceof Error
              ? error.message
              : "Pilihan form tidak dapat dimuat",
          );
        }
      });

    return () => controller.abort();
  }, [open, resource]);

  async function uploadImage(field: AdminField, file: File) {
    if (!field.uploadEndpoint) {
      return;
    }

    setUploadingField(field.key);
    setUploadMessage(null);

    const form = new FormData();
    form.set("file", file);
    form.set(
      "altText",
      String(getValues("title") || getValues("name") || "Gambar konten"),
    );

    const response = await fetch(field.uploadEndpoint, {
      method: "POST",
      body: form,
    });
    const result = await response
      .json()
      .catch(() => ({ message: "Respons upload tidak valid" }));

    if (!response.ok) {
      setUploadMessage(result.message ?? "Gambar tidak dapat diunggah");
      setUploadingField(null);
      return;
    }

    const uploaded = result.data as UploadResult;
    setValue(field.key, uploaded.id, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (field.urlField) {
      setValue(field.urlField, uploaded.url, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    setUploadingField(null);
  }

  const submit = handleSubmit(async (values) => {
    const payload = Object.fromEntries(
      resource.fields.map((field) => {
        let value: unknown = values[field.key];

        if (field.type === "datetime-local" && value) {
          value = new Date(String(value)).toISOString();
        }

        if (field.type === "number" && Number.isNaN(value)) {
          value = "";
        }

        return [field.key, value];
      }),
    );

    const response = await fetch(
      record
        ? `/api/admin/${resource.section}/${record.id}`
        : `/api/admin/${resource.section}`,
      {
        method: record ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const result = await response
      .json()
      .catch(() => ({ message: "Respons server tidak valid" }));

    if (!response.ok) {
      const firstFieldError = result.errors
        ? Object.values(result.errors)
            .flat()
            .find((message): message is string => typeof message === "string")
        : null;

      setError("root.server", {
        message:
          firstFieldError ?? result.message ?? "Data tidak dapat disimpan",
      });
      return;
    }

    onSaved(result.data as AdminRecord);
    onOpenChange(false);
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-primary/55 backdrop-blur-sm" />

        <Dialog.Content className="fixed inset-y-0 right-0 z-[101] w-full max-w-2xl overflow-y-auto bg-cream p-6 shadow-2xl sm:p-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-secondary">
                {record ? "Edit" : "Tambah"} Konten
              </p>

              <Dialog.Title className="mt-2 font-serif text-3xl text-primary">
                {record
                  ? `Edit ${resource.singular}`
                  : `Tambah ${resource.singular}`}
              </Dialog.Title>

              <Dialog.Description className="mt-2 text-sm text-muted">
                Isi data pada form berikut. Data teknis seperti slug dan SEO
                akan dibuat otomatis oleh sistem.
              </Dialog.Description>
            </div>

            <Dialog.Close
              className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-muted hover:text-primary"
              aria-label="Tutup"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2">
            {resource.fields.map((field) => {
              if (field.hidden) {
                return (
                  <input
                    key={field.key}
                    type="hidden"
                    {...register(field.key)}
                  />
                );
              }

              const wide = field.type === "textarea" || field.type === "image";

              if (field.type === "checkbox") {
                return (
                  <label
                    key={field.key}
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-primary/10 bg-white px-4 text-sm font-semibold text-primary sm:col-span-2"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      {...register(field.key)}
                    />
                    {field.label}
                  </label>
                );
              }

              if (field.type === "image") {
                const previewUrl = field.urlField
                  ? String(watchedValues[field.urlField] ?? "")
                  : "";
                const selectedId = String(watchedValues[field.key] ?? "");
                const uploading = uploadingField === field.key;

                return (
                  <div
                    key={field.key}
                    className="text-sm font-semibold text-primary sm:col-span-2"
                  >
                    <span>{field.label}</span>
                    {field.required && (
                      <span className="ml-1 text-red-700">*</span>
                    )}

                    <input type="hidden" {...register(field.key)} />

                    <div className="mt-2 overflow-hidden rounded-2xl border border-primary/10 bg-white">
                      {previewUrl ? (
                        <div
                          role="img"
                          aria-label={`Preview ${field.label}`}
                          className="aspect-[16/8] bg-cover bg-center"
                          style={{ backgroundImage: `url(${previewUrl})` }}
                        />
                      ) : (
                        <div className="grid aspect-[16/6] place-items-center bg-cream text-muted">
                          <div className="text-center">
                            <ImageIcon className="mx-auto size-8" />
                            <p className="mt-2 text-xs font-normal">
                              Belum ada gambar utama
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-secondary">
                          {uploading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <UploadCloud className="size-4" />
                          )}
                          {uploading ? "Mengunggah…" : "Pilih gambar"}
                          <input
                            type="file"
                            accept={field.accept}
                            className="sr-only"
                            disabled={uploading}
                            onChange={(event) => {
                              const file = event.target.files?.[0];

                              if (file) {
                                void uploadImage(field, file);
                              }

                              event.target.value = "";
                            }}
                          />
                        </label>

                        {(previewUrl || selectedId) && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 hover:text-red-800"
                            onClick={() => {
                              setValue(field.key, "", {
                                shouldDirty: true,
                                shouldValidate: true,
                              });

                              if (field.urlField) {
                                setValue(field.urlField, "", {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                            Hapus dari artikel
                          </button>
                        )}
                      </div>
                    </div>

                    {field.help && (
                      <span className="mt-1 block text-xs font-normal text-muted">
                        {field.help}
                      </span>
                    )}
                  </div>
                );
              }

              const options =
                field.options ?? remoteOptions[field.key] ?? ([] as const);
              const selectField =
                field.type === "select" || field.type === "relation";

              return (
                <label
                  key={field.key}
                  className={`text-sm font-semibold text-primary ${
                    wide ? "sm:col-span-2" : ""
                  }`}
                >
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-red-700">*</span>
                  )}

                  {selectField ? (
                    <select
                      required={field.required}
                      className="mt-2 h-12 w-full rounded-xl border border-primary/15 bg-white px-4 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                      {...register(field.key)}
                    >
                      {!options.some(
                        (option) => getOptionValue(option) === "",
                      ) && <option value="">Pilih…</option>}

                      {options.map((option) => {
                        const value = getOptionValue(option);

                        return (
                          <option key={`${field.key}-${value}`} value={value}>
                            {getOptionLabel(option)}
                          </option>
                        );
                      })}
                    </select>
                  ) : wide ? (
                    <textarea
                      required={field.required}
                      rows={fieldRows(field)}
                      placeholder={field.placeholder}
                      className="mt-2 w-full rounded-xl border border-primary/15 bg-white px-4 py-3 font-normal leading-7 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                      {...register(field.key)}
                    />
                  ) : (
                    <Input
                      required={field.required}
                      className="mt-2 bg-white"
                      type={field.type}
                      placeholder={field.placeholder}
                      {...register(
                        field.key,
                        field.type === "number"
                          ? { valueAsNumber: true }
                          : undefined,
                      )}
                    />
                  )}

                  {field.help && (
                    <span className="mt-1 block text-xs font-normal text-muted">
                      {field.help}
                    </span>
                  )}
                </label>
              );
            })}

            {uploadMessage && (
              <p
                role="alert"
                className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2"
              >
                {uploadMessage}
              </p>
            )}

            {errors.root?.server?.message && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-4 text-sm text-red-800 sm:col-span-2"
              >
                {errors.root.server.message}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-primary/10 pt-6 sm:col-span-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Batal
                </Button>
              </Dialog.Close>

              <Button
                type="submit"
                disabled={isSubmitting || Boolean(uploadingField)}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {record ? "Simpan Perubahan" : "Buat Konten"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
