import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUserUpdateSchema } from "@/lib/admin/user-validation";
import { isAuthorizationFailure, requireAdminPermission, validateMutationOrigin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validateMutationOrigin(request)) return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  const auth = await requireAdminPermission("users.manage");
  if (isAuthorizationFailure(auth)) return auth;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ message: "ID pengguna tidak valid" }, { status: 400 });
  const parsed = adminUserUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Perubahan tidak valid", errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  if (id === auth.user.id && (parsed.data.role || parsed.data.status === "inactive")) return NextResponse.json({ message: "Role atau status akun sendiri tidak dapat diubah" }, { status: 409 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ message: "Service role Supabase belum dikonfigurasi" }, { status: 503 });
  if (parsed.data.status) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, { ban_duration: parsed.data.status === "inactive" ? "876000h" : "none" });
    if (authError) return NextResponse.json({ message: "Status Auth pengguna tidak dapat diperbarui" }, { status: 500 });
  }
  const profileValues: Record<string, unknown> = {};
  if (parsed.data.fullName) profileValues.full_name = parsed.data.fullName;
  if (parsed.data.status) profileValues.status = parsed.data.status;
  if (Object.keys(profileValues).length) {
    const { error } = await admin.from("profiles").update(profileValues).eq("id", id);
    if (error) { if (parsed.data.status) await admin.auth.admin.updateUserById(id, { ban_duration: parsed.data.status === "inactive" ? "none" : "876000h" }); return NextResponse.json({ message: "Profil pengguna tidak dapat diperbarui" }, { status: 500 }); }
  }
  if (parsed.data.fullName) await admin.auth.admin.updateUserById(id, { user_metadata: { full_name: parsed.data.fullName } });
  if (parsed.data.role) { const { error } = await admin.rpc("set_user_role", { target_user_id: id, target_role_code: parsed.data.role }); if (error) return NextResponse.json({ message: "Role tidak dapat diperbarui" }, { status: 409 }); }
  return NextResponse.json({ success: true });
}
