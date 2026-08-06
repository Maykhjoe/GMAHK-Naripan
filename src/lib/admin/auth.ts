import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Permission } from "@/lib/permissions/rbac";
import { createClient } from "@/lib/supabase/server";

export type AuthorizedAdmin = {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  user: User;
};

export async function requireAdminPermission(permission: Permission): Promise<AuthorizedAdmin | NextResponse> {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ message: "Supabase belum dikonfigurasi" }, { status: 503 });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ message: "Sesi admin tidak valid" }, { status: 401 });
  const { data: allowed, error } = await supabase.rpc("has_permission", { permission_code: permission });
  if (error || !allowed) return NextResponse.json({ message: "Anda tidak memiliki izin untuk tindakan ini" }, { status: 403 });
  return { supabase, user };
}

export function isAuthorizationFailure(value: AuthorizedAdmin | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export function validateMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
