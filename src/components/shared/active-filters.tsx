"use client";

import { FilterIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Active-filter chips. Each filter control registers itself (label + readable value + how to
 * clear it) with the nearest <FilterBar>, which renders removable chips and a "Clear all".
 * Lives outside the select triggers on purpose: hover-to-open selects would swallow a click on
 * an inline ×.
 */

interface ActiveFilter {
  label: string;
  value: string;
}

interface Registry {
  set: (id: string, filter: ActiveFilter | null, onClear?: () => void) => void;
}

const FilterRegistryContext = createContext<Registry | null>(null);

/** Register a filter while it has a value; no-op outside a <FilterBar>. */
export function useActiveFilter(id: string, filter: ActiveFilter | null, onClear: () => void) {
  const registry = useContext(FilterRegistryContext);
  // Latest clear callback without re-registering on every render.
  const clearRef = useRef(onClear);
  useEffect(() => {
    clearRef.current = onClear;
  });

  const label = filter?.label;
  const value = filter?.value;
  useEffect(() => {
    if (!registry) return;
    registry.set(id, label !== undefined && value ? { label, value } : null, () => clearRef.current());
    return () => registry.set(id, null);
  }, [registry, id, label, value]);
}

/** Declarative registration for controls that aren't FilterSelects (dates, search). Renders nothing. */
export function FilterChip({
  id,
  label,
  value,
  onClear,
}: {
  id: string;
  label: string;
  /** Readable value; empty = inactive. */
  value: string;
  onClear: () => void;
}) {
  useActiveFilter(id, value ? { label, value } : null, onClear);
  return null;
}

interface FilterBarProps {
  /** Filter controls, laid out in one wrapping row. */
  children: ReactNode;
  /** Extra content at the end of the row, e.g. right-aligned actions. */
  trailing?: ReactNode;
  className?: string;
  /** Overrides the control row's alignment, e.g. "items-end" for labelled inputs. */
  rowClassName?: string;
}

export function FilterBar({ children, trailing, className, rowClassName }: FilterBarProps) {
  const [filters, setFilters] = useState<[string, ActiveFilter][]>([]);
  const clears = useRef(new Map<string, () => void>());

  const set = useCallback<Registry["set"]>((id, filter, onClear) => {
    if (filter && onClear) clears.current.set(id, onClear);
    else clears.current.delete(id);
    setFilters((prev) => {
      const rest = prev.filter(([key]) => key !== id);
      if (!filter) return rest.length === prev.length ? prev : rest;
      // Keep a filter's chip in place when its value changes.
      const index = prev.findIndex(([key]) => key === id);
      const next = [...rest];
      next.splice(index === -1 ? next.length : index, 0, [id, filter]);
      return next;
    });
  }, []);
  const registry = useMemo(() => ({ set }), [set]);

  const clearAll = () => [...clears.current.values()].forEach((clear) => clear());

  return (
    <FilterRegistryContext.Provider value={registry}>
      <div className={cn("flex flex-col gap-2", className)}>
        <div className={cn("flex flex-wrap items-center gap-2", rowClassName)}>
          {children}
          {trailing}
        </div>
        {filters.length > 0 && (
          <div
            className="flex animate-in flex-wrap items-center gap-1.5 fade-in-0 slide-in-from-top-1"
            aria-label="Active filters"
          >
            <span className="mr-0.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <FilterIcon className="size-3.5" aria-hidden />
              {filters.length} active
            </span>
            {filters.map(([id, f]) => (
              <span
                key={id}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/25 bg-accent pr-1 pl-2.5 text-xs text-accent-foreground"
              >
                <span className="text-muted-foreground">{f.label}:</span>
                <span className="max-w-48 truncate font-medium">{f.value}</span>
                <button
                  type="button"
                  onClick={() => clears.current.get(id)?.()}
                  aria-label={`Remove ${f.label} filter`}
                  className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-primary/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcwIcon className="size-3.5" aria-hidden />
              Clear all
            </Button>
          </div>
        )}
      </div>
    </FilterRegistryContext.Provider>
  );
}
