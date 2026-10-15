import { describe, expect, it } from "vitest";
import { csvFileName, fetchAllPages, MAX_EXPORT_ROWS, toCsv, type CsvColumn } from "./csv";

interface Row {
  name: string;
  score: number | null;
}
const columns: CsvColumn<Row>[] = [
  { header: "Name", value: (r) => r.name },
  { header: "Score", value: (r) => r.score },
];

describe("toCsv", () => {
  it("quotes commas, quotes and line breaks (RFC 4180)", () => {
    expect(
      toCsv(
        [
          { name: 'Rathna "RFS", Bengaluru', score: 98.5 },
          { name: "Line\nbreak", score: null },
        ],
        columns,
      ),
    ).toBe('Name,Score\r\n"Rathna ""RFS"", Bengaluru",98.5\r\n"Line\nbreak",');
  });

  it("neutralises spreadsheet formulas in text cells", () => {
    expect(toCsv([{ name: "=HYPERLINK(1)", score: -5 }], columns)).toBe("Name,Score\r\n'=HYPERLINK(1),-5");
  });
});

describe("fetchAllPages", () => {
  it("walks every page", async () => {
    const pages = [[1, 2], [3, 4], [5]];
    const result = await fetchAllPages(async (page) => ({
      content: pages[page],
      page,
      size: 2,
      totalElements: 5,
      totalPages: 3,
    }));
    expect(result).toEqual({ rows: [1, 2, 3, 4, 5], truncated: false });
  });

  it("stops at the export cap", async () => {
    const result = await fetchAllPages(async (page, size) => ({
      content: Array.from({ length: size }, (_, i) => page * size + i),
      page,
      size,
      totalElements: 1_000_000,
      totalPages: 5000,
    }));
    expect(result.rows).toHaveLength(MAX_EXPORT_ROWS);
    expect(result.truncated).toBe(true);
  });
});

it("dates the file name", () => {
  expect(csvFileName("audit-runs", new Date("2026-10-15T10:00:00Z"))).toBe("audit-runs-2026-10-15.csv");
});
