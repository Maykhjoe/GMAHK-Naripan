"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";

import { AuthBrand } from "@/components/auth/auth-brand";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiError = { message?: string };

export default function AcceptInvitePage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(token)) {
      setError("Masukkan kode undangan 6 digit dari email Anda.");
      return;
    }
    if (password.length < 12) {
      setError("Kata sandi baru minimal 12 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password, confirmPassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiError;
      if (!response.ok) {
        throw new Error(payload.message || "Undangan tidak dapat diproses");
      }
      setSuccess(true);
      setToken("");
      setPassword("");
      setConfirmPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Undangan tidak dapat diproses");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-7 shadow-xl sm:p-10">
        <AuthBrand />

        <div className="mt-9 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
            <UserPlus className="size-7" />
          </div>
          <h1 className="mt-5 font-serif text-4xl text-primary">Aktifkan akun admin</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            Masukkan email, kode undangan 6 digit, lalu buat kata sandi pribadi Anda.
          </p>
        </div>

        {success ? (
          <div className="mt-8 space-y-5 text-center">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
              <ShieldCheck className="mx-auto mb-3 size-7" />
              Akun berhasil diaktifkan. Silakan masuk menggunakan kata sandi baru Anda.
            </div>
            <Button asChild className="w-full">
              <Link href="/auth/login">Masuk ke Admin</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold text-primary">
              Email
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <div>
              <p className="mb-3 text-center text-sm font-semibold text-primary">Kode Undangan</p>
              <OtpCodeInput
                value={token}
                onChange={setToken}
                disabled={isSubmitting}
                autoFocus
                label="Kode undangan"
              />
            </div>

            <label className="block text-sm font-semibold text-primary">
              Kata sandi baru
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>

            <label className="block text-sm font-semibold text-primary">
              Ulangi kata sandi
              <Input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>

            <p className="text-xs leading-5 text-muted">
              Gunakan minimal 12 karakter. Super Admin tidak dapat melihat kata sandi yang Anda buat.
            </p>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">
                {error}
              </p>
            )}

            <Button className="w-full" disabled={isSubmitting || token.length !== 6}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Aktifkan Akun
            </Button>
          </form>
        )}

        {!success && (
          <p className="mt-7 text-center text-xs leading-5 text-muted">
            Kode undangan kedaluwarsa? Hubungi Super Admin untuk mengirim undangan baru.
          </p>
        )}
      </div>
    </main>
  );
}
