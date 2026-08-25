"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, Loader2, MailCheck } from "lucide-react";

import { AuthBrand } from "@/components/auth/auth-brand";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiError = { message?: string };

export default function VerifyResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Masukkan alamat email yang menerima kode.");
      return;
    }
    if (!/^\d{6}$/.test(token)) {
      setError("Masukkan kode 6 digit dari email Anda.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiError;
      if (!response.ok) {
        throw new Error(payload.message || "Kode tidak dapat diverifikasi");
      }
      router.replace("/auth/reset-password");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kode tidak dapat diverifikasi");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    setError("");
    setResent(false);
    if (!email.trim()) {
      setError("Masukkan alamat email terlebih dahulu.");
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiError;
      if (!response.ok) {
        throw new Error(payload.message || "Kode baru belum dapat dikirim");
      }
      setToken("");
      setResent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kode baru belum dapat dikirim");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-7 shadow-xl sm:p-10">
        <AuthBrand />

        <div className="mt-9 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
            <MailCheck className="size-7" />
          </div>
          <h1 className="mt-5 font-serif text-4xl text-primary">Verifikasi kode</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            Masukkan kode 6 digit yang dikirim ke email admin untuk melanjutkan pemulihan kata sandi.
          </p>
        </div>

        <form onSubmit={verify} className="mt-8 space-y-6">
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
            <p className="mb-3 text-center text-sm font-semibold text-primary">Kode OTP</p>
            <OtpCodeInput
              value={token}
              onChange={setToken}
              disabled={isSubmitting}
              autoFocus
              label="Kode pemulihan"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">
              {error}
            </p>
          )}

          {resent && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
              Permintaan kode baru telah diproses. Periksa kotak masuk dan folder spam.
            </p>
          )}

          <Button className="w-full" disabled={isSubmitting || token.length !== 6}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Verifikasi dan Lanjutkan
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-center text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={isResending}
            className="font-semibold text-secondary underline decoration-gold underline-offset-4 disabled:opacity-50"
          >
            {isResending ? "Mengirim ulang..." : "Kirim ulang kode"}
          </button>
          <Link href="/auth/login" className="font-semibold text-secondary underline decoration-gold underline-offset-4">
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </main>
  );
}
