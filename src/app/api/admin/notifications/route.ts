import { NextResponse } from "next/server";
import { isAuthorizationFailure, requireAdminPermission, validateMutationOrigin } from "@/lib/admin/auth";

export async function GET() {
  const auth = await requireAdminPermission("dashboard.read");
  if (isAuthorizationFailure(auth)) return auth;
  const { data, error } = await auth.supabase.from("notifications").select("id,title,body,link_url,read_at,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ message: "Notifikasi tidak dapat dimuat" }, { status: 500 });
  return NextResponse.json({ data: data ?? [], unread: (data ?? []).filter((item) => !item.read_at).length });
}

export async function PATCH(request: Request) {
  if (!validateMutationOrigin(request)) return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  const auth = await requireAdminPermission("dashboard.read");
  if (isAuthorizationFailure(auth)) return auth;
  const { error } = await auth.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", auth.user.id).is("read_at", null);
  if (error) return NextResponse.json({ message: "Notifikasi tidak dapat diperbarui" }, { status: 500 });
  return NextResponse.json({ success: true });
}
