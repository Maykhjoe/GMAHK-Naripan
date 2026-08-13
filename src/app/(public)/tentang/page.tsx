import type { Metadata } from "next";
import Image from "next/image";
import {
  CalendarRange,
  Check,
  Mail,
  Phone,
  Target,
  UserRound,
} from "lucide-react";

import { PageHero } from "@/components/sections/page-hero";
import { SectionHeading } from "@/components/sections/section-heading";
import { getPublishedLeaders } from "@/lib/data/leaders";
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
    "Sejak tahun 1935, gereja ini berdiri sebagai lilin kecil yang menyala di wilayah Jawa Barat, menghadirkan terang Injil, persekutuan, dan pengharapan bagi banyak jiwa.",
  ],
  [
    "Pelopor Pergerakan Penginjilan",
    "Seiring berjalannya waktu, gereja ini bertumbuh menjadi salah satu pelopor pergerakan penginjilan Gereja Masehi Advent Hari Ketujuh di Jawa Barat, yang melahirkan sekitar 49 gereja dan cabang Sekolah Sabat.",
  ],
  [
    "Hari Ini",
    "Kini, gereja ini terus melangkah sebagai salah satu pusat penginjilan yang strategis di wilayah Jawa Barat, khususnya Kota Bandung, dengan tetap setia melayani, membina, dan menjangkau masyarakat bagi Kristus.",
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
  const [site, leaders] = await Promise.all([
    getSiteConfig(),
    getPublishedLeaders(),
  ]);

  const displayedLeaders = leaders.length
    ? leaders
    : site.pastorName
      ? [
          {
            id: "fallback-pastor",
            name: site.pastorName,
            position: "Pendeta Jemaat",
            bio: "Melayani penggembalaan, pengajaran, dan pertumbuhan rohani jemaat.",
            period: null,
            phone: null,
            email: null,
            photoUrl: null,
            displayOrder: 0,
          },
        ]
      : [];

  return (
    <>
      <PageHero
        eyebrow="Tentang Kami"
        title="Bertumbuh bersama, melayani dengan kasih."
        description={`Mengenal perjalanan, panggilan, dan nilai yang menggerakkan keluarga ${site.shortName}.`}
        image="/images/about-hero.jpg"
      />

      <section id="profil-gereja" className="section-pad scroll-mt-24 bg-white">
        <div className="container-site grid items-center gap-14 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-[0_24px_70px_rgba(38,53,43,.12)]">
            <Image
              src="/images/naripan.jpg"
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
              {site.shortName} Sejak tahun 1935, GMAHK Naripan hadir sebagai
              rumah rohani bagi jemaat dan masyarakat, dengan menempatkan
              Kristus sebagai pusat kehidupan. Kami beribadah pada hari Sabat,
              mempelajari Alkitab, membangun persekutuan, dan bertumbuh bersama
              dalam iman serta pengharapan. Sebagai bagian dari pelayanan
              gereja, GMAHK Naripan rindu melayani setiap generasi secara utuh
              melalui pembinaan rohani, kebersamaan jemaat, dan perhatian
              terhadap kebutuhan sesama. Kami percaya gereja bukan sekadar
              tempat beribadah, melainkan komunitas iman yang menghadirkan kasih
              Tuhan secara nyata.
            </p>
            <p className="mt-4 leading-8 text-muted">
              Informasi pelayanan dan pengurus ditampilkan dari data resmi yang
              dikelola melalui dashboard gereja, sehingga dapat terus diperbarui
              sesuai kebutuhan pelayanan jemaat.
            </p>
          </div>
        </div>
      </section>

      <section id="visi-dan-misi" className="section-pad scroll-mt-24 bg-cream">
        <div className="container-site grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-primary p-8 text-white shadow-[0_20px_60px_rgba(38,53,43,.16)]">
            <Target className="text-gold" aria-hidden="true" />
            <h2 className="mt-6 font-serif text-3xl">Visi</h2>
            <p className="mt-4 leading-7 text-white/65">
              ” Selaras dengan wahyu Alkitab, GMAHK melihat sebagai klimaks dari
              rencana Allah untuk memulihkan segenap ciptaan-Nya untuk menjadi
              selaras sepenuhnya dengan kehendak dan kebenaran-Nya.”
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
        <div className="container-site">
          <SectionHeading
            eyebrow="Pengurus Gereja"
            title="Melayani dengan hati seorang hamba"
            description="Kenali para pelayan yang dipercayakan untuk mendampingi, mengajar, dan melayani keluarga jemaat."
          />

          {displayedLeaders.length ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayedLeaders.map((leader) => (
                <article
                  key={leader.id}
                  className="group overflow-hidden rounded-[1.75rem] border border-primary/10 bg-white shadow-[0_16px_50px_rgba(38,53,43,.07)] transition duration-500 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_24px_70px_rgba(38,53,43,.12)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-primary/5">
                    {leader.photoUrl ? (
                      <Image
                        src={leader.photoUrl}
                        alt={`Foto ${leader.name}`}
                        fill
                        className="object-cover object-top transition duration-700 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_top,_rgba(199,164,87,.22),_transparent_55%),linear-gradient(135deg,#eef0e9,#dfe5dc)]">
                        <div className="grid size-24 place-items-center rounded-full border border-primary/10 bg-white/70 text-primary shadow-lg backdrop-blur-sm">
                          <UserRound className="size-11" aria-hidden="true" />
                        </div>
                      </div>
                    )}

                    <span className="absolute bottom-4 left-4 rounded-full bg-primary/90 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                      {leader.position}
                    </span>
                  </div>

                  <div className="p-6 sm:p-7">
                    <h2 className="font-serif text-2xl text-primary">
                      {leader.name}
                    </h2>

                    {leader.period && (
                      <p className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                        <CalendarRange className="size-4" aria-hidden="true" />
                        Periode {leader.period}
                      </p>
                    )}

                    {leader.bio && (
                      <p className="mt-4 line-clamp-4 text-sm leading-7 text-muted">
                        {leader.bio}
                      </p>
                    )}

                    {(leader.phone || leader.email) && (
                      <div className="mt-6 space-y-3 border-t border-primary/10 pt-5 text-sm">
                        {leader.phone && (
                          <a
                            href={`tel:${leader.phone.replace(/[^+\d]/g, "")}`}
                            className="flex w-fit items-center gap-3 text-muted transition-colors hover:text-primary"
                          >
                            <Phone
                              className="size-4 shrink-0 text-gold"
                              aria-hidden="true"
                            />
                            {leader.phone}
                          </a>
                        )}

                        {leader.email && (
                          <a
                            href={`mailto:${leader.email}`}
                            className="flex w-fit items-center gap-3 break-all text-muted transition-colors hover:text-primary"
                          >
                            <Mail
                              className="size-4 shrink-0 text-gold"
                              aria-hidden="true"
                            />
                            {leader.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-[1.75rem] border border-dashed border-primary/20 bg-white p-10 text-center">
              <UserRound
                className="mx-auto size-10 text-secondary"
                aria-hidden="true"
              />
              <h2 className="mt-5 font-serif text-2xl text-primary">
                Data pengurus sedang diperbarui
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
                Informasi pengurus akan ditampilkan setelah data resmi
                dipublikasikan melalui dashboard admin.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
