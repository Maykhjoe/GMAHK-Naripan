"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2 } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { passwordResetRequestSchema } from "@/lib/validations/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/logo";

type Values = z.infer<typeof passwordResetRequestSchema>;
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(passwordResetRequestSchema) });
  async function submit(values: Values) {
    setServerError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` });
      if (error) throw error;
      setSent(true);
    } catch (error) { setServerError(error instanceof Error ? error.message : "Permintaan tidak dapat diproses"); }
  }
  return <main className="grid min-h-screen place-items-center bg-cream px-5"><div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-7 shadow-xl sm:p-10"><Logo /><KeyRound className="mt-10 size-9 text-gold" /><h1 className="mt-5 font-serif text-4xl text-primary">Lupa kata sandi</h1><p className="mt-3 text-sm leading-6 text-muted">Masukkan email admin. Jika akun tersedia, Supabase akan mengirim tautan pemulihan yang aman.</p>{sent ? <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Permintaan telah diproses. Periksa kotak masuk dan folder spam Anda.</div> : <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-primary">Email<Input {...register("email")} className="mt-2" type="email" autoComplete="email" required /></label>{errors.email && <p className="text-sm text-red-700">{errors.email.message}</p>}{serverError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</p>}<Button className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="size-4 animate-spin" />}Kirim Tautan Pemulihan</Button></form>}<Link href="/auth/login" className="mt-7 inline-block text-sm font-semibold text-secondary underline decoration-gold underline-offset-4">Kembali ke halaman masuk</Link></div></main>;
}
