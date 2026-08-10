import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  getSecurityHeaders,
} from "@/lib/security/headers";

describe("security headers", () => {
  it("blocks framing and plugin content while allowing required embeds", () => {
    const policy = buildContentSecurityPolicy(false);

    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("https://www.youtube-nocookie.com");
    expect(policy).toContain("https://challenges.cloudflare.com");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("only enables eval for the local Next.js development runtime", () => {
    expect(buildContentSecurityPolicy(true)).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(false)).not.toContain("'unsafe-eval'");
  });

  it("only sends HSTS outside development", () => {
    const development = getSecurityHeaders(true);
    const production = getSecurityHeaders(false);

    expect(development.some((header) => header.key === "Strict-Transport-Security")).toBe(false);
    expect(production.some((header) => header.key === "Strict-Transport-Security")).toBe(true);
  });
});
