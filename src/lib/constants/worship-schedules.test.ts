import { describe, expect, it } from "vitest";

import {
  formatRegularWorshipTime,
  regularWorshipSchedules,
} from "./worship-schedules";

describe("regular worship schedules", () => {
  it("keeps the three approved weekly schedules and times", () => {
    expect(
      regularWorshipSchedules.map((schedule) => ({
        title: schedule.title,
        day: schedule.day,
        time: formatRegularWorshipTime(schedule),
      })),
    ).toEqual([
      { title: "Ibadah Rabu", day: "Rabu", time: "19:00–20:00 WIB" },
      { title: "Ibadah Vesper", day: "Jumat", time: "19:00–20:00 WIB" },
      { title: "Ibadah Sabat", day: "Sabtu", time: "09:00–12:00 WIB" },
    ]);
  });
});
