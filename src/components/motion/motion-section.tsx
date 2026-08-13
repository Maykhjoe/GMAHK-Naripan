"use client";

import { m, useReducedMotion, type Variants } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const easeOutExpo: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.55, ease: easeOutExpo },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: easeOutExpo },
  },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -28 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: easeOutExpo },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 28 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: easeOutExpo },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.975, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

export const heroReveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeOutExpo },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

export const staggerItem = fadeUp;

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: easeOutExpo },
  },
};

type SharedMotionProps = {
  children: ReactNode;
  className?: string;
  variant?: Variants;
  amount?: number;
};

export function MotionSection({
  children,
  className,
  variant = fadeUp,
  amount = 0.1,
  ...props
}: HTMLAttributes<HTMLElement> &
  SharedMotionProps) {
  const reduce = useReducedMotion();

  return (
    <m.section
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={reduce ? undefined : variant}
      className={cn(className)}
      {...(props as object)}
    >
      {children}
    </m.section>
  );
}

export function MotionDiv({
  children,
  className,
  variant = fadeUp,
  amount = 0.12,
}: SharedMotionProps) {
  const reduce = useReducedMotion();

  return (
    <m.div
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={reduce ? undefined : variant}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function MotionMount({
  children,
  className,
  variant = pageTransition,
}: Omit<SharedMotionProps, "amount">) {
  const reduce = useReducedMotion();

  return (
    <m.div
      initial={reduce ? false : "hidden"}
      animate="visible"
      variants={reduce ? undefined : variant}
      className={className}
    >
      {children}
    </m.div>
  );
}
