import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizePhone, normalizePlainText } from "./normalize";

describe("input normalization", () => {
  it("normalizes email and phone without inventing country codes", () => {
    expect(normalizeEmail(" Admin@Example.COM ")).toBe("admin@example.com");
    expect(normalizePhone("+62 812-3456-7890")).toBe("+6281234567890");
    expect(normalizePhone("0812 3456 7890")).toBe("081234567890");
  });

  it("removes unsafe control characters while retaining normal text", () => {
    expect(normalizePlainText("  Halo\u0000 jemaat  ")).toBe("Halo jemaat");
  });
});
