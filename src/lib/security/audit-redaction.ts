export type AuditDetailValue = string | number | boolean | null;

const blockedAuditKey =
  /(password|passcode|secret|token|authorization|cookie|service.?role|turnstile|request.?text|internal.?notes|private.?key)/i;

export function sanitizeAuditDetails(
  details?: Record<string, AuditDetailValue>,
): Record<string, AuditDetailValue> {
  if (!details) {
    return {};
  }

  const sanitized: Record<string, AuditDetailValue> = {};

  for (const [key, value] of Object.entries(details)) {
    if (blockedAuditKey.test(key)) {
      continue;
    }

    if (typeof value === "string") {
      sanitized[key.slice(0, 80)] = value.slice(0, 500);
      continue;
    }

    sanitized[key.slice(0, 80)] = value;
  }

  return sanitized;
}
