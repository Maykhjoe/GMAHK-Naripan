import { describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

describe("Turnstile server verification", () => {
  it("fails closed in production when the secret is missing", async () => {
    const result = await verifyTurnstile({ token: "token", environment: "production", secret: "" });
    expect(result).toEqual({ success: false, reason: "misconfigured" });
  });

  it("permits an explicit development bypass when no secret is configured", async () => {
    const result = await verifyTurnstile({ token: "", environment: "development", secret: "" });
    expect(result).toEqual({ success: true, bypassed: true });
  });

  it("rejects a missing token before contacting Cloudflare", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await verifyTurnstile({ token: "", environment: "production", secret: "secret", fetcher });
    expect(result.success).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts only a successful response for the expected action and hostname", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ success: true, action: "contact", hostname: "gereja.example" }), { status: 200 }));
    const valid = await verifyTurnstile({ token: "valid", secret: "secret", environment: "production", expectedAction: "contact", expectedHostname: "gereja.example", fetcher });
    expect(valid.success).toBe(true);

    const wrongAction = await verifyTurnstile({ token: "valid", secret: "secret", environment: "production", expectedAction: "prayer", expectedHostname: "gereja.example", fetcher });
    expect(wrongAction.success).toBe(false);
  });

  it("allows Cloudflare official test-key metadata only when explicitly enabled", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ success: true, metadata: { result_with_testing_key: true } }), { status: 200 }));
    const result = await verifyTurnstile({
      token: "XXXX.DUMMY.TOKEN.XXXX",
      secret: "1x0000000000000000000000000000000AA",
      environment: "production",
      expectedAction: "contact",
      expectedHostname: "127.0.0.1",
      allowTestingKeys: true,
      fetcher,
    });
    expect(result).toEqual({ success: true, bypassed: true });
  });

  it("does not let arbitrary secrets bypass action validation with test metadata", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ success: true, metadata: { result_with_testing_key: true } }), { status: 200 }));
    const result = await verifyTurnstile({
      token: "token",
      secret: "not-the-official-test-secret",
      environment: "production",
      expectedAction: "contact",
      allowTestingKeys: true,
      fetcher,
    });
    expect(result).toEqual({ success: false, reason: "action-mismatch" });
  });
});
