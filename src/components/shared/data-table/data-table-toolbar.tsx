"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { FilterBar, FilterChip } from "@/components/shared/active-filters";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface DataTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter controls (selects, toggles). */
  filters?: ReactNode;
  /** Right-aligned actions, e.g. "Add vendor". */
  actions?: ReactNode;
}

/**
 * Debounced search + filters + actions, with removable active-filter chips and "Clear all"
 * underneath. Search commits to the URL 300 ms after typing stops.
 */
export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  actions,
}: DataTableToolbarProps) {
  const [draft, setDraft] = useState(search);
  const debounced = useDebouncedValue(draft, 300);

  // URL → input (back/forward navigation, "clear filters").
  const [lastUrlValue, setLastUrlValue] = useState(search);
  if (search !== lastUrlValue) {
    setLastUrlValue(search);
    setDraft(search);
  }

  // input → URL
  useEffect(() => {
    if (debounced !== search) onSearchChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced draft
  }, [debounced]);

  return (
    <FilterBar trailing={actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}>
      <FilterChip
        id="search"
        label="Search"
        value={search && `“${search}”`}
        onClear={() => {
          setDraft("");
          onSearchChange("");
        }}
      />
      <div className="relative w-full sm:w-72">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search"
          className="pr-8 pl-8"
        />
        {draft && (
          <button
            type="button"
            onClick={() => setDraft("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      {filters}
    </FilterBar>
  );
}
