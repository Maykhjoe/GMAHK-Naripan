"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Church,
  ExternalLink,
  Loader2,
  MapPin,
  Save,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  defaultSiteConfig,
  editableSiteConfig,
  type EditableSiteConfig,
} from "@/lib/site/config";

type FieldErrors = Record<string, string[]>;

const initialValues = editableSiteConfig(defaultSiteConfig);

function Field({
  label,
  name,
  value,
  error,
  required,
  help,
  type = "text",
  onChange,
}: {
  label: string;
  name: keyof EditableSiteConfig;
  value: string;
  error?: string;
  required?: boolean;
  help?: string;
  type?: "text" | "email" | "url" | "tel";
  onChange: (name: keyof EditableSiteConfig, value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-primary">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      <Input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {help && <span className="text-xs leading-5 text-muted">{help}</span>}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  value,
  error,
  required,
  help,
  rows = 4,
  onChange,
}: {
  label: string;
  name: keyof EditableSiteConfig;
  value: string;
  error?: string;
  required?: boolean;
  help?: string;
  rows?: number;
  onChange: (name: keyof EditableSiteConfig, value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-primary">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      <Textarea
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {help && <span className="text-xs leading-5 text-muted">{help}</span>}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Church;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-[0_12px_35px_rgba(38,53,43,.04)] sm:p-8">
      <div className="flex items-start gap-4 border-b border-primary/10 pb-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/15 text-secondary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-serif text-2xl text-primary">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-6">{children}</div>
    </section>
  );
}

export function SiteSettingsForm() {
  const [values, setValues] = useState<EditableSiteConfig>(initialValues);
  const [siteUrl, setSiteUrl] = useState(defaultSiteConfig.url);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/admin/pengaturan", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Pengaturan tidak dapat dimuat");
        }

        setValues(result.data as EditableSiteConfig);
        setSiteUrl(String(result.siteUrl ?? defaultSiteConfig.url));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Pengaturan tidak dapat dimuat",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  function updateValue(name: keyof EditableSiteConfig, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });
    setMessage(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage(null);

    const response = await fetch("/api/admin/pengaturan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response
      .json()
      .catch(() => ({ message: "Respons server tidak valid" }));

    if (!response.ok) {
      setErrors((result.errors ?? {}) as FieldErrors);
      setMessage(result.message ?? "Pengaturan tidak dapat disimpan");
      setSaving(false);
      return;
    }

    setValues(result.data as EditableSiteConfig);
    setMessage(result.message ?? "Pengaturan berhasil disimpan");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="grid min-h-64 place-items-center rounded-2xl border border-primary/10 bg-white text-sm text-muted">
        <span className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin" /> Memuat pengaturan…
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {loadError}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/10 bg-primary p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-gold">
            Alamat Website
          </p>
          <p className="mt-2 break-all text-sm text-white/75">{siteUrl}</p>
          <p className="mt-1 text-xs text-white/45">
            Alamat ini dikendalikan melalui NEXT_PUBLIC_SITE_URL agar aman saat deployment.
          </p>
        </div>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold transition hover:bg-white/10"
        >
          Buka Website <ExternalLink className="size-4" />
        </a>
      </div>

      <Section
        icon={Church}
        title="Identitas Gereja"
        description="Informasi utama yang dipakai pada logo, metadata, halaman Tentang, dan identitas website."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Nama Gereja" name="name" value={values.name} error={errors.name?.[0]} required onChange={updateValue} />
          <Field label="Nama Singkat" name="shortName" value={values.shortName} error={errors.shortName?.[0]} required onChange={updateValue} />
          <Field label="Slogan" name="slogan" value={values.slogan} error={errors.slogan?.[0]} required onChange={updateValue} />
          <Field label="Nama Pendeta Jemaat" name="pastorName" value={values.pastorName} error={errors.pastorName?.[0]} help="Boleh dikosongkan sampai data resmi tersedia." onChange={updateValue} />
        </div>
        <TextAreaField label="Deskripsi Website" name="description" value={values.description} error={errors.description?.[0]} required help="Dipakai untuk SEO dan deskripsi umum website." onChange={updateValue} />
      </Section>

      <Section
        icon={MapPin}
        title="Alamat dan Kontak"
        description="Informasi yang muncul pada footer dan halaman Kontak. Nomor kosong tidak akan ditampilkan."
      >
        <TextAreaField label="Alamat Gereja" name="address" value={values.address} error={errors.address?.[0]} required rows={3} onChange={updateValue} />
        <Field label="Link Google Maps" name="mapsUrl" value={values.mapsUrl} error={errors.mapsUrl?.[0]} type="url" help="Kosongkan untuk membuat link pencarian otomatis berdasarkan alamat." onChange={updateValue} />
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Nomor Telepon" name="phone" value={values.phone} error={errors.phone?.[0]} type="tel" onChange={updateValue} />
          <Field label="Nomor WhatsApp" name="whatsapp" value={values.whatsapp} error={errors.whatsapp?.[0]} type="tel" help="Contoh: 0812-3456-7890" onChange={updateValue} />
          <Field label="Email" name="email" value={values.email} error={errors.email?.[0]} required type="email" onChange={updateValue} />
          <Field label="Jam Sekretariat" name="secretariatHours" value={values.secretariatHours} error={errors.secretariatHours?.[0]} onChange={updateValue} />
        </div>
      </Section>

      <Section
        icon={Share2}
        title="Media Sosial dan Live"
        description="Gunakan URL lengkap. Kolom yang dikosongkan tidak akan ditampilkan pada website."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Instagram" name="instagram" value={values.instagram} error={errors.instagram?.[0]} type="url" onChange={updateValue} />
          <Field label="Nama Akun Instagram" name="instagramLabel" value={values.instagramLabel} error={errors.instagramLabel?.[0]} onChange={updateValue} />
          <Field label="YouTube" name="youtube" value={values.youtube} error={errors.youtube?.[0]} type="url" onChange={updateValue} />
          <Field label="Nama Kanal YouTube" name="youtubeLabel" value={values.youtubeLabel} error={errors.youtubeLabel?.[0]} onChange={updateValue} />
        </div>
        <Field label="Link Live Streaming" name="liveUrl" value={values.liveUrl} error={errors.liveUrl?.[0]} type="url" help="Bisa berupa URL YouTube Live atau halaman siaran resmi." onChange={updateValue} />
      </Section>

      <Section
        icon={CheckCircle2}
        title="Footer"
        description="Teks singkat yang menjelaskan karakter dan pelayanan gereja."
      >
        <TextAreaField label="Teks Footer" name="footerText" value={values.footerText} error={errors.footerText?.[0]} required rows={4} onChange={updateValue} />
      </Section>

      {message && (
        <div
          role="status"
          className={`rounded-2xl border p-4 text-sm ${
            Object.keys(errors).length
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="sticky bottom-4 z-10 flex justify-end rounded-2xl border border-primary/10 bg-white/95 p-4 shadow-xl backdrop-blur">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Simpan Pengaturan
        </Button>
      </div>
    </form>
  );
}
