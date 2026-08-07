"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Send,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { TurnstileWidget, turnstileCanSubmitWithoutToken } from "@/components/forms/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  contactSchema,
  prayerRequestSchema,
  visitorSchema,
  type ContactInput,
  type PrayerRequestInput,
  type VisitorInput,
} from "@/lib/validations/forms";

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-xs text-red-700" role="alert">
      {message}
    </p>
  ) : null;
}

function FormError({ message }: { message: string | null }) {
  return message ? (
    <div
      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      role="alert"
    >
      {message}
    </div>
  ) : null;
}

function canSubmit(token: string) {
  return Boolean(token) || turnstileCanSubmitWithoutToken;
}

async function submitForm(url: string, data: object, turnstileToken: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, turnstileToken }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message ?? "Formulir belum dapat dikirim. Silakan coba kembali.",
    );
  }

  return result;
}

export function PrayerRequestForm() {
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PrayerRequestInput>({
    resolver: zodResolver(prayerRequestSchema),
    defaultValues: {
      anonymous: false,
      sharingScope: "prayer_team",
      mayContact: false,
      privacyConsent: false,
    },
  });

  if (sent) {
    return (
      <Success
        title="Permohonan doa Anda telah kami terima."
        text="Terima kasih telah mempercayakan pergumulan Anda. Permohonan akan diteruskan sesuai pilihan akses yang Anda tentukan."
      />
    );
  }

  const submit = handleSubmit(async (data) => {
    setFormError(null);

    try {
      await submitForm("/api/prayer-requests", data, token);
      setSent(true);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Formulir belum dapat dikirim.",
      );
      setToken("");
      setChallengeKey((value) => value + 1);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormError message={formError} />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-primary">
          Nama
          <Input
            className="mt-2"
            placeholder="Nama Anda"
            {...register("name")}
          />
          <FieldError message={errors.name?.message} />
        </label>

        <label className="text-sm font-semibold text-primary">
          Kategori
          <select
            className="mt-2 h-12 w-full rounded-xl border border-primary/15 bg-white px-4 text-sm"
            {...register("category")}
          >
            <option value="">Pilih kategori</option>
            {[
              "Kesehatan",
              "Keluarga",
              "Pekerjaan",
              "Pendidikan",
              "Kerohanian",
              "Ucapan syukur",
              "Lainnya",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <FieldError message={errors.category?.message} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-primary">
          WhatsApp <span className="font-normal text-muted">(opsional)</span>
          <Input
            className="mt-2"
            placeholder="08xxxxxxxxxx"
            {...register("whatsapp")}
          />
          <FieldError message={errors.whatsapp?.message} />
        </label>

        <label className="text-sm font-semibold text-primary">
          Email <span className="font-normal text-muted">(opsional)</span>
          <Input
            className="mt-2"
            type="email"
            placeholder="nama@email.com"
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </label>
      </div>

      <label className="block text-sm font-semibold text-primary">
        Isi permohonan doa
        <Textarea
          className="mt-2 min-h-40"
          placeholder="Tuliskan permohonan Anda di sini…"
          {...register("request")}
        />
        <FieldError message={errors.request?.message} />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold text-primary">
          Siapa yang Anda inginkan untuk mendoakan permohonan ini?
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/10 bg-cream p-4 transition has-[:checked]:border-secondary has-[:checked]:bg-[#e8f1e9]">
            <input
              type="radio"
              value="prayer_team"
              className="mt-1 accent-primary"
              {...register("sharingScope")}
            />
            <span>
              <span className="flex items-center gap-2 font-semibold text-primary">
                <UsersRound className="size-4 text-secondary" />
                Tim Pendoa Jemaat
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Permohonan diterima oleh Tim Pendoa Jemaat yang telah diberi akses pelayanan.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/10 bg-cream p-4 transition has-[:checked]:border-secondary has-[:checked]:bg-[#e8f1e9]">
            <input
              type="radio"
              value="pastor"
              className="mt-1 accent-primary"
              {...register("sharingScope")}
            />
            <span>
              <span className="flex items-center gap-2 font-semibold text-primary">
                <ShieldCheck className="size-4 text-secondary" />
                Pendeta/Gembala Jemaat
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Permohonan hanya diterima oleh Pendeta/Gembala Jemaat.
              </span>
            </span>
          </label>
        </div>
        <FieldError message={errors.sharingScope?.message} />
      </fieldset>

      <div className="space-y-3 rounded-xl bg-cream p-4 text-sm text-muted">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 accent-primary"
            {...register("anonymous")}
          />
          Nama saya disembunyikan saat permohonan dibaca oleh tim yang berwenang.
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 accent-primary"
            {...register("mayContact")}
          />
          Saya bersedia dihubungi untuk dukungan pelayanan.
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 accent-primary"
            {...register("privacyConsent")}
          />
          Saya menyetujui pemrosesan data sesuai kebijakan privasi.
        </label>
        <FieldError message={errors.privacyConsent?.message} />
      </div>

      <TurnstileWidget
        action="prayer"
        onVerify={setToken}
        onExpire={() => setToken("")}
        resetKey={challengeKey}
      />

      <p className="flex items-center gap-2 text-xs text-muted">
        <LockKeyhole className="size-4 text-secondary" />
        Data tidak ditampilkan kepada publik dan akses mengikuti pilihan Anda.
      </p>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || !canSubmit(token)}
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Kirim Permohonan Doa
      </Button>
    </form>
  );
}

export function VisitorForm() {
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VisitorInput>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      peopleCount: 1,
      bringingChildren: false,
      privacyConsent: false,
    },
  });

  if (sent) {
    return (
      <Success
        title="Kami menantikan kedatangan Anda!"
        text="Tim penyambut akan menghubungi Anda melalui WhatsApp untuk membantu kunjungan pertama."
      />
    );
  }

  const submit = handleSubmit(async (data) => {
    setFormError(null);

    try {
      await submitForm("/api/visitor-forms", data, token);
      setSent(true);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Formulir belum dapat dikirim.",
      );
      setToken("");
      setChallengeKey((value) => value + 1);
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <FormError message={formError} />
      </div>

      <label className="text-sm font-semibold">
        Nama
        <Input className="mt-2" {...register("name")} />
        <FieldError message={errors.name?.message} />
      </label>

      <label className="text-sm font-semibold">
        Nomor WhatsApp
        <Input className="mt-2" {...register("whatsapp")} />
        <FieldError message={errors.whatsapp?.message} />
      </label>

      <label className="text-sm font-semibold">
        Tanggal kunjungan
        <Input className="mt-2" type="date" {...register("visitDate")} />
        <FieldError message={errors.visitDate?.message} />
      </label>

      <label className="text-sm font-semibold">
        Jumlah orang
        <Input
          className="mt-2"
          type="number"
          min="1"
          {...register("peopleCount", { valueAsNumber: true })}
        />
      </label>

      <label className="flex items-center gap-3 rounded-xl bg-cream p-4 text-sm">
        <input
          type="checkbox"
          className="accent-primary"
          {...register("bringingChildren")}
        />
        Saya membawa anak
      </label>

      <label className="text-sm font-semibold sm:col-span-2">
        Catatan <span className="font-normal text-muted">(opsional)</span>
        <Textarea className="mt-2" {...register("notes")} />
      </label>

      <label className="flex items-start gap-3 rounded-xl bg-cream p-4 text-sm text-muted sm:col-span-2">
        <input
          type="checkbox"
          className="mt-1 accent-primary"
          {...register("privacyConsent")}
        />
        Saya menyetujui penggunaan data untuk membantu dan menindaklanjuti
        rencana kunjungan ini.
      </label>
      <div className="sm:col-span-2">
        <FieldError message={errors.privacyConsent?.message} />
      </div>

      <div className="sm:col-span-2">
        <TurnstileWidget
          action="visitor"
          onVerify={setToken}
          onExpire={() => setToken("")}
          resetKey={challengeKey}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || !canSubmit(token)}
        className="sm:col-span-2 sm:w-fit"
      >
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Kirim Rencana Kunjungan
      </Button>
    </form>
  );
}

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { privacyConsent: false },
  });

  if (sent) {
    return (
      <Success
        title="Pesan Anda telah terkirim."
        text="Terima kasih telah menghubungi kami. Tim sekretariat akan merespons secepatnya pada jam pelayanan."
      />
    );
  }

  const submit = handleSubmit(async (data) => {
    setFormError(null);

    try {
      await submitForm("/api/contact", data, token);
      setSent(true);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Formulir belum dapat dikirim.",
      );
      setToken("");
      setChallengeKey((value) => value + 1);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormError message={formError} />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Nama
          <Input className="mt-2" {...register("name")} />
          <FieldError message={errors.name?.message} />
        </label>

        <label className="text-sm font-semibold">
          Email
          <Input className="mt-2" type="email" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </label>
      </div>

      <label className="block text-sm font-semibold">
        Telepon <span className="font-normal text-muted">(opsional)</span>
        <Input className="mt-2" {...register("phone")} />
        <FieldError message={errors.phone?.message} />
      </label>

      <label className="block text-sm font-semibold">
        Subjek
        <Input className="mt-2" {...register("subject")} />
        <FieldError message={errors.subject?.message} />
      </label>

      <label className="block text-sm font-semibold">
        Pesan
        <Textarea className="mt-2 min-h-36" {...register("message")} />
        <FieldError message={errors.message?.message} />
      </label>

      <label className="flex items-start gap-3 rounded-xl bg-cream p-4 text-sm text-muted">
        <input
          type="checkbox"
          className="mt-1 accent-primary"
          {...register("privacyConsent")}
        />
        Saya menyetujui penggunaan data untuk menjawab pesan ini sesuai
        kebijakan privasi.
      </label>
      <FieldError message={errors.privacyConsent?.message} />

      <TurnstileWidget
        action="contact"
        onVerify={setToken}
        onExpire={() => setToken("")}
        resetKey={challengeKey}
      />

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || !canSubmit(token)}
      >
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Kirim Pesan
      </Button>

      <p className="text-xs text-muted">
        Formulir dilindungi Cloudflare Turnstile dan rate limiting di server.
      </p>
    </form>
  );
}

function Success({ title, text }: { title: string; text: string }) {
  return (
    <div
      className="rounded-2xl bg-[#e8f1e9] p-8 text-center"
      role="status"
    >
      <CheckCircle2 className="mx-auto size-12 text-secondary" />
      <h3 className="mt-5 font-serif text-3xl text-primary">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
        {text}
      </p>
    </div>
  );
}
