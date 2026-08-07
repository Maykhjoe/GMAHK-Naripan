import { describe, expect, it } from "vitest";

import { getAdminResource } from "./resources";
import {
  createSlug,
  extractYouTubeId,
  prepareResourcePayload,
} from "./resource-payload";

describe("resource payload preparation", () => {
  it("creates a clean slug from Indonesian content titles", () => {
    expect(createSlug("  Kegiatan Kasih & Kesehatan 2026! ")).toBe(
      "kegiatan-kasih-kesehatan-2026",
    );
  });

  it("turns a plain article into database content, reading time, and SEO", () => {
    const resource = getAdminResource("berita");
    expect(resource).not.toBeNull();

    const payload = prepareResourcePayload(
      "berita",
      resource!,
      {
        title: "Renungan Sabat",
        excerpt: "Ringkasan renungan untuk jemaat.",
        content: "Paragraf pertama.\n\nParagraf kedua.",
        author_name: "Tim Komunikasi GMAHK Naripan",
        featured_image_url:
          "https://contoh.supabase.co/storage/v1/object/public/public-media/artikel.webp",
        status: "draft",
      },
      "create",
    );

    expect(payload).toMatchObject({
      slug: "renungan-sabat",
      content: {
        paragraphs: ["Paragraf pertama.", "Paragraf kedua."],
      },
      reading_minutes: 1,
      seo: {
        title: "Renungan Sabat",
        description: "Ringkasan renungan untuk jemaat.",
        author: "Tim Komunikasi GMAHK Naripan",
        image:
          "https://contoh.supabase.co/storage/v1/object/public/public-media/artikel.webp",
      },
    });
    expect(payload).not.toHaveProperty("author_name");
    expect(payload).not.toHaveProperty("featured_image_url");
  });

  it("preserves existing article SEO values during a partial update", () => {
    const resource = getAdminResource("berita");
    expect(resource).not.toBeNull();

    const payload = prepareResourcePayload(
      "berita",
      resource!,
      { title: "Judul yang diperbarui" },
      "update",
      {
        seo: {
          author: "Penulis Lama",
          image: "https://example.com/gambar-lama.webp",
        },
      },
    );

    expect(payload.seo).toMatchObject({
      title: "Judul yang diperbarui",
      author: "Penulis Lama",
      image: "https://example.com/gambar-lama.webp",
    });
  });

  it("creates event SEO with the uploaded poster and preserves it on update", () => {
    const resource = getAdminResource("kegiatan");
    expect(resource).not.toBeNull();

    const created = prepareResourcePayload(
      "kegiatan",
      resource!,
      {
        title: "Seminar Kesehatan",
        short_description: "Belajar hidup sehat bersama keluarga.",
        poster_url:
          "https://contoh.supabase.co/storage/v1/object/public/public-media/poster.webp",
        rundown: "Registrasi\nMateri\nPenutup",
      },
      "create",
    );

    expect(created).toMatchObject({
      slug: "seminar-kesehatan",
      rundown: ["Registrasi", "Materi", "Penutup"],
      seo: {
        title: "Seminar Kesehatan",
        description: "Belajar hidup sehat bersama keluarga.",
        image:
          "https://contoh.supabase.co/storage/v1/object/public/public-media/poster.webp",
      },
    });
    expect(created).not.toHaveProperty("poster_url");

    const updated = prepareResourcePayload(
      "kegiatan",
      resource!,
      { title: "Seminar Kesehatan Keluarga" },
      "update",
      {
        seo: {
          image: "https://example.com/poster-lama.webp",
        },
      },
    );

    expect(updated.seo).toMatchObject({
      title: "Seminar Kesehatan Keluarga",
      image: "https://example.com/poster-lama.webp",
    });
  });

  it("converts simple line input into rundown and program arrays", () => {
    const eventResource = getAdminResource("kegiatan");
    const ministryResource = getAdminResource("departemen");

    expect(eventResource).not.toBeNull();
    expect(ministryResource).not.toBeNull();

    const event = prepareResourcePayload(
      "kegiatan",
      eventResource!,
      {
        title: "Seminar",
        short_description: "Seminar keluarga",
        rundown: "Registrasi\nPembukaan\nMateri",
      },
      "create",
    );
    const ministry = prepareResourcePayload(
      "departemen",
      ministryResource!,
      {
        name: "Pelayanan Anak",
        programs: "Kelas Alkitab\nPaduan suara anak",
      },
      "create",
    );

    expect(event.rundown).toEqual(["Registrasi", "Pembukaan", "Materi"]);
    expect(ministry.programs).toEqual([
      "Kelas Alkitab",
      "Paduan suara anak",
    ]);
  });

  it("extracts YouTube IDs from common URLs", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("creates sermon SEO and removes virtual editorial fields", () => {
    const resource = getAdminResource("khotbah");
    expect(resource).not.toBeNull();

    const payload = prepareResourcePayload(
      "khotbah",
      resource!,
      {
        title: "Berakar di Dalam Kristus",
        description: "Pesan tentang kehidupan yang berakar dalam Kristus.",
        speaker_name: "Pdt. Contoh",
        youtube_id: "https://youtu.be/dQw4w9WgXcQ",
        thumbnail_url: "https://example.com/thumbnail.webp",
        audio_url: "https://example.com/audio.mp3",
        material_pdf_url: "https://example.com/materi.pdf",
      },
      "create",
    );

    expect(payload).toMatchObject({
      slug: "berakar-di-dalam-kristus",
      youtube_id: "dQw4w9WgXcQ",
      seo: {
        title: "Berakar di Dalam Kristus",
        description: "Pesan tentang kehidupan yang berakar dalam Kristus.",
        speaker: "Pdt. Contoh",
        image: "https://example.com/thumbnail.webp",
        audio: "https://example.com/audio.mp3",
        materialPdf: "https://example.com/materi.pdf",
      },
    });
    expect(payload).not.toHaveProperty("speaker_name");
    expect(payload).not.toHaveProperty("thumbnail_url");
    expect(payload).not.toHaveProperty("audio_url");
    expect(payload).not.toHaveProperty("material_pdf_url");
  });

  it("creates ministry SEO and removes virtual editorial fields", () => {
    const resource = getAdminResource("departemen");
    expect(resource).not.toBeNull();

    const payload = prepareResourcePayload(
      "departemen",
      resource!,
      {
        name: "Pelayanan Anak",
        short_description: "Menolong anak mengenal dan mengasihi Yesus.",
        description: "Deskripsi lengkap pelayanan anak.",
        short_name: "PA",
        coordinator_name: "Ibu Contoh",
        contact_email: "anak@example.org",
        schedule: "Sabtu, 14.00 WIB",
        location: "Ruang Anak",
        ministry_icon: "Heart",
        thumbnail_url: "https://example.com/pelayanan-anak.webp",
        programs: "Kelas Alkitab\nPaduan suara anak",
      },
      "create",
    );

    expect(payload).toMatchObject({
      slug: "pelayanan-anak",
      programs: ["Kelas Alkitab", "Paduan suara anak"],
      seo: {
        title: "Pelayanan Anak",
        description: "Menolong anak mengenal dan mengasihi Yesus.",
        shortName: "PA",
        coordinator: "Ibu Contoh",
        email: "anak@example.org",
        schedule: "Sabtu, 14.00 WIB",
        location: "Ruang Anak",
        icon: "Heart",
        image: "https://example.com/pelayanan-anak.webp",
      },
    });

    expect(payload).not.toHaveProperty("short_name");
    expect(payload).not.toHaveProperty("coordinator_name");
    expect(payload).not.toHaveProperty("contact_email");
    expect(payload).not.toHaveProperty("schedule");
    expect(payload).not.toHaveProperty("location");
    expect(payload).not.toHaveProperty("ministry_icon");
    expect(payload).not.toHaveProperty("thumbnail_url");
  });

  it("normalizes livestream YouTube input and keeps uploaded thumbnail data", () => {
    const resource = getAdminResource("live");
    expect(resource).not.toBeNull();

    const payload = prepareResourcePayload(
      "live",
      resource!,
      {
        title: "Kebaktian Sabat",
        youtube_id: "https://www.youtube.com/live/dQw4w9WgXcQ",
        thumbnail_id: "44444444-4444-4444-8444-444444444444",
        thumbnail_url: "https://example.com/live.webp",
      },
      "create",
    );

    expect(payload).toMatchObject({
      youtube_id: "dQw4w9WgXcQ",
      thumbnail_id: "44444444-4444-4444-8444-444444444444",
      thumbnail_url: "https://example.com/live.webp",
    });
  });

});
