import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-primary/10 bg-white shadow-[0_12px_40px_rgba(38,53,43,.06)]", className)} {...props} />;
}
