import "server-only";

import { NextResponse } from "next/server";

import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

type Options = {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
};

export async function enforceRateLimit(options: Options) {
  const result = await checkRateLimit(
    options.key,
    options.limit,
    options.windowMs,
  );

  if (result.allowed) {
    return null;
  }

  if (result.unavailable) {
    return NextResponse.json(
      { message: "Proteksi keamanan sementara tidak tersedia" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      message:
        options.message ??
        "Terlalu banyak permintaan. Silakan coba kembali beberapa saat lagi.",
    },
    { status: 429, headers: rateLimitHeaders(result) },
  );
}
