import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin";
  return value;
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL("/auth/login?error=missing-code", url.origin));
  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/auth/login?error=not-configured", url.origin));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth/login?error=invalid-code", url.origin));
  return NextResponse.redirect(new URL(next, url.origin));
}
