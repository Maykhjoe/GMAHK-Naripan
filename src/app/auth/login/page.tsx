"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiError = { message?: string };

export default function LoginPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiError;
      if (!response.ok) {
        throw new Error(payload.message || "Login gagal");
      }
      router.push("/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-cream lg:grid-cols-2">
      <section className="hidden bg-primary p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div>
          <p className="font-serif text-5xl leading-tight">
            Kelola pelayanan digital dengan tertib dan aman.
          </p>
          <p className="mt-5 max-w-lg text-white/60">
            Konten, jadwal, permohonan doa, dan komunikasi jemaat dalam satu dashboard.
          </p>
        </div>
        <p className="text-xs text-white/60">GMAHK Naripan · Admin Portal</p>
      </section>

      <section className="grid place-items-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>

          <LockKeyhole className="mt-10 size-9 text-gold lg:mt-0" />
          <h1 className="mt-5 font-serif text-4xl text-primary">Masuk ke Admin</h1>
          <p className="mt-3 text-sm text-muted">
            Masuk menggunakan username dan kata sandi yang diberikan Super Admin.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold">
              Username
              <Input
                className="mt-2"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={32}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
              />
            </label>

            <label className="block text-sm font-semibold">
              Kata sandi
              <span className="relative mt-2 block">
                <Input
                  className="pr-12"
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-muted hover:bg-cream"
                  aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </span>
            </label>

            <p className="text-xs leading-5 text-muted">
              Lupa kata sandi? Hubungi Super Admin untuk melakukan reset akun.
            </p>

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Masuk
            </Button>
          </form>

          {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
            <p className="mt-6 rounded-xl bg-gold/10 p-4 text-xs leading-5 text-muted">
              Mode pengembangan: Supabase belum dikonfigurasi. Route admin dapat dipreview tanpa login.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
