"use client";

import { FileDownIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { csvFileName, downloadCsv, fetchAllPages, MAX_EXPORT_ROWS, toCsv, type CsvColumn } from "@/lib/export/csv";
import { formatCount } from "@/lib/utils";
import type { ApiError, Page } from "@/types/api";

/**
 * Exports every row matching the current filters and search (not just the visible page) as CSV.
 * `fetchPage` calls the list endpoint with the page's own filters.
 */
export function ExportCsvButton<T>({
  fileName,
  columns,
  fetchPage,
  disabled,
}: {
  fileName: string;
  columns: CsvColumn<T>[];
  fetchPage: (page: number, size: number) => Promise<Page<T>>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const { rows, truncated } = await fetchAllPages(fetchPage);
      downloadCsv(csvFileName(fileName), toCsv(rows, columns));
      if (truncated) {
        toast.warning(`Exported the first ${formatCount(MAX_EXPORT_ROWS)} rows`, {
          description: "Narrow the filters to export the rest.",
        });
      } else {
        toast.success(`Exported ${formatCount(rows.length)} row${rows.length === 1 ? "" : "s"}`);
      }
    } catch (e) {
      toast.error((e as ApiError).message ?? "Export failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" onClick={() => void run()} disabled={disabled || busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <FileDownIcon />}
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sr-only sm:hidden">Export CSV</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>All rows matching the current filters</TooltipContent>
    </Tooltip>
  );
}
