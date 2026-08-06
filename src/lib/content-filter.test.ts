import { describe, expect, it } from "vitest";
import { filterContent, paginateContent } from "./content-filter";

const items = [
  { title: "Seminar Kesehatan Keluarga", category: "Kesehatan", date: "15 Agustus 2026", speaker: "Tim Kesehatan" },
  { title: "Kasih dalam Tindakan", category: "Renungan", date: "25 Juli 2025", speaker: "Tim Pelayanan" },
  { title: "Generasi Muda", category: "Pemuda", date: "27 Juli 2026", speaker: "Pemuda Advent" },
];

describe("content search and filters", () => {
  it("searches case-insensitively across configured text", () => {
    expect(filterContent(items, { query: "kesehatan" }).map((item) => item.title)).toEqual(["Seminar Kesehatan Keluarga"]);
  });
  it("combines category, year, month, and speaker filters", () => {
    expect(filterContent(items, { category: "Pemuda", year: "2026", month: "Juli", speaker: "Pemuda Advent" })).toHaveLength(1);
    expect(filterContent(items, { category: "Pemuda", year: "2025" })).toHaveLength(0);
  });
  it("clamps pagination and reports page counts", () => {
    expect(paginateContent(items, 9, 2)).toMatchObject({ page: 2, pageCount: 2, items: [items[2]] });
  });
});
