import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Navigation,
  Play,
  ShieldCheck,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

import {
  EventCard,
  SermonCard,
  MinistryCard,
  ServiceScheduleCard,
  ArticleCard,
} from "@/components/cards/content-cards";

import { MotionProvider } from "@/components/motion/motion-provider";
import { PublicMotionChrome } from "@/components/motion/public-motion-chrome";

import {
  heroReveal,
  MotionDiv,
  MotionSection,
  scaleIn,
} from "@/components/motion/motion-section";

import { SectionHeading } from "@/components/sections/section-heading";
import { LiveHomepageSection } from "@/components/live/live-homepage-section";

import { regularWorshipScheduleCards } from "@/lib/constants/worship-schedules";

import { getUpcomingEvents } from "@/lib/data/events";
import { getPublishedPosts } from "@/lib/data/posts";
import { getPublishedSermons } from "@/lib/data/sermons";
import { getPublishedMinistries } from "@/lib/data/ministries";
import { getPublishedMinistryNavigation } from "@/lib/data/ministry-navigation";

import { HomepageGalleryCard } from "@/components/gallery/homepage-gallery-card";

import { getLivestreamOverview } from "@/lib/data/livestreams";
import { getGalleryHomepagePreview } from "@/lib/data/gallery";
import { getUpcomingSpecialWorshipSchedules } from "@/lib/data/schedules";
import { getSiteConfig } from "@/lib/data/site-settings";
import { getWhatsappUrl } from "@/lib/site/config";

export const revalidate = 60;

