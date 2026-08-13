import "server-only";

import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import {
  mediaStoragePath,
  safeOriginalFileName,
  validateUploadFile,
} from "@/lib/admin/media";
import type { Permission } from "@/lib/permissions/rbac";
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { requestBodyExceeds } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type Options = {
  permission: Permission;
  usage:
    | "post-featured-image"
    | "event-poster"
    | "sermon-thumbnail"
    | "livestream-thumbnail"
    | "leader-photo"
    | "ministry-thumbnail"
    | "ministry-coordinator-photo";
  label: string;
  maxBytes?: number;
};

export async function handleAdminImageUpload(
  request: Request,
  options: Options,
) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  }

  const auth = await requireAdminPermission(options.permission);
  if (isAuthorizationFailure(auth)) return auth;

  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  if (requestBodyExceeds(request, maxBytes + 128 * 1024)) {
    return NextResponse.json(
      { message: `Ukuran ${options.label.toLowerCase()} maksimal ${Math.floor(maxBytes / 1024 / 1024)} MB` },
      { status: 413 },
    );
  }

  const limited = await enforceRateLimit({
    key: `admin-upload:${options.usage}:${auth.user.id}`,
    limit: 20,
    windowMs: 10 * 60_000,
    message: "Terlalu banyak upload. Silakan tunggu beberapa menit.",
  });
  if (limited) return limited;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Form upload tidak valid" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: `Pilih ${options.label.toLowerCase()} untuk diunggah` },
      { status: 400 },
    );
  }

  const validation = await validateUploadFile(file, {
    allowedTypes: IMAGE_TYPES,
    maxBytes,
  });
  if (!validation.success) {
    return NextResponse.json(
      { message: validation.message },
      { status: 422 },
    );
  }

  const storageAdmin = createAdminClient();
  if (!storageAdmin) {
    return NextResponse.json(
      { message: "Layanan upload belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const bucket = "public-media";
  const path = mediaStoragePath(auth.user.id, file.name);
  const altText = String(form.get("altText") ?? "").trim().slice(0, 250);

  const { error: uploadError } = await storageAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType: validation.mimeType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("[admin:image-upload] storage upload failed", {
      usage: options.usage,
      code: uploadError.name,
      message: uploadError.message,
    });
    return NextResponse.json(
      { message: `${options.label} tidak dapat diunggah ke penyimpanan` },
      { status: 500 },
    );
  }

  const { data, error } = await storageAdmin
    .from("media_files")
    .insert({
      bucket,
      storage_path: path,
      file_name: safeOriginalFileName(file.name),
      mime_type: validation.mimeType,
      size_bytes: file.size,
      alt_text: altText || null,
      created_by: auth.user.id,
      metadata: { usage: options.usage },
    })
    .select("id, file_name")
    .single();

  if (error) {
    await storageAdmin.storage.from(bucket).remove([path]);
    console.error("[admin:image-upload] metadata insert failed", {
      usage: options.usage,
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { message: `Metadata ${options.label.toLowerCase()} tidak dapat disimpan` },
      { status: 500 },
    );
  }

  const publicUrl = storageAdmin.storage
    .from(bucket)
    .getPublicUrl(path).data.publicUrl;

  return NextResponse.json(
    { data: { id: data.id, file_name: data.file_name, url: publicUrl } },
    { status: 201 },
  );
}
