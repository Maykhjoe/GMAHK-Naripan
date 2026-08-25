import { describe, expect, it } from "vitest";

import {
  contactSchema,
  eventRegistrationSchema,
  loginSchema,
  prayerRequestSchema,
  visitorSchema,
} from "./forms";

describe("validasi formulir publik", () => {
  it("menolak permohonan doa tanpa persetujuan privasi", () => {
    const result = prayerRequestSchema.safeParse({
      name: "Maria",
      anonymous: false,
      category: "Kesehatan",
      request: "Mohon dukungan doa untuk pemulihan kesehatan.",
      sharingScope: "prayer_team",
      mayContact: false,
      privacyConsent: false,
    });

    expect(result.success).toBe(false);
  });

  it("menerima kedua pilihan akses permohonan doa", () => {
    const base = {
      name: "Maria",
      anonymous: false,
      category: "Kesehatan",
      request: "Mohon dukungan doa untuk pemulihan kesehatan.",
      mayContact: false,
      privacyConsent: true,
    } as const;

    expect(
      prayerRequestSchema.safeParse({
        ...base,
        sharingScope: "prayer_team",
      }).success,
    ).toBe(true);
    expect(
      prayerRequestSchema.safeParse({
        ...base,
        sharingScope: "pastor",
      }).success,
    ).toBe(true);
    expect(
      prayerRequestSchema.safeParse({
        ...base,
        sharingScope: "public",
      }).success,
    ).toBe(false);
  });

  it("menerima rencana kunjungan yang valid", () => {
    const result = visitorSchema.safeParse({
      name: "Daniel",
      whatsapp: "081234567890",
      visitDate: "2026-08-08",
      peopleCount: 2,
      bringingChildren: true,
      notes: "Datang bersama keluarga.",
      privacyConsent: true,
    });

    expect(result.success).toBe(true);
  });

  it("menolak pesan kontak yang terlalu pendek atau tanpa persetujuan", () => {
    expect(
      contactSchema.safeParse({
        name: "Rina",
        email: "rina@example.com",
        subject: "Tanya",
        message: "Halo",
        privacyConsent: true,
      }).success,
    ).toBe(false);

    expect(
      contactSchema.safeParse({
        name: "Rina",
        email: "rina@example.com",
        subject: "Informasi ibadah",
        message: "Saya ingin menanyakan jadwal ibadah minggu ini.",
        privacyConsent: false,
      }).success,
    ).toBe(false);
  });

  it("memvalidasi kredensial login username", () => {
    expect(
      loginSchema.safeParse({
        username: "admin.naripan",
        password: "PasswordApaPun",
      }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({
        username: "a",
        password: "PasswordApaPun",
      }).success,
    ).toBe(false);
  });

  it("mewajibkan kontak dan persetujuan pada registrasi kegiatan", () => {
    const base = {
      eventSlug: "seminar-kesehatan-keluarga",
      name: "Rina Naripan",
      peopleCount: 2,
      notes: "",
      consent: true,
    };

    expect(
      eventRegistrationSchema.safeParse({
        ...base,
        whatsapp: "081234567890",
        email: "",
      }).success,
    ).toBe(true);
    expect(
      eventRegistrationSchema.safeParse({
        ...base,
        whatsapp: "",
        email: "",
      }).success,
    ).toBe(false);
    expect(
      eventRegistrationSchema.safeParse({
        ...base,
        whatsapp: "081234567890",
        consent: false,
      }).success,
    ).toBe(false);
    expect(
      eventRegistrationSchema.safeParse({
        ...base,
        whatsapp: "081234567890",
        peopleCount: 21,
      }).success,
    ).toBe(false);
  });
});
