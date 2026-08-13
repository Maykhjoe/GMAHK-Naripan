"use client";

import { Children, type ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";

import {
  staggerContainer,
  staggerItem,
} from "@/components/motion/motion-section";
import { cn } from "@/lib/utils";

export function MotionGrid({
  children,
  className,
  itemClassName,
}: {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <m.div
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={reduce ? undefined : staggerContainer}
      className={cn(className)}
    >
      {Children.map(children, (child) => (
        <m.div
          variants={reduce ? undefined : staggerItem}
          className={cn("min-w-0 h-full [&>a]:block [&>a]:h-full [&>a]:w-full", itemClassName)}
        >
          {child}
        </m.div>
      ))}
    </m.div>
  );
}
