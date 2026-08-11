import { describe, expect, it } from "vitest";

import { checkProductionReadiness } from "@/lib/production/readiness";

const productionEnv = {
  NEXT_PUBLIC_SITE_URL: "https://naripan.example",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value",
  SUPABASE_SERVICE_ROLE_KEY: "server-only-service-role",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  TURNSTILE_EXPECTED_HOSTNAME: "naripan.example",
};

describe("production readiness", () => {
  it("passes a complete HTTPS production configuration", () => {
    const result = checkProductionReadiness(productionEnv, true);
    expect(result.ready).toBe(true);
    expect(result.checks.every((check) => check.level === "pass")).toBe(true);
  });

  it("fails when a server secret is exposed using NEXT_PUBLIC_", () => {
    const result = checkProductionReadiness(
      {
        ...productionEnv,
        NEXT_PUBLIC_TURNSTILE_SECRET_KEY: "should-never-be-public",
      },
      true,
    );

    expect(result.ready).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ id: "public-secret-names", level: "fail" }),
    );
  });

  it("fails when the Turnstile hostname does not match the site URL", () => {
    const result = checkProductionReadiness(
      { ...productionEnv, TURNSTILE_EXPECTED_HOSTNAME: "wrong.example" },
      true,
    );

    expect(result.ready).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ id: "turnstile-hostname", level: "fail" }),
    );
  });
});
