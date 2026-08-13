import { describe, expect, it } from "vitest";

import { publicPathsForAdminMutation } from "@/lib/cache/public-content-paths";

describe("public content cache invalidation paths", () => {
  it("revalidates the homepage, listing, sitemap, and article detail", () => {
    expect(
      publicPathsForAdminMutation("berita", { slug: "renungan-hari-ini" }),
    ).toEqual([
      "/",
      "/berita",
      "/sitemap.xml",
      "/berita/renungan-hari-ini",
    ]);
  });

  it("does not build a detail path from an unsafe slug", () => {
    expect(
      publicPathsForAdminMutation("kegiatan", { slug: "../admin" }),
    ).not.toContain("/kegiatan/../admin");
  });


  it("revalidates gallery listing and album detail", () => {
    expect(
      publicPathsForAdminMutation("galeri", { slug: "baptisan-agustus-2026" }),
    ).toEqual(["/", "/galeri", "/galeri/baptisan-agustus-2026"]);
  });

  it("returns no public paths for private inbox resources", () => {
    expect(publicPathsForAdminMutation("permohonan-doa")).toEqual([]);
  });
});
