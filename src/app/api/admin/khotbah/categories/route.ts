import { NextResponse } from "next/server";

import {
  isAuthorizationFailure,
  requireAdminPermission,
} from "@/lib/admin/auth";

export async function GET() {
  const auth = await requireAdminPermission("sermons.manage");

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const { data, error } = await auth.supabase
    .from("sermon_categories")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { message: "Kategori khotbah tidak dapat dimuat" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: (data ?? []).map((category) => ({
      value: category.id,
      label: category.name,
    })),
  });
}
