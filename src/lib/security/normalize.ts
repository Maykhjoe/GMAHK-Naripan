export function normalizeEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export function normalizePhone(value?: string | null) {
  const raw = value?.trim() ?? "";
  if (!raw) return null;

  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return `${hasPlus ? "+" : ""}${digits}`;
}

export function normalizePlainText(value?: string | null) {
  if (value == null) return null;
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}
