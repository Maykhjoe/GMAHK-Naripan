import { NextResponse } from "next/server";

import { checkProductionReadiness } from "@/lib/production/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const production = process.env.NODE_ENV === "production";
  const readiness = checkProductionReadiness(process.env, production);
  const healthy = production ? readiness.ready : true;
  const status = readiness.ready ? "ok" : production ? "degraded" : "development";

  return NextResponse.json(
    {
      status,
      service: "gmahk-naripan-web",
      environment: production ? "production" : "development",
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
