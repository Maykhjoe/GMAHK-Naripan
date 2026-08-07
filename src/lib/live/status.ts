export type LivestreamDisplayStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled";

const DEFAULT_STREAM_DURATION_MS = 3 * 60 * 60 * 1000;

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function effectiveLivestreamEnd(
  startsAt: string,
  endsAt: string | null,
) {
  const explicitEnd = endsAt ? validDate(endsAt) : null;

  if (explicitEnd) {
    return explicitEnd.toISOString();
  }

  const start = validDate(startsAt);

  return start
    ? new Date(start.getTime() + DEFAULT_STREAM_DURATION_MS).toISOString()
    : startsAt;
}

export function deriveLivestreamDisplayStatus(
  livestream: {
    starts_at: string;
    ends_at: string | null;
    live_status: LivestreamDisplayStatus;
  },
  now = new Date(),
): LivestreamDisplayStatus {
  if (livestream.live_status === "cancelled") {
    return "cancelled";
  }

  const start = validDate(livestream.starts_at);
  const end = validDate(
    effectiveLivestreamEnd(livestream.starts_at, livestream.ends_at),
  );

  if (!start || !end) {
    return livestream.live_status;
  }

  if (now.getTime() >= end.getTime()) {
    return "ended";
  }

  if (
    livestream.live_status === "live" ||
    (now.getTime() >= start.getTime() && now.getTime() < end.getTime())
  ) {
    return "live";
  }

  if (livestream.live_status === "ended") {
    return "ended";
  }

  return "scheduled";
}
