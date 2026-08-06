import Image from "next/image";
import Link from "next/link";

import { defaultSiteConfig } from "@/lib/site/config";
import { cn } from "@/lib/utils";

interface LogoProps {
  light?: boolean;
  compact?: boolean;
  className?: string;
  brandName?: string;
  slogan?: string;
}

export function Logo({
  light = false,
  compact = false,
  className,
  brandName = defaultSiteConfig.shortName,
  slogan = defaultSiteConfig.slogan,
}: LogoProps) {
  const logoSrc = light
    ? "/images/logo-adventist-white.svg"
    : "/images/logo-adventist-green.svg";
  const visibleBrandName = brandName.toUpperCase();
  const visibleSlogan = slogan.toUpperCase();

  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-4",
        light ? "text-white" : "text-[#26352b]",
        className,
      )}
      aria-label={
        compact
          ? `Beranda ${brandName}`
          : `${visibleBrandName} ${visibleSlogan}`
      }
    >
      <span className="relative block h-16 w-20 shrink-0">
        <Image
          src={logoSrc}
          alt=""
          aria-hidden="true"
          fill
          sizes="80px"
          className="object-contain"
          priority
        />
      </span>

      {!compact && (
        <span aria-hidden="true">
          <strong className="block text-sm leading-tight tracking-wide">
            {visibleBrandName}
          </strong>
          <span
            className={cn(
              "block text-[9px] tracking-[0.16em]",
              light ? "text-white/70" : "text-[#58625b]",
            )}
          >
            {visibleSlogan}
          </span>
        </span>
      )}
    </Link>
  );
}
