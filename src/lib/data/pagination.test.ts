import { describe, expect, it } from "vitest";

import {
  fallbackPagination,
  normalizeDateInput,
  normalizeSearch,
  safePage,
  safePageSize,
} from "./pagination";

describe("pagination helpers", () => {
  it("normalizes page and supported page sizes", () => {
    expect(safePage("3")).toBe(3);
    expect(safePage("invalid")).toBe(1);
    expect(safePage("-4")).toBe(1);
    expect(safePageSize("20", 10, [10, 20, 50])).toBe(20);
    expect(safePageSize("99", 10, [10, 20, 50])).toBe(10);
  });

  it("trims search input and rejects malformed dates", () => {
    expect(normalizeSearch("  doa keluarga  ")).toBe("doa keluarga");
    expect(normalizeDateInput("2026-08-07")).toBe("2026-08-07");
    expect(normalizeDateInput("07/08/2026")).toBe("");
  });

  it("clamps fallback pages and slices the requested data", () => {
    expect(fallbackPagination([1, 2, 3, 4, 5], 9, 2)).toEqual({
      items: [5],
      total: 5,
      page: 3,
      pageSize: 2,
      pageCount: 3,
    });
  });
});
