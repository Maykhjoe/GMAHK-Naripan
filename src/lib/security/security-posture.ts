export type SecurityCheckStatus = "pass" | "warning" | "fail" | "info";

export type SecurityCheck = {
  key: string;
  category: string;
  title: string;
  status: SecurityCheckStatus;
  issueCount: number;
  summary: string;
  remediation: string | null;
};

export type SecuritySummary = {
  total: number;
  pass: number;
  warning: number;
  fail: number;
  info: number;
  score: number;
};

type RawSecurityCheck = {
  check_key?: unknown;
  category?: unknown;
  title?: unknown;
  status?: unknown;
  issue_count?: unknown;
  summary?: unknown;
  remediation?: unknown;
};

const statuses = new Set<SecurityCheckStatus>([
  "pass",
  "warning",
  "fail",
  "info",
]);

function safeText(value: unknown, fallback: string, maxLength = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function safeCount(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

export function normalizeSecurityChecks(value: unknown): SecurityCheck[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const row = item as RawSecurityCheck;
    const rawStatus = typeof row.status === "string" ? row.status : "info";
    const status: SecurityCheckStatus = statuses.has(
      rawStatus as SecurityCheckStatus,
    )
      ? (rawStatus as SecurityCheckStatus)
      : "info";

    return [
      {
        key: safeText(row.check_key, `check-${index + 1}`, 120),
        category: safeText(row.category, "Lainnya", 80),
        title: safeText(row.title, "Pemeriksaan keamanan", 160),
        status,
        issueCount: safeCount(row.issue_count),
        summary: safeText(row.summary, "Tidak ada keterangan.", 1000),
        remediation:
          typeof row.remediation === "string" && row.remediation.trim()
            ? row.remediation.trim().slice(0, 1200)
            : null,
      },
    ];
  });
}

export function summarizeSecurityChecks(
  checks: readonly SecurityCheck[],
): SecuritySummary {
  const summary: SecuritySummary = {
    total: checks.length,
    pass: 0,
    warning: 0,
    fail: 0,
    info: 0,
    score: 100,
  };

  for (const check of checks) {
    summary[check.status] += 1;
  }

  const scored = summary.pass + summary.warning + summary.fail;
  if (scored > 0) {
    const weighted = summary.pass + summary.warning * 0.5;
    summary.score = Math.round((weighted / scored) * 100);
  }

  return summary;
}
