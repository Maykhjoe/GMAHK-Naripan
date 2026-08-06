import { describe, expect, it } from "vitest";
import { resolveSubmissionMode } from "./submission-mode";

describe("public submission persistence mode", () => {
  it("fails closed in production without a server database client", () => {
    expect(resolveSubmissionMode(false, "production")).toBe("unavailable");
  });
  it("allows a clearly labelled demo only in development", () => {
    expect(resolveSubmissionMode(false, "development")).toBe("demo");
  });
  it("uses Supabase whenever the server client is configured", () => {
    expect(resolveSubmissionMode(true, "production")).toBe("supabase");
  });
});
