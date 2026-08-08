import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireSuperAdmin,
} from "@/lib/admin/auth";

export async function GET() {
  const auth = await requireSuperAdmin();

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const { data, error } = await auth.supabase
    .from("audit_logs")
    .select(
      "id,action,entity_type,entity_id,old_data,new_data,ip_address,created_at,profiles!audit_logs_actor_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json(
      { message: "Audit log tidak dapat dimuat" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}
