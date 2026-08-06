import Link from "next/link";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { FaInstagram, FaYoutube } from "react-icons/fa6";

import { navItems } from "@/lib/constants/site-data";
import {
  formatRegularWorshipTime,
  regularWorshipSchedules,
} from "@/lib/constants/worship-schedules";
import {
  defaultSiteConfig,
  type SiteConfig,
} from "@/lib/site/config";
import { Logo } from "./logo";

export function Footer({
  site = defaultSiteConfig,
}: {
  site?: SiteConfig;
}) {
  const hasPhone = Boolean(site.phone);
  const phoneHref = site.phone.replace(/[^+\d]/g, "");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      <div className="gold-rule" />

      <div className="container-site grid gap-12 py-14 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div className="max-w-md">
          <Logo
            light
            brandName={site.shortName}
            slogan={site.slogan}
          />

          <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
            {site.footerText}
          </p>

          {(site.instagram || site.youtube) && (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              {site.instagram && (
                <a
                  href={site.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Instagram ${site.instagramLabel}`}
                  className="group flex w-fit items-center gap-3 rounded-xl focus-visible:outline-none"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 transition-all group-hover:-translate-y-0.5 group-hover:border-gold group-hover:text-gold">
                    <FaInstagram className="size-5" aria-hidden="true" />
                  </span>

                  <span>
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-white/50">
                      Instagram
                    </span>
                    <span className="block text-sm font-medium text-white/80 transition-colors group-hover:text-white">
                      {site.instagramLabel}
                    </span>
                  </span>
                </a>
              )}

              {site.youtube && (
                <a
                  href={site.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`YouTube ${site.youtubeLabel}`}
                  className="group flex w-fit items-center gap-3 rounded-xl focus-visible:outline-none"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 transition-all group-hover:-translate-y-0.5 group-hover:border-gold group-hover:text-gold">
                    <FaYoutube className="size-5" aria-hidden="true" />
                  </span>

                  <span>
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-white/50">
                      YouTube
                    </span>
                    <span className="block text-sm font-medium text-white/80 transition-colors group-hover:text-white">
                      {site.youtubeLabel}
                    </span>
                  </span>
                </a>
              )}
            </div>
          )}
        </div>

        <div>
          <FooterHeading>Navigasi</FooterHeading>

          <nav aria-label="Navigasi footer" className="mt-5 grid gap-3">
            {navItems.slice(0, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="w-fit text-sm text-white/70 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <FooterHeading>Jadwal Ibadah</FooterHeading>

          <div className="mt-5 space-y-5 text-sm text-white/70">
            {regularWorshipSchedules.map((schedule) => (
              <div key={schedule.title} className="flex items-start gap-3">
                <Clock3
                  className="mt-0.5 size-4 shrink-0 text-gold"
                  aria-hidden="true"
                />

                <div>
                  <p className="font-medium text-white/90">{schedule.title}</p>
                  <p className="mt-1 text-white/60">
                    {schedule.day}, {formatRegularWorshipTime(schedule)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <FooterHeading>Hubungi Kami</FooterHeading>

          <address className="mt-5 space-y-4 text-sm not-italic text-white/70">
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 transition-colors hover:text-white"
            >
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-gold"
                aria-hidden="true"
              />
              <span className="leading-6">{site.address}</span>
            </a>

            {hasPhone && (
              <a
                href={`tel:${phoneHref}`}
                className="flex w-fit items-center gap-3 transition-colors hover:text-white"
              >
                <Phone
                  className="size-4 shrink-0 text-gold"
                  aria-hidden="true"
                />
                <span>{site.phone}</span>
              </a>
            )}

            {site.email && (
              <a
                href={`mailto:${site.email}`}
                className="flex w-fit items-start gap-3 transition-colors hover:text-white"
              >
                <Mail
                  className="mt-0.5 size-4 shrink-0 text-gold"
                  aria-hidden="true"
                />
                <span className="break-all">{site.email}</span>
              </a>
            )}
          </address>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-3 py-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href="/kebijakan-privasi"
              className="transition-colors hover:text-white"
            >
              Kebijakan Privasi
            </Link>

            <Link
              href="/admin"
              className="transition-colors hover:text-white"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
      {children}
    </h2>
  );
}
