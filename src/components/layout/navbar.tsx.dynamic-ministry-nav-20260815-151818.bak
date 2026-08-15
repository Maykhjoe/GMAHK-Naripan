"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ChevronDown, Menu, Play, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { navItems } from "@/lib/constants/site-data";
import { defaultSiteConfig, type SiteConfig } from "@/lib/site/config";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const mobileList = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};

const mobileItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function Navbar({
  overlay = false,
  site = defaultSiteConfig,
  isLive = false,
}: {
  overlay?: boolean;
  site?: SiteConfig;
  isLive?: boolean;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const closeMenu = () => {
    setOpen(false);
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const light = overlay && !scrolled;
  const useLightTheme = light || scrolled;

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-white/10 bg-primary/95 shadow-[0_10px_35px_rgba(0,0,0,.1)] backdrop-blur-xl"
          : light
            ? "bg-transparent"
            : "border-b border-primary/10 bg-cream/95 backdrop-blur-xl",
      )}
    >
      <nav
        className="container-site flex h-20 items-center justify-between gap-5"
        aria-label="Navigasi utama"
      >
        <Logo
          light={useLightTheme}
          brandName={site.shortName}
          slogan={site.slogan}
        />

        <div
          className={cn(
            "hidden items-center gap-5 xl:flex",
            useLightTheme ? "text-white" : "text-primary",
          )}
        >
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="group/nav relative flex items-center gap-1 py-7 text-[13px] font-semibold"
                >
                  {item.label}
                  {item.children && (
                    <ChevronDown
                      className="size-3 transition-transform duration-300 group-hover:rotate-180"
                      aria-hidden="true"
                    />
                  )}

                  <span className="absolute bottom-5 left-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover/nav:scale-x-100" />
                  {active && !reduce && (
                    <m.span
                      layoutId="public-nav-active"
                      className="absolute bottom-5 left-0 h-px w-full bg-gold"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  {active && reduce && (
                    <span className="absolute bottom-5 left-0 h-px w-full bg-gold" />
                  )}
                </Link>

                {item.children && (
                  <div className="invisible absolute left-1/2 top-[68px] w-64 -translate-x-1/2 translate-y-2 rounded-2xl border border-primary/10 bg-white p-2 text-primary opacity-0 shadow-2xl transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block rounded-xl px-4 py-2.5 text-sm transition-all hover:translate-x-0.5 hover:bg-cream focus-visible:bg-cream"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="default" className="hidden sm:inline-flex">
            <Link href="/live">
              {isLive ? (
                <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              ) : (
                <Play className="size-4 fill-current" aria-hidden="true" />
              )}
              {isLive ? "Sedang Live" : "Tonton Live"}
            </Link>
          </Button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "grid size-11 place-items-center rounded-full transition-all xl:hidden",
              useLightTheme
                ? "text-white hover:scale-[1.03] hover:bg-white/10"
                : "text-primary hover:scale-[1.03] hover:bg-primary/5",
            )}
            aria-label="Buka menu"
            aria-expanded={open}
          >
            <Menu aria-hidden="true" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <m.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 min-h-dvh bg-primary p-5 text-white xl:hidden"
          >
            <div className="flex items-center justify-between">
              <Logo light brandName={site.shortName} slogan={site.slogan} />

              <m.button
                type="button"
                onClick={closeMenu}
                whileTap={reduce ? undefined : { scale: 0.94, rotate: -4 }}
                className="grid size-11 place-items-center rounded-full border border-white/20 transition-colors hover:bg-white/10"
                aria-label="Tutup menu"
              >
                <X aria-hidden="true" />
              </m.button>
            </div>

            <m.div
              initial={reduce ? false : "hidden"}
              animate="visible"
              variants={reduce ? undefined : mobileList}
              className="mt-12 grid max-h-[70vh] gap-1 overflow-y-auto"
            >
              {navItems.map((item, index) => (
                <m.div key={item.href} variants={reduce ? undefined : mobileItem}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between border-b border-white/10 py-3.5 font-serif text-2xl transition-colors hover:text-gold",
                      isActive(item.href) && "text-gold",
                    )}
                  >
                    <span>
                      <span className="mr-4 font-sans text-xs text-gold">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.label}
                    </span>
                  </Link>
                </m.div>
              ))}
            </m.div>

            <m.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.28 }}
            >
              <Button asChild className="mt-8 w-full">
                <Link href="/live" onClick={closeMenu}>
                  {isLive ? (
                    <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                  ) : (
                    <Play className="size-4 fill-current" aria-hidden="true" />
                  )}
                  {isLive ? "Sedang Live" : "Tonton Live"}
                </Link>
              </Button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
