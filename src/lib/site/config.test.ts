import { describe, expect, it } from "vitest";

import {
  defaultSiteConfig,
  extractYouTubeVideoId,
  getWhatsappUrl,
  normalizeSiteConfig,
} from "./config";

describe("site configuration", () => {
  it("merges public settings with safe defaults", () => {
    expect(
      normalizeSiteConfig({
        name: "GMAHK Uji",
        phone: "",
        youtube: "https://youtube.com/@uji",
      }),
    ).toMatchObject({
      name: "GMAHK Uji",
      shortName: defaultSiteConfig.shortName,
      phone: "",
      youtube: "https://youtube.com/@uji",
      url: defaultSiteConfig.url,
    });
  });

  it("creates an Indonesian WhatsApp link", () => {
    expect(getWhatsappUrl("0812-3456-7890")).toBe(
      "https://wa.me/6281234567890",
    );
    expect(getWhatsappUrl("")).toBe("");
  });

  it("extracts a YouTube video ID from common URLs", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=ysz5S6PUM-U"),
    ).toBe("ysz5S6PUM-U");
    expect(extractYouTubeVideoId("https://youtu.be/ysz5S6PUM-U")).toBe(
      "ysz5S6PUM-U",
    );
  });
});
