"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, TicketCheck, X } from "lucide-react";
import { eventRegistrationSchema, type EventRegistrationInput } from "@/lib/validations/forms";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { TurnstileWidget, turnstileCanSubmitWithoutToken } from "@/components/forms/turnstile-widget";

type RegistrationResponse = { success?: boolean; mode?: "supabase" | "demo"; message?: string; data?: { eventTitle?: string; registrationId?: string } };
function ErrorText({ message }: { message?: string }) { return message ? <span className="mt-1 block text-xs font-normal text-red-700" role="alert">{message}</span> : null; }

export function EventRegistrationForm({ eventSlug, eventTitle }: { eventSlug: string; eventTitle: string }) {
  const [open, setOpen] = useState(false); const [token, setToken] = useState(""); const [challengeKey, setChallengeKey] = useState(0); const [result, setResult] = useState<RegistrationResponse | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, reset } = useForm<EventRegistrationInput>({ resolver: zodResolver(eventRegistrationSchema), defaultValues: { eventSlug, name: "", whatsapp: "", email: "", peopleCount: 1, notes: "", consent: false } });
  const submit = handleSubmit(async (values) => {
    setError("root.server", { message: "" });
    const response = await fetch("/api/event-registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, turnstileToken: token }) });
    const body = await response.json().catch(() => ({ message: "Respons server tidak valid." })) as RegistrationResponse;
    if (!response.ok) { setError("root.server", { message: body.message ?? "Pendaftaran belum dapat diproses." }); setToken(""); setChallengeKey((value) => value + 1); return; }
    setResult(body); reset();
  });
  function changeOpen(value: boolean) { setOpen(value); if (!value) { setResult(null); setToken(""); } }
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><Button className="mt-7 w-full"><TicketCheck className="size-4" />Daftar Sekarang</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[100] bg-primary/60 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-[101] max-h-[92vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-cream p-6 shadow-2xl sm:p-9">
      <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-secondary">Pendaftaran Kegiatan</p><Dialog.Title className="mt-2 font-serif text-3xl text-primary">{eventTitle}</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-muted">Isi data peserta. Minimal salah satu kontak WhatsApp atau email wajib diisi.</Dialog.Description></div><Dialog.Close className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-muted hover:text-primary" aria-label="Tutup formulir"><X className="size-5" /></Dialog.Close></div>
      {result?.success ? <div className="mt-8 rounded-2xl bg-[#e8f1e9] p-7 text-center" role="status"><CheckCircle2 className="mx-auto size-11 text-secondary" /><h3 className="mt-4 font-serif text-2xl text-primary">Pendaftaran diterima</h3><p className="mt-2 text-sm leading-6 text-muted">{result.mode === "demo" ? "Ini adalah simulasi development; data belum disimpan ke database." : "Data Anda tersimpan. Tim kegiatan akan menghubungi Anda bila ada informasi lanjutan."}</p><Dialog.Close asChild><Button className="mt-6">Selesai</Button></Dialog.Close></div> : <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2" noValidate>
        <input type="hidden" {...register("eventSlug")} />
        <label className="text-sm font-semibold text-primary sm:col-span-2">Nama lengkap<Input className="mt-2" autoComplete="name" {...register("name")} /><ErrorText message={errors.name?.message} /></label>
        <label className="text-sm font-semibold text-primary">WhatsApp<Input className="mt-2" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" {...register("whatsapp")} /><ErrorText message={errors.whatsapp?.message} /></label>
        <label className="text-sm font-semibold text-primary">Email<Input className="mt-2" type="email" autoComplete="email" placeholder="nama@email.com" {...register("email")} /><ErrorText message={errors.email?.message} /></label>
        <label className="text-sm font-semibold text-primary">Jumlah peserta<Input className="mt-2" type="number" min={1} max={20} {...register("peopleCount", { valueAsNumber: true })} /><ErrorText message={errors.peopleCount?.message} /></label>
        <label className="text-sm font-semibold text-primary sm:col-span-2">Catatan <span className="font-normal text-muted">(opsional)</span><Textarea className="mt-2" {...register("notes")} /><ErrorText message={errors.notes?.message} /></label>
        <label className="flex items-start gap-3 rounded-xl border border-primary/10 bg-white p-4 text-sm text-muted sm:col-span-2"><input type="checkbox" className="mt-1 accent-primary" {...register("consent")} /><span>Saya menyetujui pemrosesan data untuk keperluan pendaftaran dan komunikasi kegiatan.<ErrorText message={errors.consent?.message} /></span></label>
        <div className="sm:col-span-2"><TurnstileWidget action="event_registration" onVerify={setToken} onExpire={() => setToken("")} resetKey={challengeKey} /></div>
        {errors.root?.server?.message && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:col-span-2" role="alert">{errors.root.server.message}</p>}
        <div className="flex justify-end gap-3 border-t border-primary/10 pt-5 sm:col-span-2"><Dialog.Close asChild><Button type="button" variant="secondary">Batal</Button></Dialog.Close><Button type="submit" disabled={isSubmitting || (!token && !turnstileCanSubmitWithoutToken)}>{isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <TicketCheck className="size-4" />}Kirim Pendaftaran</Button></div>
      </form>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
