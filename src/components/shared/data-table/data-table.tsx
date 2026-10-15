"use client";

import {
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { ClearUrlFiltersButton } from "@/components/shared/active-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Features shared by every app table. Module scope = stable identity (v9 requirement). */
export const dataTableFeatures = tableFeatures({ rowSortingFeature });
export type DataTableFeatures = typeof dataTableFeatures;
// Columns in one array hold different value types, so the value parameter is `any` (TanStack idiom).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any>;

declare module "@tanstack/react-table" {
  // Declaration merging must repeat the original generic parameters.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures, TData, TValue> {
    /** Applied to both header and body cells, e.g. "w-24 text-right". */
    className?: string;
  }
}

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumn<TData>[];
  data: TData[] | undefined;
  getRowId: (row: TData) => string;
  /** First load — shows skeleton rows. */
  isLoading?: boolean;
  /** Background refetch — dims the rows but keeps them visible. */
  isFetching?: boolean;
  /** Server-side sort as "field,asc|desc" (empty = default). */
  sort?: string;
  onSortChange?: (sort: string) => void;
  onRowClick?: (row: TData) => void;
  empty: ReactNode;
  skeletonRows?: number;
  /** Height cap for the scroll area; the table body scrolls, not the page. */
  maxHeightClassName?: string;
}

const toSortingState = (sort?: string): SortingState => {
  if (!sort) return [];
  const [id, dir] = sort.split(",");
  return [{ id, desc: dir === "desc" }];
};

const fromSortingState = (state: SortingState) => (state[0] ? `${state[0].id},${state[0].desc ? "desc" : "asc"}` : "");

/**
 * Server-driven table: the API pages, sorts and searches; TanStack Table handles
 * columns, header sort state and rendering. Pair with <DataTablePagination />.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  isLoading,
  isFetching,
  sort,
  onSortChange,
  onRowClick,
  empty,
  skeletonRows = 8,
  maxHeightClassName = TABLE_MAX_HEIGHT,
}: DataTableProps<TData>) {
  const sorting = toSortingState(sort);

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: data ?? EMPTY,
    getRowId: (row) => getRowId(row as TData),
    manualSorting: true,
    enableSorting: !!onSortChange,
    state: { sorting },
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortChange?.(fromSortingState(next));
    },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card">
      <Table containerClassName={cn("overflow-auto overscroll-contain", maxHeightClassName)}>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="bg-muted/50 hover:bg-muted/50">
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "h-10 text-xs font-semibold tracking-wide text-muted-foreground",
                    header.column.columnDef.meta?.className,
                  )}
                  aria-sort={
                    header.column.getIsSorted() === "asc"
                      ? "ascending"
                      : header.column.getIsSorted() === "desc"
                        ? "descending"
                        : undefined
                  }
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")}>
          {isLoading ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {columns.map((column, j) => (
                  <TableCell key={j} className={cn("py-3", column.meta?.className)}>
                    <Skeleton className={cn("h-4", j === 0 ? "w-40" : "w-20")} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                {empty}
                {/* Shown only when filters/search are active in the URL. */}
                <div className="flex justify-center empty:hidden [&:has(button)]:-mt-6 [&:has(button)]:pb-8">
                  <ClearUrlFiltersButton />
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original as TData) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className={cn("py-2.5", cell.column.columnDef.meta?.className)}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

const EMPTY: never[] = [];

/** Fits header + toolbar + pagination on screen; never shorter than ~6 rows on small phones. */
export const TABLE_MAX_HEIGHT = "max-h-[max(20rem,calc(100dvh-22rem))]";
