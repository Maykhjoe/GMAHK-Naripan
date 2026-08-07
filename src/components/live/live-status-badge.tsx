import { Clock3, Radio, Video } from "lucide-react";

import type { LivestreamDisplayStatus } from "@/lib/live/status";
import { cn } from "@/lib/utils";

const statusConfig = {
  live: {
    label: "Sedang Live",
    className: "border-red-400/25 bg-red-400/10 text-red-200",
    icon: Radio,
  },
  scheduled: {
    label: "Live Berikutnya",
    className: "border-gold/25 bg-gold/10 text-gold",
    icon: Clock3,
  },
  ended: {
    label: "Rekaman",
    className: "border-white/15 bg-white/5 text-white/70",
    icon: Video,
  },
  cancelled: {
    label: "Dibatalkan",
    className: "border-white/15 bg-white/5 text-white/60",
    icon: Clock3,
  },
} as const;

export function LiveStatusBadge({
  status,
}: {
  status: LivestreamDisplayStatus;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]",
        config.className,
      )}
    >
      <Icon
        className={cn("size-3.5", status === "live" && "animate-pulse")}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
