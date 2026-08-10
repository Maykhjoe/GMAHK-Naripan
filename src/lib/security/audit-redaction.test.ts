import { describe, expect, it } from "vitest";

import { sanitizeAuditDetails } from "@/lib/security/audit-redaction";

describe("sanitizeAuditDetails", () => {
  it("removes credential and prayer-content shaped keys", () => {
    const result = sanitizeAuditDetails({
      reason: "Pemeriksaan akses",
      token: "secret-token",
      password: "secret-password",
      request_text: "isi doa",
      internal_notes: "catatan pastoral",
      status: "blocked",
    });

    expect(result).toEqual({
      reason: "Pemeriksaan akses",
      status: "blocked",
    });
  });

  it("bounds free-form strings before writing the audit table", () => {
    const result = sanitizeAuditDetails({ reason: "a".repeat(900) });
    expect(String(result.reason)).toHaveLength(500);
  });
});
