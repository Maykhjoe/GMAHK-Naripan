export type SelectOption = {
  value: string;
  label: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type PublicPageFilters = {
  page?: number;
  pageSize?: number;
  query?: string;
  category?: string;
  year?: string;
  speaker?: string;
  scope?: "all" | "upcoming" | "past";
  dateFrom?: string;
  dateTo?: string;
};

export function safePage(value: unknown, fallback = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(1, Math.floor(number));
}

export function safePageSize(
  value: unknown,
  fallback = 9,
  allowed: readonly number[] = [6, 9, 12, 20, 50],
) {
  const number = Number(value);
  return allowed.includes(number) ? number : fallback;
}

export function normalizeSearch(value: unknown, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizeChoice(value: unknown, maxLength = 100) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizeDateInput(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  return value;
}

export function createPagination<T>(
  items: T[],
  total: number,
  requestedPage: number,
  pageSize: number,
): PaginatedResult<T> {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page: Math.min(Math.max(1, requestedPage), pageCount),
    pageSize,
    pageCount,
  };
}

export function fallbackPagination<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
): PaginatedResult<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const from = (page - 1) * pageSize;

  return {
    items: items.slice(from, from + pageSize),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export function recentYearOptions(count = 7): SelectOption[] {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: count }, (_, index) => {
    const year = String(currentYear - index);
    return { value: year, label: year };
  });
}

export function jakartaDayStart(value: string) {
  return `${value}T00:00:00+07:00`;
}

export function jakartaDayEnd(value: string) {
  return `${value}T23:59:59.999+07:00`;
}
