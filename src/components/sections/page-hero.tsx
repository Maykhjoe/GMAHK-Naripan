import { ChevronRight, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  heroReveal,
  MotionMount,
  scaleIn,
} from "@/components/motion/motion-section";

export function PageHero({
  title,
  eyebrow,
  description,
  image = "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1800&q=85",
}: {
  title: string;
  eyebrow: string;
  description?: string;
  image?: string;
}) {
  return (
    <section className="relative isolate flex min-h-[440px] items-end overflow-hidden bg-primary pt-28 text-white">
      <Image
        src={image}
        alt="Suasana kegiatan dan persekutuan gereja"
        fill
        priority
        className="-z-30 object-cover motion-safe:animate-[hero-ken-burns_18s_ease-out_both]"
        sizes="100vw"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(24,32,27,.94),rgba(38,53,43,.7),rgba(38,53,43,.4))]" />
      <div className="motion-ambient-orb absolute -right-24 top-24 -z-10 size-72 rounded-full bg-gold/[.08] blur-3xl" />
      <div className="motion-ambient-orb motion-ambient-orb-delayed absolute -left-24 bottom-6 -z-10 size-60 rounded-full bg-white/[.045] blur-3xl" />

      <div className="container-site pb-16 pt-24">
        <MotionMount variant={heroReveal} className="max-w-4xl">
          <span className="eyebrow text-gold">{eyebrow}</span>
          <h1 className="heading-display mt-5 text-5xl text-balance sm:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
              {description}
            </p>
          )}
        </MotionMount>

        <MotionMount variant={scaleIn}>
          <nav
            aria-label="Breadcrumb"
            className="mt-9 flex items-center gap-2 text-xs text-white/55"
          >
            <Link
              href="/"
              className="flex items-center gap-1 transition-colors hover:text-white"
            >
              <Home className="size-3" aria-hidden="true" />
              Beranda
            </Link>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span className="text-gold">{title}</span>
          </nav>
        </MotionMount>
      </div>
    </section>
  );
}
