type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
  metadata?: { result_with_testing_key?: boolean };
};
type VerificationOptions = {
  token: string;
  remoteIp?: string;
  expectedAction?: string;
  expectedHostname?: string;
  secret?: string;
  environment?: string;
  allowTestingKeys?: boolean;
  fetcher?: typeof fetch;
};

const CLOUDFLARE_ALWAYS_PASS_TEST_SECRET = "1x0000000000000000000000000000000AA";
export type TurnstileVerification = { success: true; bypassed?: boolean } | { success: false; reason: "misconfigured" | "missing-token" | "verification-failed" | "action-mismatch" | "hostname-mismatch" | "unavailable" };

export async function verifyTurnstile(options: VerificationOptions): Promise<TurnstileVerification> {
  const secret = options.secret ?? process.env.TURNSTILE_SECRET_KEY ?? "";
  const environment = options.environment ?? process.env.NODE_ENV ?? "development";
  if (!secret) return environment === "production" ? { success: false, reason: "misconfigured" } : { success: true, bypassed: true };
  if (!options.token.trim()) return { success: false, reason: "missing-token" };
  const body = new URLSearchParams({ secret, response: options.token });
  if (options.remoteIp) body.set("remoteip", options.remoteIp);
  try {
    const response = await (options.fetcher ?? fetch)("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return { success: false, reason: "unavailable" };
    const result = await response.json() as TurnstileResponse;
    if (!result.success) return { success: false, reason: "verification-failed" };
    const officialTestingResponse = options.allowTestingKeys === true
      && secret === CLOUDFLARE_ALWAYS_PASS_TEST_SECRET
      && result.metadata?.result_with_testing_key === true;
    if (officialTestingResponse) return { success: true, bypassed: true };
    if (options.expectedAction && result.action !== options.expectedAction) return { success: false, reason: "action-mismatch" };
    if (options.expectedHostname && result.hostname !== options.expectedHostname) return { success: false, reason: "hostname-mismatch" };
    return { success: true };
  } catch {
    return { success: false, reason: "unavailable" };
  }
}
