import { describe, expect, it } from "vitest";
import { mediaStoragePath, sanitizeFileName, validateMediaMetadata } from "./media";

describe("admin media security", () => {
  it("sanitizes names and prevents path traversal", () => {
    expect(sanitizeFileName("../../Poster Kebaktian (Final).JPG")).toBe("poster-kebaktian-final.jpg");
    expect(sanitizeFileName("dokumen___pelayanan.pdf")).toBe("dokumen-pelayanan.pdf");
  });

  it("accepts only supported mime types and a maximum of 10 MiB", () => {
    expect(validateMediaMetadata({ type: "image/webp", size: 1024 }).success).toBe(true);
    expect(validateMediaMetadata({ type: "image/svg+xml", size: 1024 }).success).toBe(false);
    expect(validateMediaMetadata({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 }).success).toBe(false);
  });

  it("builds a user-scoped storage path without raw user input", () => {
    const path = mediaStoragePath("user-123", "Poster Acara.PNG", "fixed-id", new Date("2026-08-02T00:00:00Z"));
    expect(path).toBe("user-123/2026/08/fixed-id-poster-acara.png");
    expect(path).not.toContain("..");
  });
});
