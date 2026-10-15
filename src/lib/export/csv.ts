/**
 * CSV export for list screens. RFC 4180 quoting, a UTF-8 BOM so Excel reads non-ASCII names
 * correctly, and spreadsheet-formula neutralising (cells starting with = + - @ are prefixed
 * with ') so a crafted vendor name can't run as a formula when the file is opened.
 */
import type { Page } from "@/types/api";

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

/** Hard cap so one click can't pull an unbounded table. */
export const MAX_EXPORT_ROWS = 10_000;

function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(","));
  return lines.join("\r\n");
}

/** Reads every page of a paginated endpoint (up to MAX_EXPORT_ROWS). */
export async function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Promise<Page<T>>,
  size = 200,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  for (let page = 0; ; page++) {
    const result = await fetchPage(page, size);
    rows.push(...result.content);
    if (rows.length >= MAX_EXPORT_ROWS) return { rows: rows.slice(0, MAX_EXPORT_ROWS), truncated: true };
    if (page + 1 >= result.totalPages || result.content.length === 0) return { rows, truncated: false };
  }
}

/** "audit-runs" → "audit-runs-2026-10-15.csv" */
export function csvFileName(base: string, date = new Date()) {
  return `${base}-${date.toISOString().slice(0, 10)}.csv`;
}

export function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
