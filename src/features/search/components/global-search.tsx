"use client";

import {
  BuildingIcon,
  ClipboardCheckIcon,
  CornerDownLeftIcon,
  Loader2Icon,
  SearchIcon,
  ShieldAlertIcon,
  TruckIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { allNavItems } from "@/config/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { can } from "@/lib/auth";
import { useGlobalSearchQuery, type SearchGroupType } from "../api/search.api";

const groupIcon: Record<SearchGroupType, LucideIcon> = {
  runs: ClipboardCheckIcon,
  findings: ShieldAlertIcon,
  vendors: TruckIcon,
  pes: BuildingIcon,
  users: UserIcon,
};

/** Header search: pages (client-side) + records from GET /search. Opens with Ctrl/⌘ K or "/". */
export function GlobalSearch() {
  const router = useRouter();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim(), 200);
  const { data, isFetching } = useGlobalSearchQuery(q, { skip: !open || q.length < 2 });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const typing =
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
      if ((event.key === "k" && (event.ctrlKey || event.metaKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const needle = query.trim().toLowerCase();
  const pages = allNavItems
    .filter((item) => can(user, item.permission))
    .filter(
      (item) => !needle || [item.title, ...(item.keywords ?? [])].some((text) => text.toLowerCase().includes(needle)),
    )
    .slice(0, needle ? 5 : 8);
  const groups = q.length >= 2 ? (data?.groups ?? []) : [];

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-[13px] text-muted-foreground shadow-xs transition-colors outline-none hover:border-primary/30 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-56"
        aria-label="Search"
      >
        <SearchIcon className="size-4 shrink-0" aria-hidden />
        <span className="hidden flex-1 truncate text-left whitespace-nowrap md:inline">Search…</span>
        <kbd className="hidden h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium md:inline-flex">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
        title="Search"
        description="Search audit runs, findings, vendors, Principal Employers and pages"
        className="sm:max-w-xl"
      >
        {/* Server results are already filtered, so cmdk's own filtering is off. */}
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search runs, findings, vendors, pages…" />
          <CommandList className="max-h-[min(60vh,420px)]">
            {q.length >= 2 && !isFetching && groups.length === 0 && pages.length === 0 && (
              <CommandEmpty>No results for “{query.trim()}”.</CommandEmpty>
            )}
            {isFetching && (
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
                <Loader2Icon className="size-3.5 animate-spin" aria-hidden /> Searching…
              </div>
            )}
            {groups.map((group) => {
              const Icon = groupIcon[group.type];
              return (
                <CommandGroup key={group.type} heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem key={item.id} value={`${group.type}-${item.id}`} onSelect={() => go(item.href)}>
                      <Icon className="text-muted-foreground" aria-hidden />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{item.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
            {pages.length > 0 && (
              <CommandGroup heading="Pages">
                {pages.map((item) => (
                  <CommandItem key={item.href} value={`page-${item.href}`} onSelect={() => go(item.href)}>
                    <item.icon className="text-muted-foreground" aria-hidden />
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div className="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CornerDownLeftIcon className="size-3" aria-hidden /> open
            </span>
            <span>↑ ↓ move</span>
            <span>Esc close</span>
            <span className="ml-auto">Type at least 2 letters to search records</span>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
