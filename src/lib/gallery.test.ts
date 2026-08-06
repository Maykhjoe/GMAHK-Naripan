import { describe, expect, it } from "vitest";
import { wrapGalleryIndex } from "./gallery";

describe("gallery navigation", () => {
  it("wraps previous and next navigation", () => {
    expect(wrapGalleryIndex(-1, 5)).toBe(4);
    expect(wrapGalleryIndex(5, 5)).toBe(0);
    expect(wrapGalleryIndex(2, 5)).toBe(2);
  });
  it("returns zero for an empty gallery", () => {
    expect(wrapGalleryIndex(3, 0)).toBe(0);
  });
});
