import type { Metadata } from "next";
import Image from "next/image";
import { Check, Heart, Target, Users } from "lucide-react";

import { PageHero } from "@/components/sections/page-hero";
import { SectionHeading } from "@/components/sections/section-heading";
import { getSiteConfig } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Kenali profil, sejarah, visi, misi, kepercayaan, dan pelayanan GMAHK Jemaat Naripan.",
  alternates: { canonical: "/tentang" },
};

const missions = [
  "Membangun jemaat yang berakar dalam Firman dan doa.",
  "Menciptakan persekutuan yang hangat, inklusif, dan saling menguatkan.",
  "Melayani masyarakat melalui tindakan kasih yang relevan.",
  "Memperlengkapi setiap generasi untuk menjadi murid Kristus yang berdampak.",
];

const journey = [
  [
    "Awal Pelayanan",
    "Komunitas bertumbuh melalui persekutuan, doa, dan pembelajaran Firman.",
  ],
  [
    "Melayani Kota",
    "Pelayanan berkembang menjangkau keluarga, anak, pemuda, dan masyarakat.",
  ],
  [
    "Hari Ini",
    "Terus bergerak menjadi gereja yang sehat, relevan, dan setia pada panggilan Kristus.",
  ],
] as const;

const beliefs = [
  "Alkitab sebagai dasar iman",
  "Keselamatan oleh kasih karunia",
  "Hari Sabat sebagai hari perhentian",
  "Hidup sehat secara menyeluruh",
  "Pelayanan setiap anggota",
  "Pengharapan kedatangan Kristus",
];

export default async function AboutPage() {
  const site = await getSiteConfig();

  return (
    <>
      <PageHero
        eyebrow="Tentang Kami"
        title="Bertumbuh bersama, melayani dengan kasih."
        description={`Mengenal perjalanan, panggilan, dan nilai yang menggerakkan keluarga ${site.shortName}.`}
      />

      <section id="profil-gereja" className="section-pad scroll-mt-24 bg-white">
        <div className="container-site grid items-center gap-14 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-[0_24px_70px_rgba(38,53,43,.12)]">
            <Image
              src="https://images.unsplash.com/photo-1491396023581-4344e51fec5c?auto=format&fit=crop&w=1200&q=90"
              alt="Gedung gereja"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          <div>
            <SectionHeading
              eyebrow="Profil Gereja"
              title="Rumah rohani bagi setiap generasi."
            />
            <p className="mt-6 leading-8 text-muted">
              {site.shortName} hadir sebagai komunitas yang menempatkan
              Kristus sebagai pusat kehidupan. Kami beribadah pada hari Sabat,
              mempelajari Alkitab, memelihara persekutuan, serta melayani
              kebutuhan manusia secara utuh.
            </p>
            <p className="mt-4 leading-8 text-muted">
              Informasi sejarah dan identitas pengurus pada halaman ini
              menggunakan placeholder aman dan siap diperbarui setelah data
              resmi tersedia.
            </p>
          </div>
        </div>
      </section>

      <section
        id="visi-dan-misi"
        className="section-pad scroll-mt-24 bg-cream"
      >
        <div className="container-site grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-primary p-8 text-white shadow-[0_20px_60px_rgba(38,53,43,.16)]">
            <Target className="text-gold" aria-hidden="true" />
            <h2 className="mt-6 font-serif text-3xl">Visi</h2>
            <p className="mt-4 leading-7 text-white/65">
              Menjadi komunitas yang mencerminkan kasih Kristus, bertumbuh
              dalam kebenaran, dan membawa pengharapan.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-white p-8 lg:col-span-2">
            <h2 className="font-serif text-3xl text-primary">Misi Kami</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {missions.map((mission) => (
                <p
                  key={mission}
                  className="flex gap-3 text-sm leading-6 text-muted"
                >
                  <Check
                    className="mt-0.5 size-5 shrink-0 text-gold"
                    aria-hidden="true"
                  />
                  {mission}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="sejarah" className="section-pad scroll-mt-24 bg-white">
        <div className="container-site">
          <SectionHeading
            eyebrow="Perjalanan Kami"
            title="Jejak anugerah dalam setiap musim"
          />

          <div className="relative mt-12 border-l border-gold/50 pl-8">
            {journey.map(([title, description], index) => (
              <div key={title} className="relative mb-12 last:mb-0">
                <span className="absolute -left-[2.58rem] top-1 grid size-5 place-items-center rounded-full bg-gold text-[9px] font-bold text-primary">
                  {index + 1}
                </span>
                <h3 className="font-serif text-2xl text-primary">{title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="kepercayaan"
        className="section-pad scroll-mt-24 bg-primary text-white"
      >
        <div className="container-site">
          <SectionHeading
            eyebrow="Kepercayaan"
            title="Iman yang berakar pada Alkitab"
            description="Kami menerima Alkitab sebagai Firman Tuhan dan hidup dalam pengharapan akan kedatangan Kristus."
            light
          />

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {beliefs.map((belief, index) => (
              <div
                key={belief}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-gold/40 hover:bg-white/[0.06]"
              >
                <span className="text-xs font-bold text-gold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 font-serif text-xl">{belief}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pengurus" className="section-pad scroll-mt-24 bg-cream">
        <div className="container-site grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-primary/5 bg-white p-8 shadow-[0_12px_40px_rgba(38,53,43,.05)]">
            <Users className="text-secondary" aria-hidden="true" />
            <h2 className="mt-5 font-serif text-3xl text-primary">
              Pendeta Jemaat
            </h2>
            <p className="mt-4 text-muted">
              {site.pastorName || "Nama pendeta belum diperbarui"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Melayani penggembalaan, pengajaran, dan pertumbuhan rohani
              jemaat.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/5 bg-white p-8 shadow-[0_12px_40px_rgba(38,53,43,.05)]">
            <Heart className="text-secondary" aria-hidden="true" />
            <h2 className="mt-5 font-serif text-3xl text-primary">
              Struktur Pengurus
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Data pengurus tidak dibuat tanpa sumber resmi. Modul admin telah
              disiapkan untuk menambahkan informasi yang telah disetujui.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
