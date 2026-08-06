import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizationFailure, requireAdminPermission, validateMutationOrigin } from "@/lib/admin/auth";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validateMutationOrigin(request)) return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
  const auth = await requireAdminPermission("files.manage");
  if (isAuthorizationFailure(auth)) return auth;
  const { data: media, error: readError } = await auth.supabase.from("media_files").select("bucket,storage_path").eq("id", id).is("deleted_at", null).single();
  if (readError || !media) return NextResponse.json({ message: "File tidak ditemukan" }, { status: 404 });
  const deletedAt = new Date().toISOString();
  const { error: metadataError } = await auth.supabase.from("media_files").update({ status: "inactive", deleted_at: deletedAt }).eq("id", id);
  if (metadataError) return NextResponse.json({ message: "Metadata file tidak dapat dihapus" }, { status: 500 });
  const { error: storageError } = await auth.supabase.storage.from(media.bucket).remove([media.storage_path]);
  if (storageError) {
    await auth.supabase.from("media_files").update({ status: "active", deleted_at: null }).eq("id", id).eq("deleted_at", deletedAt);
    return NextResponse.json({ message: "File Storage tidak dapat dihapus" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
