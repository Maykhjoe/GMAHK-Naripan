import { describe, expect, it } from "vitest";

import {
  normalizeSecurityChecks,
  summarizeSecurityChecks,
} from "./security-posture";

describe("security posture", () => {
  it("menormalisasi hasil RPC tanpa mempercayai bentuk data mentah", () => {
    const rows = normalizeSecurityChecks([
      {
        check_key: "rls",
        category: "Database",
        title: "RLS aktif",
        status: "pass",
        issue_count: "0",
        summary: "Semua aman",
        remediation: null,
      },
      {
        check_key: "unknown",
        status: "unexpected",
        issue_count: -10,
      },
      null,
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.status).toBe("pass");
    expect(rows[0]?.issueCount).toBe(0);
    expect(rows[1]?.status).toBe("info");
    expect(rows[1]?.issueCount).toBe(0);
  });

  it("menghitung skor dengan peringatan bernilai setengah", () => {
    const summary = summarizeSecurityChecks([
      {
        key: "a",
        category: "A",
        title: "A",
        status: "pass",
        issueCount: 0,
        summary: "ok",
        remediation: null,
      },
      {
        key: "b",
        category: "A",
        title: "B",
        status: "warning",
        issueCount: 1,
        summary: "warning",
        remediation: null,
      },
      {
        key: "c",
        category: "A",
        title: "C",
        status: "fail",
        issueCount: 1,
        summary: "fail",
        remediation: null,
      },
      {
        key: "d",
        category: "A",
        title: "D",
        status: "info",
        issueCount: 0,
        summary: "info",
        remediation: null,
      },
    ]);

    expect(summary).toEqual({
      total: 4,
      pass: 1,
      warning: 1,
      fail: 1,
      info: 1,
      score: 50,
    });
  });
});
