"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { passwordResetRequestSchema } from "@/lib/validations/forms";

type Values = z.infer<typeof passwordResetRequestSchema>;
type ApiError = { message?: string };

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(passwordResetRequestSchema),
  });

  async function submit(values: Values) {
    setServerError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json().catch(() => ({}))) as ApiError;

      if (!response.ok) {
        throw new Error(payload.message || "Permintaan tidak dapat diproses");
      }

      setSent(true);
      router.push("/auth/verify-reset");
    } catch (caught) {
      setServerError(
        caught instanceof Error
          ? caught.message
          : "Permintaan tidak dapat diproses",
      );
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-7 shadow-xl sm:p-10">
        {/* Branding */}
        <div className="flex flex-col items-center text-center">
          <Image
            src="/images/logo-adventist-green.svg"
            alt="Logo Gereja Masehi Advent Hari Ketujuh"
            width={82}
            height={82}
            priority
            className="h-auto w-[82px]"
          />

          <div className="mt-4">
            <p className="text-base font-bold tracking-[0.08em] text-primary">
              GMAHK NARIPAN
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.25em] text-muted">
              Bersama Dalam Kristus
            </p>
          </div>
        </div>

        {/* Heading */}
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
            <KeyRound className="size-7" />
          </div>

          <h1 className="mt-5 font-serif text-4xl text-primary">
            Lupa kata sandi
          </h1>

          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            Masukkan email admin. Jika akun tersedia, sistem akan mengirim
            tautan pemulihan yang aman.
          </p>
        </div>

        {sent ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm leading-6 text-emerald-900">
            Permintaan telah diproses. Periksa kotak masuk dan folder spam Anda.
          </div>
        ) : (
          <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold text-primary">
              Email
              <Input
                {...register("email")}
                className="mt-2"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            {errors.email && (
              <p className="text-sm text-red-700">{errors.email.message}</p>
            )}

            {serverError && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Kirim Tautan Pemulihan
            </Button>
          </form>
        )}

        <div className="mt-7 text-center">
          <Link
            href="/auth/login"
            className="inline-block text-sm font-semibold text-secondary underline decoration-gold underline-offset-4 transition-colors hover:text-primary"
          >
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </main>
  );
}
