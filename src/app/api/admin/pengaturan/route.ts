import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { SITE_CONFIG_KEY } from "@/lib/data/site-settings";
import {
  defaultSiteConfig,
  editableSiteConfig,
  normalizeSiteConfig,
  type EditableSiteConfig,
} from "@/lib/site/config";

const requiredFields: readonly (keyof EditableSiteConfig)[] = [
  "name",
  "shortName",
  "slogan",
  "description",
  "address",
  "email",
  "footerText",
];

const urlFields: readonly (keyof EditableSiteConfig)[] = [
  "mapsUrl",
  "instagram",
  "youtube",
  "liveUrl",
];

const maxLengths: Partial<Record<keyof EditableSiteConfig, number>> = {
  name: 180,
  shortName: 80,
  slogan: 120,
  description: 500,
  address: 500,
  mapsUrl: 1000,
  phone: 60,
  whatsapp: 60,
  email: 180,
  instagram: 1000,
  instagramLabel: 100,
  youtube: 1000,
  youtubeLabel: 100,
  liveUrl: 1000,
  pastorName: 160,
  secretariatHours: 200,
  footerText: 500,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseSettings(body: unknown) {
  if (!isRecord(body)) {
    return { success: false as const, errors: { _root: ["Payload tidak valid"] } };
  }

  const fallback = editableSiteConfig(defaultSiteConfig);
  const data = { ...fallback };
  const errors: Record<string, string[]> = {};

  for (const key of Object.keys(fallback) as (keyof EditableSiteConfig)[]) {
    const value = body[key];

    if (typeof value !== "string") {
      errors[key] = ["Nilai harus berupa teks"];
      continue;
    }

    const normalized = value.trim();
    const maxLength = maxLengths[key] ?? 500;

    if (normalized.length > maxLength) {
      errors[key] = [`Maksimal ${maxLength} karakter`];
      continue;
    }

    data[key] = normalized;
  }

  for (const key of requiredFields) {
    if (!data[key]) {
      errors[key] = ["Wajib diisi"];
    }
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = ["Alamat email tidak valid"];
  }

  for (const key of urlFields) {
    if (!validateUrl(data[key])) {
      errors[key] = ["Gunakan URL lengkap yang diawali http:// atau https://"];
    }
  }

  if (!data.mapsUrl && data.address) {
    data.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false as const, errors };
  }

  return { success: true as const, data };
}

export async function GET() {
  const auth = await requireAdminPermission("settings.manage");

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const { data, error } = await auth.supabase
    .from("site_settings")
    .select("value")
    .eq("key", SITE_CONFIG_KEY)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { message: "Pengaturan tidak dapat dimuat" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: editableSiteConfig(normalizeSiteConfig(data?.value)),
    siteUrl: defaultSiteConfig.url,
  });
}

export async function PUT(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json(
      { message: "Origin tidak valid" },
      { status: 403 },
    );
  }

  const auth = await requireAdminPermission("settings.manage");

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON tidak valid" },
      { status: 400 },
    );
  }

  const parsed = parseSettings(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validasi gagal", errors: parsed.errors },
      { status: 422 },
    );
  }

  const { data, error } = await auth.supabase
    .from("site_settings")
    .upsert(
      {
        key: SITE_CONFIG_KEY,
        value: parsed.data,
        description:
          "Profil dan informasi publik utama website GMAHK Naripan.",
        is_public: true,
        status: "active",
        created_by: auth.user.id,
      },
      { onConflict: "key" },
    )
    .select("value")
    .single();

  if (error) {
    return NextResponse.json(
      { message: "Pengaturan tidak dapat disimpan" },
      { status: 500 },
    );
  }

  revalidatePath("/", "layout");
  revalidatePath("/kontak");
  revalidatePath("/tentang");
  revalidatePath("/live");

  return NextResponse.json({
    data: editableSiteConfig(normalizeSiteConfig(data.value)),
    message: "Pengaturan website berhasil disimpan",
  });
}
