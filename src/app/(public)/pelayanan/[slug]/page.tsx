import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Check,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { getPublishedMinistryBySlug } from "@/lib/data/ministries";
import { getSiteConfig } from "@/lib/data/site-settings";
import {
  createBreadcrumbJsonLd,
  createMinistryJsonLd,
} from "@/lib/seo/structured-data";

export const revalidate = 60;

type MinistryDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

function createWhatsAppHref(contact: string | null) {
  if (!contact) {
    return null;
  }

  let digits = contact.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  }

  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
}

export async function generateMetadata({
  params,
}: MinistryDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const ministry = await getPublishedMinistryBySlug(slug);

  if (!ministry) {
    return {
      title: "Pelayanan Tidak Ditemukan",
    };
  }

  return {
    title: ministry.name,
    description: ministry.shortDescription,
    alternates: {
      canonical: `/pelayanan/${ministry.slug}`,
    },
    openGraph: {
      title: ministry.name,
      description: ministry.shortDescription,
      url: `/pelayanan/${ministry.slug}`,
      images: ministry.image
        ? [
            {
              url: ministry.image,
              alt: `Pelayanan ${ministry.name}`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ministry.name,
      description: ministry.shortDescription,
      images: ministry.image ? [ministry.image] : undefined,
    },
  };
}

export default async function MinistryDetail({ params }: MinistryDetailProps) {
  const { slug } = await params;
  const [ministry, siteConfig] = await Promise.all([
    getPublishedMinistryBySlug(slug),
    getSiteConfig(),
  ]);

  if (!ministry) {
    notFound();
  }

  const email = ministry.email || siteConfig.email;
  const emailSubject = encodeURIComponent(
    `Informasi Pelayanan ${ministry.name} — ${siteConfig.shortName}`,
  );
  const whatsappHref = createWhatsAppHref(ministry.contact);
  const contactHref = whatsappHref || `mailto:${email}?subject=${emailSubject}`;

  return (
    <>
      <JsonLd data={createMinistryJsonLd(ministry, siteConfig)} />
      <JsonLd
        data={createBreadcrumbJsonLd(
          [
            { name: "Beranda", path: "/" },
            { name: "Pelayanan", path: "/pelayanan" },
            { name: ministry.name, path: `/pelayanan/${ministry.slug}` },
          ],
          siteConfig.url,
        )}
      />

      <section className="relative isolate overflow-hidden bg-primary pb-20 pt-36 text-white">
        {ministry.image && (
          <>
            <Image
              src={ministry.image}
              alt=""
              fill
              priority
              className="-z-20 object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(24,32,27,.96)_0%,rgba(38,53,43,.88)_48%,rgba(38,53,43,.55)_100%)]" />
          </>
        )}

        <div className="container-site">
          <span className="eyebrow text-gold">Departemen Pelayanan</span>

          {ministry.shortName && (
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-white/55">
              {ministry.shortName}
            </p>
          )}

          <h1 className="heading-display mt-5 max-w-4xl text-4xl text-balance sm:text-5xl lg:text-6xl">
            {ministry.name}
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
            {ministry.shortDescription}
          </p>
        </div>
      </section>

      <section className="section-pad bg-cream">
        <div className="container-site grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <article className="rounded-2xl border border-primary/5 bg-white p-8 shadow-[0_12px_40px_rgba(38,53,43,.05)] sm:p-10">
            <h2 className="font-serif text-3xl text-primary">
              Tentang pelayanan
            </h2>

            <div className="mt-5 space-y-5 leading-8 text-muted">
              {ministry.details.map((paragraph, index) => (
                <p key={`${index}-${paragraph}`}>{paragraph}</p>
              ))}
            </div>

            <h3 className="mt-10 font-serif text-2xl text-primary">
              Program pelayanan
            </h3>

            <ul className="mt-5 grid gap-4 text-sm text-muted sm:grid-cols-2">
              {ministry.programs.map((program) => (
                <li key={program} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-gold"
                    aria-hidden="true"
                  />
                  <span>{program}</span>
                </li>
              ))}
            </ul>
          </article>

          <aside className="self-start rounded-2xl bg-primary p-8 text-white shadow-[0_20px_60px_rgba(38,53,43,.18)] lg:sticky lg:top-28">
            {ministry.coordinatorPhoto ? (
              <div className="relative size-32 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,.22)] sm:size-40 lg:size-52">
                <Image
                  src={ministry.coordinatorPhoto}
                  alt={
                    ministry.coordinator
                      ? `Foto ${ministry.coordinator}`
                      : `Foto koordinator ${ministry.name}`
                  }
                  fill
                  className="object-cover"
                  sizes="(max-width: 639px) 128px, (max-width: 1023px) 160px, 208px"
                />
              </div>
            ) : (
              <div className="grid size-12 place-items-center rounded-xl border border-white/10 bg-white/5">
                <UserRound className="size-5 text-gold" aria-hidden="true" />
              </div>
            )}

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-gold">
              Koordinator Pelayanan
            </p>
            <h2 className="mt-2 font-serif text-2xl">
              {ministry.coordinator || "Nama koordinator akan diumumkan"}
            </h2>

            <div className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm text-white/65">
              {ministry.contact && (
                <p className="flex items-start gap-3">
                  <Phone
                    className="mt-0.5 size-4 shrink-0 text-gold"
                    aria-hidden="true"
                  />
                  <span>{ministry.contact}</span>
                </p>
              )}

              {email && (
                <p className="flex items-start gap-3">
                  <Mail
                    className="mt-0.5 size-4 shrink-0 text-gold"
                    aria-hidden="true"
                  />
                  <span className="break-all">{email}</span>
                </p>
              )}

              {ministry.schedule && (
                <p className="flex items-start gap-3">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0 text-gold"
                    aria-hidden="true"
                  />
                  <span>{ministry.schedule}</span>
                </p>
              )}

              {ministry.location && (
                <p className="flex items-start gap-3">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-gold"
                    aria-hidden="true"
                  />
                  <span>{ministry.location}</span>
                </p>
              )}

              {!ministry.schedule && !ministry.location && (
                <p className="flex items-start gap-3">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0 text-gold"
                    aria-hidden="true"
                  />
                  <span>Jadwal kegiatan akan diumumkan</span>
                </p>
              )}
            </div>

            <Button asChild className="mt-7 w-full">
              <a
                href={contactHref}
                target={whatsappHref ? "_blank" : undefined}
                rel={whatsappHref ? "noopener noreferrer" : undefined}
              >
                {whatsappHref && (
                  <MessageCircle className="size-4" aria-hidden="true" />
                )}
                Hubungi Pelayanan
              </a>
            </Button>
          </aside>
        </div>
      </section>
    </>
  );
}
