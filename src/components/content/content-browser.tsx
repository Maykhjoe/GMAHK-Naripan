"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { EventItem, Post, Sermon } from "@/types/content";
import { filterContent, paginateContent } from "@/lib/content-filter";
import { EventCard, ArticleCard, SermonCard } from "@/components/cards/content-cards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = { kind: "events"; items: EventItem[] } | { kind: "posts"; items: Post[] } | { kind: "sermons"; items: Sermon[] };
function unique(values: (string | undefined)[]) { return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "id-ID")); }
export function ContentBrowser(props: Props) {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  const query = params.get("q") ?? ""; const category = params.get("category") ?? ""; const month = params.get("month") ?? ""; const year = params.get("year") ?? ""; const speaker = params.get("speaker") ?? ""; const requestedPage = Number(params.get("page") ?? 1);
  const allItems = props.items as (EventItem | Post | Sermon)[];
  const filtered = filterContent(allItems, { query, category, month, year, speaker });
  const paginated = paginateContent(filtered, requestedPage, 6);
  const categories = unique(allItems.map((item) => item.category));
  const years = unique(allItems.map((item) => item.date.match(/\b\d{4}\b/)?.[0])).reverse();
  const months = unique(allItems.map((item) => item.date.split(" ")[1]));
  const speakers = props.kind === "sermons" ? unique(props.items.map((item) => item.speaker)) : [];
  function update(name: string, value: string) { const next = new URLSearchParams(params.toString()); if (value) next.set(name, value); else next.delete(name); if (name !== "page") next.delete("page"); router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }); }
  function clear() { router.replace(pathname, { scroll: false }); }
  return <>
    <div className={`grid gap-3 rounded-2xl border border-primary/10 bg-white p-4 ${props.kind === "sermons" ? "md:grid-cols-[1fr_190px_190px_150px]" : props.kind === "events" ? "md:grid-cols-[1fr_220px_200px]" : "md:grid-cols-[1fr_220px_180px]"}`}>
      <label className="relative"><Search className="absolute left-4 top-3.5 size-5 text-muted" /><Input value={query} onChange={(event) => update("q", event.target.value)} className="pl-12" placeholder={props.kind === "events" ? "Cari kegiatan…" : props.kind === "posts" ? "Cari artikel…" : "Cari khotbah…"} aria-label="Pencarian konten" /></label>
      {props.kind === "sermons" && <FilterSelect label="Semua pembicara" value={speaker} options={speakers} onChange={(value) => update("speaker", value)} />}
      <FilterSelect label="Semua kategori" value={category} options={categories} onChange={(value) => update("category", value)} />
      {props.kind === "events" ? <FilterSelect label="Semua bulan" value={month} options={months} onChange={(value) => update("month", value)} /> : <FilterSelect label="Semua tahun" value={year} options={years} onChange={(value) => update("year", value)} />}
    </div>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted" aria-live="polite"><strong className="text-primary">{paginated.total}</strong> hasil ditemukan</p>{(query || category || month || year || speaker) && <Button variant="secondary" onClick={clear}><X className="size-4" />Hapus Filter</Button>}</div>
    {paginated.items.length ? <div className={`mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${props.kind === "posts" ? "lg:gap-10" : ""}`}>{props.kind === "events" ? paginated.items.map((item) => <EventCard key={item.id} item={item as EventItem} />) : props.kind === "posts" ? paginated.items.map((item) => <ArticleCard key={item.id} item={item as Post} />) : paginated.items.map((item) => <SermonCard key={item.id} item={item as Sermon} />)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center text-sm text-muted">Tidak ada konten yang cocok. Coba kata kunci atau filter lain.</div>}
    {paginated.pageCount > 1 && <nav aria-label="Paginasi hasil" className="mt-12 flex justify-center gap-2">{Array.from({ length: paginated.pageCount }, (_, index) => index + 1).map((page) => <button key={page} onClick={() => update("page", String(page))} aria-current={page === paginated.page ? "page" : undefined} className={`grid size-11 place-items-center rounded-full text-sm font-semibold ${page === paginated.page ? "bg-primary text-white" : "bg-white text-primary"}`}>{page}</button>)}</nav>}
  </>;
}
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-xl border border-primary/15 bg-white px-4 text-sm"><option value="">{label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>; }
