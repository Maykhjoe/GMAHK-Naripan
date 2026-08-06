import { describe, expect, it } from "vitest";
import { getCountdownState } from "./countdown";

describe("live countdown state", () => {
  const startsAt = "2026-08-08T09:00:00+07:00";
  const endsAt = "2026-08-08T11:30:00+07:00";
  it("returns scheduled units before a stream", () => {
    const state = getCountdownState(startsAt, endsAt, new Date("2026-08-07T08:30:20+07:00"));
    expect(state).toMatchObject({ status: "scheduled", days: 1, hours: 0, minutes: 29, seconds: 40 });
  });
  it("returns live and ended statuses at the correct boundaries", () => {
    expect(getCountdownState(startsAt, endsAt, new Date(startsAt)).status).toBe("live");
    expect(getCountdownState(startsAt, endsAt, new Date(endsAt)).status).toBe("ended");
  });
});
