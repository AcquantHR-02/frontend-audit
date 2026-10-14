"use client";

import { parseAsString, useQueryState } from "nuqs";

/** A single string filter kept in the URL (`?status=active`). Empty string = no filter. */
export function useUrlFilter(key: string, onChange?: () => void) {
  const [value, setValue] = useQueryState(key, parseAsString.withDefault("").withOptions({ history: "replace" }));
  return [
    value,
    (next: string) => {
      void setValue(next || null);
      onChange?.();
    },
  ] as const;
}

export const activeOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/** "active" | "inactive" | "" → API boolean param. */
export const toActiveParam = (value: string) => (value === "active" ? true : value === "inactive" ? false : undefined);