export default async function Home() {
  const [
    site,
    upcomingEvents,
    latestSermons,
    latestPosts,
    featuredMinistries,
    ministryNavItems,
    upcomingSpecialSchedules,
    livestream,
    galleryPreview,
  ] = await Promise.all([
    getSiteConfig(),
    getUpcomingEvents(3),
    getPublishedSermons(3),
    getPublishedPosts(3),
    getPublishedMinistries(6),
    getPublishedMinistryNavigation(),
    getUpcomingSpecialWorshipSchedules(1),
    getLivestreamOverview(),
    getGalleryHomepagePreview(5),
  ]);

  const homepageSchedules = [
    ...regularWorshipScheduleCards.map((schedule) => ({
      ...schedule,
      featured: false,
    })),
    ...upcomingSpecialSchedules,
  ];

  return (
    <MotionProvider>
      <Navbar
        overlay
        site={site}
        isLive={livestream.isLive}
        ministryNavItems={ministryNavItems}
      />

      <PublicMotionChrome />

      <main>
        <section className="relative isolate flex min-h-[760px] items-end overflow-hidden bg-primary text-white lg:min-h-screen">
          <Image
            src="https://images.unsplash.com/photo-1561448817-f17eed390089?q=80&w=1632&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Suasana hangat persekutuan gereja"
            fill
            priority
            className="-z-30 object-cover motion-safe:animate-[hero-ken-burns_20s_ease-out_both]"
            sizes="100vw"
          />

          <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(24,32,27,.96)_0%,rgba(38,53,43,.78)_48%,rgba(38,53,43,.35)_100%)]" />

          <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-primary/70 to-transparent" />

          <div className="motion-ambient-orb absolute -right-28 top-32 -z-10 size-80 rounded-full bg-gold/[.08] blur-3xl" />

          <div className="motion-ambient-orb motion-ambient-orb-delayed absolute -left-24 bottom-20 -z-10 size-72 rounded-full bg-white/[.045] blur-3xl" />

          <div className="container-site grid gap-12 pb-12 pt-40 lg:grid-cols-[1fr_320px] lg:items-end lg:pb-16">
            <MotionDiv variant={heroReveal} className="max-w-4xl">
              <span className="eyebrow text-gold">Selamat Datang di</span>

              <h1 className="heading-display mt-6 text-5xl text-balance sm:text-6xl lg:text-[5.25rem]">
                Gereja Masehi Advent Hari Ketujuh{" "}
                <span className="text-gold">Jemaat Naripan</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">
                {site.slogan}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/jadwal-ibadah">
                    <CalendarDays className="size-4" />
                    Lihat Jadwal Ibadah
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outlineLight">
                  <Link href="/live">
                    <Play className="size-4 fill-current" />
                    Tonton Live
                  </Link>
                </Button>
              </div>
            </MotionDiv>

            <MotionDiv
              variant={scaleIn}
              className="rounded-2xl border border-white/15 bg-white/[.08] p-6 backdrop-blur-md"
            >
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#d0b576]">
                Ibadah Sabat
              </p>

              <div className="mt-5 grid grid-cols-[54px_1fr] gap-4">
                <div className="grid size-14 place-items-center rounded-xl bg-gold text-primary">
                  <Clock3 className="size-6" aria-hidden="true" />
                </div>

                <div>
                  <p className="font-serif text-xl">Sabtu, 09:00–12:00 WIB</p>

                  <p className="mt-1 flex items-center gap-1 text-xs text-white/60">
                    <MapPin className="size-3" />
                    GMAHK Jemaat Naripan
                  </p>
                </div>
              </div>

              <Link
                href="/pengunjung-baru"
                className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm font-semibold"
              >
                Rencanakan kunjungan
                <ChevronRight className="size-4" />
              </Link>
            </MotionDiv>
          </div>

          <a
            href="#sambutan"
            className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[.2em] text-white/55 xl:flex"
          >
            Jelajahi
            <ArrowDown className="size-4 animate-pulse-soft" />
          </a>
        </section>

        <MotionSection id="sambutan" className="section-pad bg-cream">
          <div className="container-site grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
                <Image
                  src="https://images.unsplash.com/photo-1491396023581-4344e51fec5c?auto=format&fit=crop&w=1200&q=90"
                  alt="Gedung gereja yang hangat"
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 50vw"
                />
              </div>

              <div className="absolute -bottom-7 -right-4 max-w-xs rounded-2xl bg-primary p-6 text-white shadow-2xl sm:-right-8">
                <span className="font-serif text-4xl text-gold">“</span>

                <p className="-mt-3 font-serif text-lg italic leading-7">
                  Datanglah sebagaimana adanya, bertumbuhlah bersama dalam
                  kasih-Nya.
                </p>
              </div>
            </div>

            <div>
              <SectionHeading
                eyebrow="Tentang Kami"
                title="Sebuah keluarga iman, tempat setiap orang diterima."
              />

              <p className="mt-7 leading-8 text-muted">
                Kami percaya gereja adalah rumah untuk berjumpa dengan Tuhan,
                bertumbuh melalui Firman, dan menemukan sukacita dalam melayani.
                Di GMAHK Naripan, Anda diundang menjadi bagian dari perjalanan
                iman yang nyata dan penuh kasih.
              </p>

              <div className="my-8 h-px w-20 bg-gold" />

              <p className="font-serif text-xl italic text-secondary">
                “Hendaklah kamu saling mengasihi, seperti Aku telah mengasihi
                kamu.”
              </p>

              <Button asChild variant="dark" size="lg" className="mt-9">
                <Link href="/tentang">
                  Mengenal Kami Lebih Dekat
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </MotionSection>

        <MotionSection className="section-pad bg-white">
          <div className="container-site">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="Mari Beribadah"
                title="Jadwal ibadah rutin"
                description="Ibadah Rabu, Vesper, dan Sabat berlangsung pada waktu yang tetap. Agenda khusus terdekat juga akan tampil di sini."
              />

              <Button asChild variant="secondary">
                <Link href="/jadwal-ibadah">
                  Lihat semua jadwal
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {homepageSchedules.map((item) => (
                <ServiceScheduleCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </MotionSection>

        <LiveHomepageSection
          site={site}
          overview={livestream}
          fallbackSermon={latestSermons[0] ?? null}
        />

        <MotionSection className="section-pad bg-cream">
          <div className="container-site">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="Agenda Jemaat"
                title="Kegiatan mendatang"
                description="Mari bertumbuh, belajar, dan mengambil bagian dalam pelayanan bersama."
              />

              <Button asChild variant="secondary">
                <Link href="/kegiatan">
                  Lihat Semua Kegiatan
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((item) => (
                  <EventCard key={item.id} item={item} />
                ))
              ) : (
                <div className="rounded-2xl border border-primary/10 bg-white p-8 text-center md:col-span-2 lg:col-span-3">
                  <p className="font-serif text-2xl text-primary">
                    Belum ada kegiatan mendatang
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Kegiatan yang dipublikasikan melalui admin akan tampil
                    otomatis di sini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </MotionSection>

        <MotionSection className="section-pad bg-white">
          <div className="container-site">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="Arsip Firman"
                title="Khotbah terbaru"
                description="Dengarkan kembali pesan Firman yang menguatkan langkah dan menumbuhkan iman."
              />

              <Button asChild variant="secondary">
                <Link href="/khotbah">
                  Lihat Semua Khotbah
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestSermons.length > 0 ? (
                latestSermons.map((item) => (
                  <SermonCard key={item.id} item={item} />
                ))
              ) : (
                <div className="rounded-2xl border border-primary/10 bg-cream p-8 text-center md:col-span-2 lg:col-span-3">
                  <p className="font-serif text-2xl text-primary">
                    Belum ada khotbah terbaru
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Khotbah yang dipublikasikan melalui admin akan tampil
                    otomatis di sini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </MotionSection>

        <MotionSection className="section-pad bg-cream">
          <div className="container-site">
            <SectionHeading
              eyebrow="Bertumbuh & Melayani"
              title="Pelayanan gereja"
              description="Setiap talenta memiliki tempat. Temukan ruang untuk bertumbuh dan menjadi berkat."
              align="center"
            />

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featuredMinistries.length > 0 ? (
                featuredMinistries.map((item) => (
                  <MinistryCard key={item.id} item={item} />
                ))
              ) : (
                <div className="rounded-2xl border border-primary/10 bg-white p-8 text-center md:col-span-2 lg:col-span-3">
                  <p className="font-serif text-2xl text-primary">
                    Belum ada pelayanan yang dipublikasikan
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Pelayanan yang diterbitkan melalui admin akan tampil
                    otomatis di sini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </MotionSection>

        <MotionSection className="relative isolate min-h-[580px] overflow-hidden bg-primary py-28 text-center text-white">
          <Image
            src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1800&q=90"
            alt="Cahaya pagi di pegunungan"
            fill
            className="-z-20 object-cover"
            sizes="100vw"
          />

          <div className="absolute inset-0 -z-10 bg-primary/75" />

          <div className="container-site">
            <span className="eyebrow justify-center text-gold before:hidden">
              Ayat Minggu Ini
            </span>

            <blockquote className="heading-display mx-auto mt-9 max-w-4xl text-4xl leading-tight text-balance sm:text-5xl">
              “Tetapi orang-orang yang menanti-nantikan TUHAN mendapat kekuatan
              baru: mereka seumpama rajawali yang naik terbang dengan kekuatan
              sayapnya.”
            </blockquote>

            <p className="mt-7 font-bold tracking-[.18em] text-gold">
              YESAYA 40:31
            </p>

            <p className="mx-auto mt-8 max-w-2xl leading-7 text-white/65">
              Saat langkah terasa berat, pengharapan kepada Tuhan menolong kita
              melihat bahwa kasih dan penyertaan-Nya selalu lebih besar dari
              keadaan.
            </p>
          </div>
        </MotionSection>

        <MotionSection className="section-pad bg-white">
          <div className="container-site">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="Kabar & Inspirasi"
                title="Berita dan renungan terbaru"
              />

              <Button asChild variant="secondary">
                <Link href="/berita">
                  Lihat Semua Artikel
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 grid gap-9 md:grid-cols-3">
              {latestPosts.length > 0 ? (
                latestPosts.map((item) => (
                  <ArticleCard key={item.id} item={item} />
                ))
              ) : (
                <div className="rounded-2xl border border-primary/10 bg-cream p-8 text-center md:col-span-3">
                  <p className="font-serif text-2xl text-primary">
                    Belum ada artikel terbaru
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Artikel yang dipublikasikan melalui admin akan tampil
                    otomatis di sini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </MotionSection>

        <MotionSection className="section-pad bg-cream">
          <div className="container-site">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="Momen Kebersamaan"
                title="Cerita dalam gambar"
              />

              <Button asChild variant="secondary">
                <Link href="/galeri">
                  Lihat Semua Galeri
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 grid auto-rows-[220px] gap-4 md:grid-cols-4">
              {galleryPreview.length > 0 ? (
                galleryPreview.map((entry, index) => (
                  <HomepageGalleryCard
                    key={entry.id}
                    item={entry}
                    albumSlug={entry.albumSlug}
                    albumTitle={entry.albumTitle}
                    index={index}
                  />
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-primary/10 bg-white p-8 text-center">
                  <p className="font-serif text-2xl text-primary">
                    Belum ada foto galeri
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Foto dari album yang dipublikasikan melalui admin akan
                    tampil otomatis di sini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </MotionSection>

        <MotionSection className="bg-white py-8">
          <div className="container-site grid overflow-hidden rounded-[2rem] bg-primary text-white lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:p-16">
              <span className="eyebrow text-gold">Kami Menantikan Anda</span>

              <h2 className="heading-display mt-6 text-4xl text-balance sm:text-5xl">
                Baru pertama kali berkunjung?
              </h2>

              <p className="mt-6 max-w-xl leading-7 text-white/65">
                Kami dengan senang hati menyambut Anda untuk beribadah dan
                bertumbuh bersama keluarga GMAHK Jemaat Naripan.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/pengunjung-baru">Rencanakan Kunjungan</Link>
                </Button>

                <Button asChild variant="outlineLight">
                  <Link href="/kontak">Hubungi Kami</Link>
                </Button>
              </div>
            </div>

            <div className="relative min-h-[360px]">
              <Image
                src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=90"
                alt="Sambutan hangat keluarga gereja"
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </MotionSection>

        <MotionSection className="section-pad bg-white">
          <div className="container-site grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-primary/10 bg-cream p-8 sm:p-12">
              <span className="grid size-14 place-items-center rounded-full bg-gold/20 text-primary">
                <HeartHandshake />
              </span>

              <h2 className="heading-display mt-7 text-4xl text-primary">
                Bolehkah kami mendoakan Anda?
              </h2>

              <p className="mt-5 leading-7 text-muted">
                Setiap permohonan dijaga secara aman dan hanya diterima oleh Tim
                Pendoa Jemaat atau Pendeta/Gembala Jemaat sesuai pilihan Anda.
              </p>

              <p className="mt-5 flex gap-2 text-xs font-semibold text-secondary">
                <ShieldCheck className="size-4" />
                Privat dan rahasia
              </p>

              <Button asChild variant="dark" className="mt-8">
                <Link href="/permohonan-doa">Kirim Permohonan Doa</Link>
              </Button>
            </div>

            <div className="rounded-[2rem] bg-[#e6ede6] p-8 sm:p-12">
              <span className="grid size-14 place-items-center rounded-full bg-white text-primary">
                <MessageCircle />
              </span>

              <h2 className="heading-display mt-7 text-4xl text-primary">
                Ada yang ingin ditanyakan?
              </h2>

              <p className="mt-5 leading-7 text-muted">
                Tim penyambut kami siap membantu informasi ibadah, kegiatan, dan
                kunjungan pertama Anda.
              </p>

              <Button asChild variant="secondary" className="mt-8">
                <Link href="/kontak">Hubungi Kami</Link>
              </Button>
            </div>
          </div>
        </MotionSection>

        <MotionSection className="section-pad bg-cream">
          <div className="container-site grid gap-10 lg:grid-cols-[1.35fr_.65fr]">
            <div className="relative min-h-[450px] overflow-hidden rounded-[2rem] border border-primary/10 bg-[#e4e8e0]">
              <iframe
                title="Lokasi GMAHK Naripan"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4822.004403451654!2d107.61394007499646!3d-6.920699793078948!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e68e7005f570df1%3A0x14ab20821256ed85!2sGereja%20Masehi%20Advent%20Hari%20Ketujuh%20Naripan!5e1!3m2!1sen!2sid!4v1786769124658!5m2!1sen!2sid"
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            <div className="flex flex-col justify-center">
              <SectionHeading
                eyebrow="Lokasi & Kontak"
                title="Datang dan beribadah bersama kami."
              />

              <div className="mt-8 space-y-5 text-sm text-muted">
                <p className="flex gap-3">
                  <MapPin className="size-5 shrink-0 text-gold" />
                  {site.address}
                </p>

                <p className="flex gap-3">
                  <Clock3 className="size-5 shrink-0 text-gold" />

                  <span>
                    Sabtu · Sekolah Sabat 08.00 WIB
                    <br />
                    Kebaktian Sabat 09.00 WIB
                  </span>
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <a
                    href={site.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="size-4" />
                    Petunjuk Arah
                  </a>
                </Button>

                {site.whatsapp && (
                  <Button asChild variant="secondary">
                    <a
                      href={getWhatsappUrl(site.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </MotionSection>
      </main>

      <Footer site={site} />
    </MotionProvider>
  );
}
