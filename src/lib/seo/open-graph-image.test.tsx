// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  createContentOpenGraphImage,
  openGraphImageSize,
} from "./open-graph-image";

describe("createContentOpenGraphImage", () => {
  it(
    "returns a non-empty PNG ImageResponse at the social sharing size",
    async () => {
      expect(openGraphImageSize).toEqual({
        width: 1200,
        height: 630,
      });

      const response = createContentOpenGraphImage({
        title: "Seminar Kesehatan Keluarga",
        eyebrow: "Kesehatan",
        description:
          "15 Agustus 2026 · 14.00 WIB · Aula GMAHK Naripan",
      });

      expect(response.headers.get("content-type")).toBe("image/png");

      const image = await response.arrayBuffer();

      expect(image.byteLength).toBeGreaterThan(1000);
    },
    20_000,
  );
});