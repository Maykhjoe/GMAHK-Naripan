"use client";

import { ArrowUp } from "lucide-react";
import {
  AnimatePresence,
  m,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { pageTransition } from "@/components/motion/motion-section";

/** Thin scroll progress + discreet back-to-top control for public pages. */
export function PublicMotionChrome() {
  const reduce = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const [showTop, setShowTop] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setShowTop(latest > 620);
  });

  return (
    <>
      {!reduce && (
        <m.div
          aria-hidden="true"
          className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gold"
          style={{ scaleX: scrollYProgress }}
        />
      )}

      <AnimatePresence>
        {showTop && (
          <m.button
            type="button"
            aria-label="Kembali ke atas"
            title="Kembali ke atas"
            initial={reduce ? false : { opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.96 }}
            whileHover={reduce ? undefined : { y: -2 }}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            onClick={() =>
              window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
            }
            className="fixed bottom-6 right-5 z-40 grid size-11 place-items-center rounded-full border border-primary/10 bg-white/95 text-primary shadow-[0_12px_35px_rgba(24,32,27,.14)] backdrop-blur-md transition-colors hover:bg-cream sm:bottom-7 sm:right-7"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </m.button>
        )}
      </AnimatePresence>
    </>
  );
}

/** Subtle enter motion on public route changes without delaying navigation. */
export function PublicPageMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <m.div
      key={pathname}
      initial={reduce ? false : "hidden"}
      animate="visible"
      variants={reduce ? undefined : pageTransition}
    >
      {children}
    </m.div>
  );
}
