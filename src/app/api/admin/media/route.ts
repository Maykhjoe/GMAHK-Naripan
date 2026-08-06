import { NextResponse } from "next/server";
import { isAuthorizationFailure, requireAdminPermission, validateMutationOrigin } from "@/lib/admin/auth";
import { mediaStoragePath, validateMediaMetadata } from "@/lib/admin/media";

export async function GET(request: Request) {
  const auth = await requireAdminPermission("files.manage");
  if (isAuthorizationFailure(auth)) return auth;
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(60, Math.max(12, Number(url.searchParams.get("pageSize")) || 24));
  const bucket = url.searchParams.get("bucket");
  let query = auth.supabase.from("media_files").select("*", { count: "exact" }).is("deleted_at", null).order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (bucket === "public-media" || bucket === "private-documents") query = query.eq("bucket", bucket);
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ message: "Media tidak dapat dimuat" }, { status: 500 });
  const rows = (data ?? []).map((item) => ({ ...item, url: item.bucket === "public-media" ? auth.supabase.storage.from(item.bucket).getPublicUrl(item.storage_path).data.publicUrl : null }));
  return NextResponse.json({ data: rows, count: count ?? 0, page, pageSize });
}

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  const auth = await requireAdminPermission("files.manage");
  if (isAuthorizationFailure(auth)) return auth;
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ message: "Form upload tidak valid" }, { status: 400 }); }
  const file = form.get("file");
  const bucketValue = form.get("bucket");
  const bucket = bucketValue === "private-documents" ? "private-documents" : "public-media";
  if (!(file instanceof File)) return NextResponse.json({ message: "Pilih file untuk diunggah" }, { status: 400 });
  const validation = validateMediaMetadata(file);
  if (!validation.success) return NextResponse.json({ message: validation.message }, { status: 422 });
  if (bucket === "private-documents" && file.type !== "application/pdf" && !file.type.startsWith("image/")) return NextResponse.json({ message: "Tipe dokumen privat tidak valid" }, { status: 422 });
  const path = mediaStoragePath(auth.user.id, file.name);
  const { error: uploadError } = await auth.supabase.storage.from(bucket).upload(path, file, { contentType: file.type, cacheControl: bucket === "public-media" ? "31536000" : "3600", upsert: false });
  if (uploadError) return NextResponse.json({ message: "File tidak dapat diunggah" }, { status: 500 });
  const altText = String(form.get("altText") ?? "").trim().slice(0, 250) || null;
  const { data, error } = await auth.supabase.from("media_files").insert({ bucket, storage_path: path, file_name: file.name.slice(0, 255), mime_type: file.type, size_bytes: file.size, alt_text: altText, created_by: auth.user.id }).select().single();
  if (error) { await auth.supabase.storage.from(bucket).remove([path]); return NextResponse.json({ message: "Metadata file tidak dapat disimpan" }, { status: 500 }); }
  const publicUrl = bucket === "public-media" ? auth.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
  return NextResponse.json({ data: { ...data, url: publicUrl } }, { status: 201 });
}
