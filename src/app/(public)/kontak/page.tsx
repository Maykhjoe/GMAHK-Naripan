import type { Metadata } from "next";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { FaInstagram, FaWhatsapp, FaYoutube } from "react-icons/fa6";

import { ContactForm } from "@/components/forms/public-forms";
import { PageHero } from "@/components/sections/page-hero";
import { getSiteConfig } from "@/lib/data/site-settings";
import { getWhatsappUrl } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Alamat, kontak, dan formulir pesan GMAHK Jemaat Naripan.",
  alternates: { canonical: "/kontak" },
};

export const revalidate = 60;

export default async function ContactPage() {
  const site = await getSiteConfig();
  const contacts = [
    {
      icon: MapPin,
      label: "Alamat",
      value: site.address,
      href: site.mapsUrl,
    },
    ...(site.phone
      ? [
          {
            icon: Phone,
            label: "Telepon",
            value: site.phone,
            href: `tel:${site.phone.replace(/[^+\d]/g, "")}`,
          },
        ]
      : []),
    ...(site.whatsapp
      ? [
          {
            icon: Phone,
            label: "WhatsApp",
            value: site.whatsapp,
            href: getWhatsappUrl(site.whatsapp),
          },
        ]
      : []),
    {
      icon: Mail,
      label: "Email",
      value: site.email,
      href: `mailto:${site.email}`,
    },
    {
      icon: Clock3,
      label: "Jam Sekretariat",
      value: site.secretariatHours,
      href: "",
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Terhubung dengan Kami"
        title="Kami senang mendengar dari Anda"
        description="Hubungi kami untuk informasi ibadah, kegiatan, pelayanan pastoral, atau kunjungan pertama."
      />

      <section className="section-pad bg-cream">
        <div className="container-site grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-4">
            {contacts.map(({ icon: Icon, label, value, href }) => {
              const content = (
                <>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/15 text-secondary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-primary">
                      {value}
                    </p>
                  </div>
                </>
              );

              return href ? (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="flex gap-4 rounded-2xl border border-primary/5 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lg"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={label}
                  className="flex gap-4 rounded-2xl border border-primary/5 bg-white p-6"
                >
                  {content}
                </div>
              );
            })}

            {(site.instagram || site.youtube || site.whatsapp) && (
              <div className="flex flex-wrap gap-5 rounded-2xl bg-primary p-6 text-white">
                {site.instagram && (
                  <a
                    href={site.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 text-sm"
                  >
                    <span className="grid size-9 place-items-center rounded-full border border-white/15 group-hover:border-gold group-hover:text-gold">
                      <FaInstagram className="size-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-[10px] uppercase tracking-wider text-white/50">
                        Instagram
                      </span>
                      {site.instagramLabel}
                    </span>
                  </a>
                )}

                {site.youtube && (
                  <a
                    href={site.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 text-sm"
                  >
                    <span className="grid size-9 place-items-center rounded-full border border-white/15 group-hover:border-gold group-hover:text-gold">
                      <FaYoutube className="size-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-[10px] uppercase tracking-wider text-white/50">
                        YouTube
                      </span>
                      {site.youtubeLabel}
                    </span>
                  </a>
                )}

                {site.whatsapp && (
                  <a
                    href={getWhatsappUrl(site.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 text-sm"
                  >
                    <span className="grid size-9 place-items-center rounded-full border border-white/15 group-hover:border-gold group-hover:text-gold">
                      <FaWhatsapp className="size-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-[10px] uppercase tracking-wider text-white/50">
                        WhatsApp
                      </span>
                      {site.whatsapp}
                    </span>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-primary/10 bg-white p-6 sm:p-10">
            <h2 className="font-serif text-3xl text-primary">Kirim pesan</h2>
            <p className="mb-8 mt-3 text-sm text-muted">
              Isi formulir di bawah dan tim kami akan merespons pada jam
              pelayanan.
            </p>
            <ContactForm />
          </div>
        </div>
      </section>

      <section className="bg-white pb-24">
        <div className="container-site grid min-h-[420px] place-items-center rounded-[2rem] bg-[#e6ece5] p-8 text-center">
          <div>
            <MapPin
              className="mx-auto size-10 text-secondary"
              aria-hidden="true"
            />
            <h2 className="mt-4 font-serif text-3xl text-primary">
              Peta Lokasi Gereja
            </h2>
            <p className="mt-3 text-sm text-[#58625b]">
              Buka lokasi resmi {site.shortName} melalui Google Maps.
            </p>
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-secondary"
            >
              Buka Google Maps
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
