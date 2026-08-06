export type CountdownState = { status: "scheduled" | "live" | "ended"; days: number; hours: number; minutes: number; seconds: number };
export function getCountdownState(startsAt: string, endsAt: string, now: Date = new Date()): CountdownState {
  const start = new Date(startsAt).getTime(); const end = new Date(endsAt).getTime(); const current = now.getTime();
  const empty = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  if (!Number.isFinite(start) || !Number.isFinite(end) || current >= end) return { status: "ended", ...empty };
  if (current >= start) return { status: "live", ...empty };
  const total = Math.max(0, Math.floor((start - current) / 1000));
  return { status: "scheduled", days: Math.floor(total / 86400), hours: Math.floor((total % 86400) / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}
