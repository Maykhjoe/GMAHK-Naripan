import { z } from "zod";

const optionalEmail = z
  .union([z.literal(""), z.email("Alamat email tidak valid")])
  .optional();
const optionalPhone = z
  .union([
    z.literal(""),
    z.string().regex(/^[+0-9\s-]{8,18}$/, "Nomor WhatsApp tidak valid"),
  ])
  .optional();

export const prayerSharingScopes = ["prayer_team", "pastor"] as const;

export const prayerRequestSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  anonymous: z.boolean(),
  whatsapp: optionalPhone,
  email: optionalEmail,
  category: z.enum([
    "Kesehatan",
    "Keluarga",
    "Pekerjaan",
    "Pendidikan",
    "Kerohanian",
    "Ucapan syukur",
    "Lainnya",
  ]),
  request: z
    .string()
    .trim()
    .min(20, "Tuliskan permohonan setidaknya 20 karakter")
    .max(2000),
  sharingScope: z.enum(prayerSharingScopes),
  mayContact: z.boolean(),
  privacyConsent: z
    .boolean()
    .refine((value) => value, "Persetujuan privasi wajib diberikan"),
});

export const visitorSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  whatsapp: z
    .string()
    .regex(/^[+0-9\s-]{8,18}$/, "Nomor WhatsApp tidak valid"),
  visitDate: z.string().min(1, "Pilih tanggal kunjungan"),
  peopleCount: z.number().int().min(1).max(20),
  bringingChildren: z.boolean(),
  notes: z.string().trim().max(500).optional(),
  privacyConsent: z
    .boolean()
    .refine((value) => value, "Persetujuan privasi wajib diberikan"),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email("Alamat email tidak valid"),
  phone: optionalPhone,
  subject: z.string().trim().min(3).max(120),
  message: z
    .string()
    .trim()
    .min(15, "Pesan minimal 15 karakter")
    .max(2000),
  privacyConsent: z
    .boolean()
    .refine((value) => value, "Persetujuan privasi wajib diberikan"),
  turnstileToken: z.string().optional(),
});

export const eventRegistrationSchema = z
  .object({
    eventSlug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Kegiatan tidak valid")
      .max(120),
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
    whatsapp: optionalPhone,
    email: optionalEmail,
    peopleCount: z
      .number()
      .int()
      .min(1, "Minimal 1 peserta")
      .max(20, "Maksimal 20 peserta per pendaftaran"),
    notes: z.string().trim().max(1000).optional(),
    consent: z
      .boolean()
      .refine((value) => value, "Persetujuan pemrosesan data wajib diberikan"),
  })
  .superRefine((value, context) => {
    if (!value.whatsapp && !value.email) {
      context.addIssue({
        code: "custom",
        path: ["whatsapp"],
        message: "Isi WhatsApp atau email",
      });
    }
  });

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(32, "Username maksimal 32 karakter"),
  password: z.string().min(1, "Kata sandi wajib diisi").max(128),
});

export type PrayerRequestInput = z.infer<typeof prayerRequestSchema>;
export type VisitorInput = z.infer<typeof visitorSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;
