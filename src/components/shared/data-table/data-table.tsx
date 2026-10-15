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
import { useMemo, type ReactNode } from "react";
import { ClearUrlFiltersButton } from "@/components/shared/active-filters";
import { Checkbox } from "@/components/ui/checkbox";
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
  /** Adds a checkbox column. Selection is controlled and keyed by row id. */
  selection?: RowSelection<TData>;
}

export interface RowSelection<TData> {
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  /** Rows that can't be selected render a disabled checkbox. */
  isSelectable?: (row: TData) => boolean;
  /** Accessible label for a row's checkbox, e.g. the item name. */
  rowLabel?: (row: TData) => string;
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
  selection,
}: DataTableProps<TData>) {
  const sorting = toSortingState(sort);
  const allColumns = useMemo(
    () => (selection ? [selectionColumn(selection, data ?? EMPTY, getRowId), ...columns] : columns),
    [selection, data, getRowId, columns],
  );

  const table = useTable({
    features: dataTableFeatures,
    columns: allColumns,
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
                {allColumns.map((column, j) => (
                  <TableCell key={j} className={cn("py-3", column.meta?.className)}>
                    <Skeleton className={cn("h-4", j === 0 ? "w-40" : "w-20")} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={allColumns.length} className="p-0">
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
                data-state={selection?.selected.has(row.id) ? "selected" : undefined}
                className={cn(onRowClick && "cursor-pointer", "data-[state=selected]:bg-accent/60")}
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

/** Leading checkbox column; the header box toggles every selectable row currently shown. */
function selectionColumn<TData extends RowData>(
  { selected, onChange, isSelectable = () => true, rowLabel }: RowSelection<TData>,
  rows: TData[],
  getRowId: (row: TData) => string,
): DataTableColumn<TData> {
  const ids = rows.filter(isSelectable).map(getRowId);
  const picked = ids.filter((id) => selected.has(id)).length;
  const toggleAll = () => {
    const next = new Set(selected);
    if (picked === ids.length) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    onChange(next);
  };
  return {
    id: "__select",
    enableSorting: false,
    header: () => (
      <Checkbox
        aria-label="Select all rows shown"
        disabled={ids.length === 0}
        checked={picked === 0 ? false : picked === ids.length ? true : "indeterminate"}
        onCheckedChange={toggleAll}
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => {
      const item = row.original as TData;
      const id = getRowId(item);
      return (
        // The cell swallows clicks so ticking a box never opens the row.
        <div onClick={(e) => e.stopPropagation()} className="flex">
          <Checkbox
            aria-label={rowLabel ? `Select ${rowLabel(item)}` : "Select row"}
            disabled={!isSelectable(item)}
            checked={selected.has(id)}
            onCheckedChange={(checked) => {
              const next = new Set(selected);
              if (checked) next.add(id);
              else next.delete(id);
              onChange(next);
            }}
            className="translate-y-0.5"
          />
        </div>
      );
    },
    meta: { className: "w-10 pr-0" },
  };
}

/** Fits header + toolbar + pagination on screen; never shorter than ~6 rows on small phones. */
export const TABLE_MAX_HEIGHT = "max-h-[max(20rem,calc(100dvh-22rem))]";
