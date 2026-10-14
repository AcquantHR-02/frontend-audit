"use client";

import { CopyCheckIcon, HistoryIcon, InfoIcon, Loader2Icon, SaveIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, cadenceMeta } from "@/lib/domain";
import { cn, formatDate } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { ChecklistItemView, EffectivePeriod } from "@/types/domain";

export interface ChecklistVersion extends EffectivePeriod {
  id: string;
  itemIds: string[];
}

interface ChecklistEditorProps {
  /** Active master items applicable to this scope (state + NATIONAL). */
  masterItems: ChecklistItemView[] | undefined;
  /** Newest first. */
  versions: ChecklistVersion[] | undefined;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (effectiveFrom: string, itemIds: string[]) => Promise<unknown>;
}

const firstOfNextMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1)).toISOString().slice(0, 10);
};

/**
 * Pick the subset of the master that applies (§7A Locks 6–9).
 * Mount with a `key` per scope so selection state resets when the scope changes.
 */
export function ChecklistEditor({ masterItems, versions, canEdit, isSaving, onSave }: ChecklistEditorProps) {
  const current = versions?.find((v) => v.effectiveTo === null) ?? versions?.[0] ?? null;
  const isOnboarding = !!versions && versions.length === 0;

  // Onboarding default (Lock 8): full applicable master pre-ticked. Otherwise: the current version.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const baseline = useMemo(
    () => new Set(current ? current.itemIds : (masterItems?.map((i) => i.id) ?? [])),
    [current, masterItems],
  );
  const effective = selected ?? baseline;

  const [search, setSearch] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(firstOfNextMonth);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, ChecklistItemView[]>();
    for (const item of masterItems ?? []) {
      if (q && !`${item.description} ${item.actShortName}`.toLowerCase().includes(q)) continue;
      map.set(item.actShortName, [...(map.get(item.actShortName) ?? []), item]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [masterItems, search]);

  if (!masterItems || !versions) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const masterIds = new Set(masterItems.map((i) => i.id));
  const selectedCount = [...effective].filter((id) => masterIds.has(id)).length;
  const changes =
    [...effective].filter((id) => !baseline.has(id)).length + [...baseline].filter((id) => !effective.has(id)).length;
  const minFrom = current ? addDays(current.effectiveFrom, 1) : undefined;

  const update = (mutate: (next: Set<string>) => void) => {
    const next = new Set(effective);
    mutate(next);
    setSelected(next);
  };

  async function save() {
    try {
      await onSave(
        effectiveFrom,
        [...effective].filter((id) => masterIds.has(id)),
      );
      toast.success("Checklist saved", { description: `New version effective from ${formatDate(effectiveFrom)}.` });
      setSelected(null);
    } catch (error) {
      toast.error((error as ApiError).message);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-wrap items-center gap-2 border-b py-3">
          <div className="relative w-full sm:w-64">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter items…"
              className="pl-8"
              aria-label="Filter items"
            />
          </div>
          <span className="text-[13px] text-muted-foreground tabular">
            <b className="text-foreground">{selectedCount}</b> of {masterItems.length} selected
          </span>
          {canEdit && (
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set(masterIds))}>
                <CopyCheckIcon /> Apply master
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                <XIcon /> Clear
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="max-h-[60svh] overflow-y-auto p-0">
          {groups.length === 0 && <p className="p-6 text-center text-muted-foreground">No items match “{search}”.</p>}
          {groups.map(([act, items]) => {
            const count = items.filter((i) => effective.has(i.id)).length;
            const state = count === 0 ? false : count === items.length ? true : "indeterminate";
            return (
              <section key={act} className="border-b last:border-b-0">
                <label className="sticky top-0 z-[1] flex items-center gap-3 bg-muted/70 px-4 py-2 backdrop-blur">
                  <Checkbox
                    checked={state}
                    disabled={!canEdit}
                    onCheckedChange={(checked) =>
                      update((next) => items.forEach((i) => (checked ? next.add(i.id) : next.delete(i.id))))
                    }
                    aria-label={`Select all ${act} items`}
                  />
                  <span className="font-mono text-xs font-semibold">{act}</span>
                  <span className="text-xs text-muted-foreground tabular">
                    {count}/{items.length}
                  </span>
                </label>
                <ul>
                  {items.map((item) => {
                    const isNew = !!current && !current.itemIds.includes(item.id);
                    return (
                      <li key={item.id}>
                        <label
                          className={cn(
                            "flex items-start gap-3 px-4 py-2.5 hover:bg-accent/40",
                            canEdit ? "cursor-pointer" : "cursor-default",
                          )}
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={effective.has(item.id)}
                            disabled={!canEdit}
                            onCheckedChange={(checked) =>
                              update((next) => (checked ? next.add(item.id) : next.delete(item.id)))
                            }
                          />
                          <span className="min-w-0 flex-1">{item.description}</span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {isNew && <StatusBadge tone="info" label="New" dot={false} />}
                            <span className="w-14 text-right font-mono text-[11px] text-muted-foreground">
                              {item.stateCode ?? "National"}
                            </span>
                            <StatusBadge meta={cadenceMeta[item.cadence]} dot={false} />
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </CardContent>
        {canEdit && (
          <div className="flex flex-wrap items-end gap-3 border-t bg-muted/30 px-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="effective-from" className="text-xs">
                New version effective from
              </Label>
              <Input
                id="effective-from"
                type="date"
                min={minFrom}
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <p className="max-w-md flex-1 text-xs text-muted-foreground">
              {isOnboarding
                ? "First assignment: all applicable master items are pre-selected. Untick the exceptions."
                : changes > 0
                  ? `${changes} change${changes === 1 ? "" : "s"}. The current version ends the day before.`
                  : "No changes yet."}
            </p>
            <Button onClick={save} disabled={isSaving || selectedCount === 0 || (!isOnboarding && changes === 0)}>
              {isSaving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {isOnboarding ? "Save assignment" : "Save new version"}
            </Button>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        <Alert className="border-info-border bg-info-subtle text-info">
          <InfoIcon />
          <AlertDescription className="text-info">
            An audit run needs one version covering its whole activity period. Make changes between periods, not in the
            middle of one.
          </AlertDescription>
        </Alert>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <HistoryIcon className="size-4 text-muted-foreground" aria-hidden /> Version history
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {versions.length === 0 ? (
              <p className="p-4 text-[13px] text-muted-foreground">No versions yet.</p>
            ) : (
              <ol>
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-2 border-b px-4 py-2.5 last:border-b-0"
                  >
                    <div className="text-[13px] tabular">
                      {formatDate(v.effectiveFrom)} → {v.effectiveTo ? formatDate(v.effectiveTo) : "open"}
                      <div className="text-xs text-muted-foreground">{v.itemIds.length} items</div>
                    </div>
                    {v.effectiveTo === null && <StatusBadge tone="success" label="Current" />}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
