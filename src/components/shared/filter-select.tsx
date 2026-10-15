"use client";

import { useActiveFilter } from "@/components/shared/active-filters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

/** "All" maps to the empty string so cleared filters drop out of the URL. */
const ALL = "__all__";

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel?: string;
  className?: string;
}) {
  const selected = options.find((o) => o.value === value);
  // Shows as a removable chip in the surrounding <FilterBar>.
  useActiveFilter(label, value ? { label, value: selected?.label ?? value } : null, () => onChange(""));

  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger
        className={cn("w-auto min-w-36", value && "border-primary/40 bg-accent", className)}
        aria-label={label}
      >
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel ?? "All"}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
