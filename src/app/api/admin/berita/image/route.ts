import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { mediaStoragePath } from "@/lib/admin/media";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json(
      { message: "Origin tidak valid" },
      { status: 403 },
    );
  }

  const auth = await requireAdminPermission("posts.manage");

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

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
      { message: "Pilih gambar untuk diunggah" },
      { status: 400 },
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { message: "Gambar harus berformat JPG, PNG, atau WebP" },
      { status: 422 },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { message: "Ukuran gambar maksimal 5 MB" },
      { status: 422 },
    );
  }

  const bucket = "public-media";
  const path = mediaStoragePath(auth.user.id, file.name);
  const altText = String(form.get("altText") ?? "")
    .trim()
    .slice(0, 250);

  const { error: uploadError } = await auth.supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { message: "Gambar tidak dapat diunggah ke penyimpanan" },
      { status: 500 },
    );
  }

  const { data, error } = await auth.supabase
    .from("media_files")
    .insert({
      bucket,
      storage_path: path,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      size_bytes: file.size,
      alt_text: altText || null,
      created_by: auth.user.id,
      metadata: {
        usage: "post-featured-image",
      },
    })
    .select("id, file_name")
    .single();

  if (error) {
    await auth.supabase.storage.from(bucket).remove([path]);

    return NextResponse.json(
      { message: "Metadata gambar tidak dapat disimpan" },
      { status: 500 },
    );
  }

  const publicUrl = auth.supabase.storage
    .from(bucket)
    .getPublicUrl(path).data.publicUrl;

  return NextResponse.json(
    {
      data: {
        id: data.id,
        file_name: data.file_name,
        url: publicUrl,
      },
    },
    { status: 201 },
  );
}
