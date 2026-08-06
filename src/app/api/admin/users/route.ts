import { NextResponse } from "next/server";
import { adminInviteSchema } from "@/lib/admin/user-validation";
import { isAuthorizationFailure, requireAdminPermission, validateMutationOrigin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type ProfileRow = { id: string; full_name: string | null; status: string; user_roles: { roles: { code: string; name: string } | { code: string; name: string }[] | null }[] };
export async function GET(request: Request) {
  const auth = await requireAdminPermission("users.manage");
  if (isAuthorizationFailure(auth)) return auth;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ message: "Service role Supabase belum dikonfigurasi" }, { status: 503 });
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = 25;
  const { data: authData, error } = await admin.auth.admin.listUsers({ page, perPage });
  if (error) return NextResponse.json({ message: "Pengguna tidak dapat dimuat" }, { status: 500 });
  const ids = authData.users.map((user) => user.id);
  const { data: profileData } = ids.length ? await admin.from("profiles").select("id,full_name,status,user_roles(roles(code,name))").in("id", ids) : { data: [] };
  const profiles = new Map(((profileData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const users = authData.users.map((user) => { const profile = profiles.get(user.id); const relation = profile?.user_roles.flatMap((item) => Array.isArray(item.roles) ? item.roles : item.roles ? [item.roles] : [])[0]; return { id: user.id, email: user.email ?? "", fullName: profile?.full_name ?? String(user.user_metadata.full_name ?? ""), status: profile?.status ?? "active", role: relation?.code ?? null, roleName: relation?.name ?? null, invitedAt: user.invited_at ?? null, lastSignInAt: user.last_sign_in_at ?? null, createdAt: user.created_at }; });
  return NextResponse.json({ data: users, total: authData.total ?? users.length, page, perPage });
}

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) return NextResponse.json({ message: "Origin tidak valid" }, { status: 403 });
  const auth = await requireAdminPermission("users.manage");
  if (isAuthorizationFailure(auth)) return auth;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ message: "Service role Supabase belum dikonfigurasi" }, { status: 503 });
  const parsed = adminInviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Data undangan tidak valid", errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, { data: { full_name: parsed.data.fullName }, redirectTo: `${origin}/auth/callback?next=/auth/reset-password` });
  if (error || !data.user) return NextResponse.json({ message: "Undangan tidak dapat dikirim. Pastikan email belum terdaftar." }, { status: 409 });
  const profileResult = await admin.from("profiles").upsert({ id: data.user.id, full_name: parsed.data.fullName, status: "active" });
  const roleResult = await admin.rpc("set_user_role", { target_user_id: data.user.id, target_role_code: parsed.data.role });
  if (profileResult.error || roleResult.error) { await admin.auth.admin.deleteUser(data.user.id); return NextResponse.json({ message: "Role pengguna tidak dapat disimpan; undangan dibatalkan." }, { status: 500 }); }
  return NextResponse.json({ data: { id: data.user.id, email: parsed.data.email, fullName: parsed.data.fullName, role: parsed.data.role, status: "active", invitedAt: data.user.invited_at ?? new Date().toISOString(), lastSignInAt: null, createdAt: data.user.created_at } }, { status: 201 });
}
