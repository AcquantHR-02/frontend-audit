"use client";

import type { FilterOption } from "@/components/shared/filter-select";
import { useGetActsQuery } from "../api/acts.api";
import { useGetPrincipalEmployersQuery } from "../api/principal-employers.api";
import { useGetStatesQuery } from "../api/states.api";
import { useGetVendorsQuery } from "../api/vendors.api";

/** Reference lists for selects. Small, slow-changing collections → one 200-row page each, cached by RTK Query. */
const ALL = { size: 200 } as const;

export function useStateOptions(): FilterOption[] {
  const { data } = useGetStatesQuery({ ...ALL, sort: "name,asc" });
  return data?.content.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })) ?? [];
}

export function useActOptions({ activeOnly = true } = {}): FilterOption[] {
  const { data } = useGetActsQuery({ ...ALL, sort: "shortName,asc", active: activeOnly ? true : undefined });
  return data?.content.map((a) => ({ value: a.id, label: `${a.shortName} — ${a.name}` })) ?? [];
}

export function useVendorOptions(): FilterOption[] {
  const { data } = useGetVendorsQuery({ ...ALL, sort: "name,asc", active: true });
  return data?.content.map((v) => ({ value: v.id, label: v.name })) ?? [];
}

export function usePrincipalEmployerOptions(): FilterOption[] {
  const { data } = useGetPrincipalEmployersQuery({ ...ALL, sort: "name,asc", active: true });
  return data?.content.map((p) => ({ value: p.id, label: p.name })) ?? [];
}
