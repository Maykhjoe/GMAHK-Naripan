import { describe, expect, it } from "vitest";

import { deriveLivestreamDisplayStatus } from "./status";

describe("livestream display status", () => {
  const starts_at = "2026-08-08T09:00:00+07:00";
  const ends_at = "2026-08-08T12:00:00+07:00";

  it("derives scheduled, live, and ended states from the schedule", () => {
    expect(
      deriveLivestreamDisplayStatus(
        { starts_at, ends_at, live_status: "scheduled" },
        new Date("2026-08-08T08:00:00+07:00"),
      ),
    ).toBe("scheduled");
    expect(
      deriveLivestreamDisplayStatus(
        { starts_at, ends_at, live_status: "scheduled" },
        new Date("2026-08-08T10:00:00+07:00"),
      ),
    ).toBe("live");
    expect(
      deriveLivestreamDisplayStatus(
        { starts_at, ends_at, live_status: "live" },
        new Date("2026-08-08T13:00:00+07:00"),
      ),
    ).toBe("ended");
  });

  it("keeps a cancelled broadcast cancelled", () => {
    expect(
      deriveLivestreamDisplayStatus(
        { starts_at, ends_at, live_status: "cancelled" },
        new Date("2026-08-08T10:00:00+07:00"),
      ),
    ).toBe("cancelled");
  });
});
