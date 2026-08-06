type FilterableContent = { title: string; category?: string; date?: string; speaker?: string; description?: string; excerpt?: string };
export type ContentFilters = { query?: string; category?: string; year?: string; month?: string; speaker?: string };
function normalize(value: string | undefined) { return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("id-ID").trim(); }
export function filterContent<T extends FilterableContent>(items: readonly T[], filters: ContentFilters): T[] {
  const query = normalize(filters.query);
  return items.filter((item) => {
    const haystack = normalize([item.title, item.category, item.speaker, item.description, item.excerpt].filter(Boolean).join(" "));
    if (query && !haystack.includes(query)) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.speaker && item.speaker !== filters.speaker) return false;
    if (filters.year && !item.date?.includes(filters.year)) return false;
    if (filters.month && !normalize(item.date).includes(normalize(filters.month))) return false;
    return true;
  });
}
export function paginateContent<T>(items: readonly T[], requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1), pageCount);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageCount, total: items.length };
}
