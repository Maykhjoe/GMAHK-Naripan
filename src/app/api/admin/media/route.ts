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
import { enforceRateLimit } from "@/lib/security/enforce-rate-limit";
import { requestBodyExceeds } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";

const PUBLIC_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
const PRIVATE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

type MediaFileRow = {
  bucket: string;
  storage_path: string;
  [key: string]: unknown;
};

export async function GET(request: Request) {
  const auth = await requireAdminPermission("files.manage");
  if (isAuthorizationFailure(auth)) return auth;

  const limited = await enforceRateLimit({
    key: `admin-media-list:${auth.user.id}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    60,
    Math.max(12, Number(url.searchParams.get("pageSize")) || 24),
  );
  const bucket = url.searchParams.get("bucket");
  let query = auth.supabase
    .from("media_files")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (bucket === "public-media" || bucket === "private-documents") {
    query = query.eq("bucket", bucket);
  }

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json(
      { message: "Media tidak dapat dimuat" },
      { status: 500 },
    );
  }

  const rows = ((data ?? []) as MediaFileRow[]).map((item) => ({
    ...item,
    url:
      item.bucket === "public-media"
        ? auth.supabase.storage
            .from(item.bucket)
            .getPublicUrl(item.storage_path).data.publicUrl
        : null,
  }));

  return NextResponse.json({ data: rows, count: count ?? 0, page, pageSize });
}

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  }

  const auth = await requireAdminPermission("files.manage");
  if (isAuthorizationFailure(auth)) return auth;

  if (requestBodyExceeds(request, MAX_MEDIA_BYTES + 128 * 1024)) {
    return NextResponse.json(
      { message: "Ukuran file maksimal 10 MB" },
      { status: 413 },
    );
  }

  const limited = await enforceRateLimit({
    key: `admin-media-upload:${auth.user.id}`,
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
  const bucketValue = form.get("bucket");
  const bucket =
    bucketValue === "private-documents" ? "private-documents" : "public-media";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: "Pilih file untuk diunggah" },
      { status: 400 },
    );
  }

  const validation = await validateUploadFile(file, {
    allowedTypes:
      bucket === "private-documents" ? PRIVATE_MEDIA_TYPES : PUBLIC_MEDIA_TYPES,
    maxBytes: MAX_MEDIA_BYTES,
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

  const path = mediaStoragePath(auth.user.id, file.name);
  const { error: uploadError } = await storageAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType: validation.mimeType,
      cacheControl: bucket === "public-media" ? "31536000" : "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("[admin:media] storage upload failed", {
      code: uploadError.name,
      message: uploadError.message,
    });
    return NextResponse.json(
      { message: "File tidak dapat diunggah" },
      { status: 500 },
    );
  }

  const altText = String(form.get("altText") ?? "").trim().slice(0, 250) || null;
  const { data, error } = await storageAdmin
    .from("media_files")
    .insert({
      bucket,
      storage_path: path,
      file_name: safeOriginalFileName(file.name),
      mime_type: validation.mimeType,
      size_bytes: file.size,
      alt_text: altText,
      created_by: auth.user.id,
    })
    .select()
    .single();

  if (error) {
    await storageAdmin.storage.from(bucket).remove([path]);
    console.error("[admin:media] metadata insert failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { message: "Metadata file tidak dapat disimpan" },
      { status: 500 },
    );
  }

  const publicUrl =
    bucket === "public-media"
      ? storageAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl
      : null;

  return NextResponse.json(
    { data: { ...data, url: publicUrl } },
    { status: 201 },
  );
}
