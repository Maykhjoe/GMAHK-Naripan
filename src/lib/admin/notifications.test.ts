import { describe, expect, it } from "vitest";

import {
  formatNotificationTime,
  notificationPageCount,
  parseNotificationListParams,
  sanitizeNotificationSearch,
} from "@/lib/admin/notifications";

describe("admin notifications", () => {
  it("normalizes list parameters", () => {
    const params = new URLSearchParams(
      "page=3&pageSize=50&type=prayer&read=unread&status=archived&q=doa%20keluarga",
    );

    expect(parseNotificationListParams(params)).toEqual({
      page: 3,
      pageSize: 50,
      type: "prayer",
      read: "unread",
      status: "archived",
      q: "doa keluarga",
    });
  });

  it("falls back for invalid filters", () => {
    const params = new URLSearchParams(
      "page=-2&pageSize=500&type=unknown&read=maybe&status=deleted",
    );

    expect(parseNotificationListParams(params)).toEqual({
      page: 1,
      pageSize: 20,
      type: "",
      read: "all",
      status: "active",
      q: "",
    });
  });

  it("sanitizes notification search terms for PostgREST filters", () => {
    expect(sanitizeNotificationSearch("  doa,(keluarga)%_  ")).toBe(
      "doa keluarga",
    );
  });

  it("calculates at least one page", () => {
    expect(notificationPageCount(0, 20)).toBe(1);
    expect(notificationPageCount(41, 20)).toBe(3);
  });

  it("formats recent times in Indonesian", () => {
    const now = new Date("2026-08-07T00:00:00.000Z");
    expect(
      formatNotificationTime("2026-08-06T23:55:00.000Z", now),
    ).toContain("menit");
  });
});
