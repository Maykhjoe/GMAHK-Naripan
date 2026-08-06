import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, align = "left", light = false, className }: { eyebrow: string; title: string; description?: string; align?: "left" | "center"; light?: boolean; className?: string }) {
  return <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
    <span className={cn("eyebrow", align === "center" && "justify-center before:hidden", light && "text-gold")}>{eyebrow}</span>
    <h2 className={cn("heading-display mt-5 text-4xl text-balance sm:text-5xl", light ? "text-white" : "text-primary")}>{title}</h2>
    {description && <p className={cn("mt-5 text-base leading-7", light ? "text-white/65" : "text-muted")}>{description}</p>}
  </div>;
}
