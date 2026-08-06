import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-primary", className)} {...props} />;
}
