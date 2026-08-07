import type { Metadata } from "next";
import { LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";

import { PrayerRequestForm } from "@/components/forms/public-forms";
import { PageHero } from "@/components/sections/page-hero";

export const metadata: Metadata = {
  title: "Permohonan Doa",
  description:
    "Kirim permohonan doa secara privat kepada tim doa atau tim pastoral GMAHK Naripan.",
  robots: { index: false, follow: false },
};

export default function PrayerPage() {
  return (
    <>
      <PageHero
        eyebrow="Kami Peduli"
        title="Bolehkah kami mendoakan Anda?"
        description="Anda tidak harus menjalani pergumulan seorang diri. Setiap permohonan dijaga dengan penuh kasih dan kerahasiaan."
        image="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1800&q=90"
      />
      <section className="section-pad bg-cream">
        <div className="container-site grid gap-10 lg:grid-cols-[.65fr_1.35fr]">
          <aside className="rounded-2xl bg-primary p-8 text-white lg:self-start">
            <LockKeyhole className="size-9 text-gold" />
            <h2 className="mt-6 font-serif text-3xl">Privat dan aman</h2>
            <p className="mt-4 text-sm leading-7 text-white/65">
              Permohonan doa tidak pernah ditampilkan kepada publik. Anda dapat
              menentukan sendiri siapa yang boleh membacanya.
            </p>

            <div className="mt-7 space-y-4 border-t border-white/10 pt-6 text-sm">
              <div className="flex gap-3">
                <UsersRound className="mt-0.5 size-4 shrink-0 text-gold" />
                <p className="leading-6 text-white/65">
                  <strong className="block text-white">Tim Doa & Pastoral</strong>
                  Untuk permohonan yang boleh dibawa bersama oleh tim doa.
                </p>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
                <p className="leading-6 text-white/65">
                  <strong className="block text-white">Pastoral Saja</strong>
                  Untuk pergumulan yang sangat pribadi dan memerlukan akses lebih
                  terbatas.
                </p>
              </div>
            </div>

            <div className="mt-7 border-t border-white/10 pt-6 text-xs leading-6 text-white/55">
              Jika Anda berada dalam situasi darurat, segera hubungi layanan
              darurat atau tenaga profesional terdekat.
            </div>
          </aside>

          <div className="rounded-2xl border border-primary/10 bg-white p-6 sm:p-10">
            <PrayerRequestForm />
          </div>
        </div>
      </section>
    </>
  );
}
