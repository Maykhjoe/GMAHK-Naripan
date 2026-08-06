import { describe, expect, it } from "vitest";

import {
  getAdminResource,
  parseResourcePayload,
  sanitizeResourcePayload,
} from "./resources";

describe("admin resource registry", () => {
  it("maps every content section to a table and permission", () => {
    expect(getAdminResource("jadwal")).toMatchObject({
      table: "service_schedules",
      permission: "schedules.manage",
    });
    expect(getAdminResource("kegiatan")).toMatchObject({
      table: "events",
      permission: "events.manage",
    });
    expect(getAdminResource("khotbah")).toMatchObject({
      table: "sermons",
      permission: "sermons.manage",
    });
    expect(getAdminResource("berita")).toMatchObject({
      table: "posts",
      permission: "posts.manage",
      slugSource: "title",
    });
    expect(getAdminResource("permohonan-doa")).toMatchObject({
      table: "prayer_requests",
      permission: "prayers.read",
      readOnly: false,
    });
  });

  it("rejects unknown resources", () => {
    expect(getAdminResource("tidak-ada")).toBeNull();
  });

  it("removes protected, generated, and unknown fields from payloads", () => {
    const result = sanitizeResourcePayload("kegiatan", {
      title: "Seminar Kesehatan",
      slug: "slug-dibuat-server",
      seo: { title: "SEO palsu" },
      status: "published",
      created_by: "forged-user",
      deleted_at: "2026-01-01",
      unknown_field: "unsafe",
    });

    expect(result).toEqual({
      title: "Seminar Kesehatan",
      status: "published",
    });
  });

  it("never permits identity, audit, or soft-delete columns through regular payloads", () => {
    const result = sanitizeResourcePayload("berita", {
      id: "forged-id",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      created_by: "forged-user",
      deleted_at: "2026-01-01",
      title: "Renungan Mingguan",
    });

    expect(result).toEqual({ title: "Renungan Mingguan" });
  });

  it("validates required fields and normalizes typed values", () => {
    const invalid = parseResourcePayload(
      "kegiatan",
      { starts_at: "2026-08-10T09:00" },
      false,
    );
    expect(invalid.success).toBe(false);

    const valid = parseResourcePayload(
      "kegiatan",
      {
        title: "Seminar Kesehatan",
        category: "Kesehatan",
        short_description: "Seminar untuk membantu keluarga membangun kebiasaan hidup sehat.",
        starts_at: "2026-08-10T09:00",
        capacity: "120",
        registration_enabled: true,
        rundown: "09.00 Pembukaan\n10.00 Materi",
        status: "draft",
      },
      false,
    );

    expect(valid).toMatchObject({
      success: true,
      data: {
        capacity: 120,
        registration_enabled: true,
        rundown: "09.00 Pembukaan\n10.00 Materi",
      },
    });
  });

  it("accepts partial update payloads but rejects malformed URLs", () => {
    expect(
      parseResourcePayload("jadwal", { status: "published" }, true).success,
    ).toBe(true);
    expect(
      parseResourcePayload("jadwal", { youtube_url: "not-a-url" }, true)
        .success,
    ).toBe(false);
  });

  it("accepts an uploaded event poster relation and URL", () => {
    const imageId = "33333333-3333-4333-8333-333333333333";

    const parsed = parseResourcePayload(
      "kegiatan",
      {
        title: "Seminar Keluarga",
        category: "Keluarga",
        short_description: "Kegiatan untuk seluruh keluarga.",
        starts_at: "2026-08-15T09:00:00.000Z",
        poster_id: imageId,
        poster_url: "https://example.com/poster.webp",
        registration_enabled: false,
        status: "draft",
      },
      false,
    );

    expect(parsed).toMatchObject({
      success: true,
      data: {
        poster_id: imageId,
        poster_url: "https://example.com/poster.webp",
      },
    });
  });

  it("accepts article category and featured-image relation IDs", () => {
    const categoryId = "11111111-1111-4111-8111-111111111111";
    const imageId = "22222222-2222-4222-8222-222222222222";

    const parsed = parseResourcePayload(
      "berita",
      {
        title: "Berita Jemaat",
        category_id: categoryId,
        author_name: "Tim Komunikasi",
        excerpt: "Ringkasan",
        content: "Isi artikel",
        featured_image_id: imageId,
        featured_image_url: "https://example.com/gambar.webp",
        status: "draft",
      },
      false,
    );

    expect(parsed).toMatchObject({
      success: true,
      data: {
        category_id: categoryId,
        featured_image_id: imageId,
      },
    });
  });

  it("rejects forged relation IDs and normalizes an empty optional UUID", () => {
    expect(
      parseResourcePayload(
        "permohonan-doa",
        { assigned_to: "not-a-uuid" },
        true,
      ).success,
    ).toBe(false);

    const empty = parseResourcePayload(
      "permohonan-doa",
      { assigned_to: "" },
      true,
    );
    expect(empty.success).toBe(true);

    if (empty.success) {
      expect(empty.data.assigned_to).toBeNull();
    }
  });

  it("accepts sermon category, thumbnail, and simple editorial fields", () => {
    const categoryId = "44444444-4444-4444-8444-444444444444";
    const thumbnailId = "55555555-5555-4555-8555-555555555555";

    const parsed = parseResourcePayload(
      "khotbah",
      {
        title: "Berakar di Dalam Kristus",
        category_id: categoryId,
        speaker_name: "Pdt. Contoh",
        sermon_date: "2026-08-08",
        main_verse: "Kolose 2:6–7",
        description: "Pesan tentang hidup yang berakar di dalam Kristus.",
        youtube_id: "https://youtu.be/dQw4w9WgXcQ",
        thumbnail_id: thumbnailId,
        thumbnail_url: "https://example.com/thumbnail.webp",
        audio_url: "https://example.com/audio.mp3",
        material_pdf_url: "https://example.com/materi.pdf",
        status: "draft",
      },
      false,
    );

    expect(parsed).toMatchObject({
      success: true,
      data: {
        category_id: categoryId,
        thumbnail_id: thumbnailId,
        speaker_name: "Pdt. Contoh",
      },
    });
  });

  it("accepts simple ministry fields and an uploaded thumbnail", () => {
    const thumbnailId = "66666666-6666-4666-8666-666666666666";

    const parsed = parseResourcePayload(
      "departemen",
      {
        name: "Pelayanan Anak",
        short_name: "PA",
        short_description: "Menolong anak mengenal dan mengasihi Yesus.",
        description:
          "Pelayanan yang mendampingi pertumbuhan iman anak melalui kegiatan yang menyenangkan.",
        coordinator_name: "Ibu Contoh",
        contact: "0812-3456-7890",
        contact_email: "anak@example.org",
        schedule: "Sabtu, 14.00 WIB",
        location: "Ruang Anak",
        ministry_icon: "Heart",
        thumbnail_id: thumbnailId,
        thumbnail_url: "https://example.com/pelayanan-anak.webp",
        programs: "Kelas Alkitab\nPaduan suara anak",
        display_order: "2",
        status: "draft",
      },
      false,
    );

    expect(parsed).toMatchObject({
      success: true,
      data: {
        thumbnail_id: thumbnailId,
        display_order: 2,
        ministry_icon: "Heart",
      },
    });
  });

});
