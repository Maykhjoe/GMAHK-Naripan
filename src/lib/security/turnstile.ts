type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
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

const CLOUDFLARE_ALWAYS_PASS_TEST_SECRET =
  "1x0000000000000000000000000000000AA";

export type TurnstileVerification =
  | { success: true; bypassed?: boolean }
  | {
      success: false;
      reason:
        | "misconfigured"
        | "missing-token"
        | "verification-failed"
        | "action-mismatch"
        | "hostname-mismatch"
        | "unavailable";
    };

export async function verifyTurnstile(
  options: VerificationOptions,
): Promise<TurnstileVerification> {
  const secret = options.secret ?? process.env.TURNSTILE_SECRET_KEY ?? "";
  const environment = options.environment ?? process.env.NODE_ENV ?? "development";
  const expectedHostname = options.expectedHostname?.trim().toLowerCase();

  if (!secret) {
    return environment === "production"
      ? { success: false, reason: "misconfigured" }
      : { success: true, bypassed: true };
  }

  // Production must bind a successful token to our configured hostname. This
  // prevents a token obtained for another site from being accepted here.
  if (environment === "production" && !expectedHostname) {
    return { success: false, reason: "misconfigured" };
  }

  const token = options.token.trim();
  if (!token || token.length > 4096) {
    return { success: false, reason: "missing-token" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (options.remoteIp) body.set("remoteip", options.remoteIp.slice(0, 128));

  try {
    const response = await (options.fetcher ?? fetch)(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return { success: false, reason: "unavailable" };
    }

    const result = (await response.json()) as TurnstileResponse;
    if (!result.success) {
      return { success: false, reason: "verification-failed" };
    }

    const officialTestingResponse =
      environment !== "production" &&
      options.allowTestingKeys === true &&
      secret === CLOUDFLARE_ALWAYS_PASS_TEST_SECRET &&
      result.metadata?.result_with_testing_key === true;

    if (officialTestingResponse) {
      return { success: true, bypassed: true };
    }

    if (options.expectedAction && result.action !== options.expectedAction) {
      return { success: false, reason: "action-mismatch" };
    }

    if (
      expectedHostname &&
      result.hostname?.trim().toLowerCase() !== expectedHostname
    ) {
      return { success: false, reason: "hostname-mismatch" };
    }

    return { success: true };
  } catch {
    return { success: false, reason: "unavailable" };
  }
}
