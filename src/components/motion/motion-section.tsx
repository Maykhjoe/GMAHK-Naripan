"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const fadeIn: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: .6, ease: "easeOut" } } };
export const fadeUp: Variants = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: .65, ease: [0.22, 1, 0.36, 1] } } };
export const fadeDown: Variants = { hidden: { opacity: 0, y: -24 }, visible: { opacity: 1, y: 0, transition: { duration: .6 } } };
export const slideInLeft: Variants = { hidden: { opacity: 0, x: -36 }, visible: { opacity: 1, x: 0, transition: { duration: .7 } } };
export const slideInRight: Variants = { hidden: { opacity: 0, x: 36 }, visible: { opacity: 1, x: 0, transition: { duration: .7 } } };
export const scaleIn: Variants = { hidden: { opacity: 0, scale: .96 }, visible: { opacity: 1, scale: 1, transition: { duration: .55 } } };
export const staggerContainer: Variants = { hidden: {}, visible: { transition: { staggerChildren: .1, delayChildren: .08 } } };
export const staggerItem = fadeUp;
export const pageTransition: Variants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: .45 } }, exit: { opacity: 0, y: -8, transition: { duration: .25 } } };

export function MotionSection({ children, className, variant = fadeUp, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode; variant?: Variants }) {
  const reduce = useReducedMotion();
  return <motion.section initial={reduce ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: .12 }} variants={reduce ? undefined : variant} className={cn(className)} {...(props as object)}>{children}</motion.section>;
}

export function MotionDiv({ children, className, variant = fadeUp }: { children: ReactNode; className?: string; variant?: Variants }) {
  const reduce = useReducedMotion();
  return <motion.div initial={reduce ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: .15 }} variants={reduce ? undefined : variant} className={className}>{children}</motion.div>;
}
