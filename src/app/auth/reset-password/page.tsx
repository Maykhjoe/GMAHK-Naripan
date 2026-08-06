"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { passwordResetSchema } from "@/lib/validations/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/logo";

type Values = z.infer<typeof passwordResetSchema>;
export default function ResetPasswordPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(passwordResetSchema) });
  async function submit(values: Values) {
    setServerError("");
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Tautan pemulihan tidak valid atau telah kedaluwarsa.");
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      await supabase.auth.signOut();
      router.replace("/auth/login?reset=success");
      router.refresh();
    } catch (error) { setServerError(error instanceof Error ? error.message : "Kata sandi tidak dapat diperbarui"); }
  }
  const PasswordIcon = show ? EyeOff : Eye;
  return <main className="grid min-h-screen place-items-center bg-cream px-5"><div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-7 shadow-xl sm:p-10"><Logo /><ShieldCheck className="mt-10 size-9 text-gold" /><h1 className="mt-5 font-serif text-4xl text-primary">Buat kata sandi baru</h1><p className="mt-3 text-sm leading-6 text-muted">Gunakan minimal 8 karakter dengan huruf besar, huruf kecil, dan angka.</p><form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-primary">Kata sandi baru<span className="relative mt-2 block"><Input {...register("password")} className="pr-12" type={show ? "text" : "password"} autoComplete="new-password" /><button type="button" onClick={() => setShow((value) => !value)} className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-muted hover:bg-cream" aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}><PasswordIcon className="size-4" /></button></span></label>{errors.password && <p className="text-sm text-red-700">{errors.password.message}</p>}<label className="block text-sm font-semibold text-primary">Ulangi kata sandi<Input {...register("confirmation")} className="mt-2" type={show ? "text" : "password"} autoComplete="new-password" /></label>{errors.confirmation && <p className="text-sm text-red-700">{errors.confirmation.message}</p>}{serverError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</p>}<Button className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="size-4 animate-spin" />}Simpan Kata Sandi</Button></form></div></main>;
}
