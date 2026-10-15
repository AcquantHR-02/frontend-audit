"use client";

import { BookmarkIcon, BookmarkPlusIcon, CheckIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ApiError } from "@/types/api";
import { useCreateSavedViewMutation, useDeleteSavedViewMutation, useGetSavedViewsQuery } from "../api/saved-views.api";

export interface ViewPreset {
  name: string;
  query: string;
}

/** Query string that defines a view: filters, search and sort; page and page size don't count. */
function normalise(query: string) {
  const params = new URLSearchParams(query);
  params.delete("page");
  params.delete("size");
  return [...params.entries()]
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
}

/**
 * "Views" menu for a list page: suggested presets plus the user's own saved filter views.
 * Applying a view replaces the URL query, so it works with every URL-driven filter.
 */
export function SavedViewsMenu({ scope, presets = [] }: { scope: string; presets?: ViewPreset[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = normalise(params?.toString() ?? "");
  const { data: views = [] } = useGetSavedViewsQuery(scope);
  const [deleteView] = useDeleteSavedViewMutation();
  const [saveOpen, setSaveOpen] = useState(false);

  const apply = (query: string) => {
    const size = params?.get("size");
    const next = new URLSearchParams(query);
    if (size) next.set("size", size);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const active = [...presets, ...views].find((v) => normalise(v.query) === current);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="max-w-56">
            <BookmarkIcon />
            <span className="hidden truncate sm:inline">{active ? active.name : "Views"}</span>
            <span className="sr-only sm:hidden">Views</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {presets.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SparklesIcon className="size-3.5" aria-hidden /> Suggested
              </DropdownMenuLabel>
              {presets.map((preset) => (
                <DropdownMenuItem key={preset.name} onSelect={() => apply(preset.query)}>
                  <span className="flex-1 truncate">{preset.name}</span>
                  {active?.name === preset.name && <CheckIcon className="text-primary" aria-label="Current view" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookmarkIcon className="size-3.5" aria-hidden /> My views
          </DropdownMenuLabel>
          {views.length === 0 && (
            <p className="px-2 pb-1.5 text-xs text-muted-foreground">Filter the list, then save it here.</p>
          )}
          {views.map((view) => (
            <DropdownMenuItem key={view.id} onSelect={() => apply(view.query)} className="group">
              <span className="flex-1 truncate">{view.name}</span>
              {active === view && <CheckIcon className="text-primary" aria-label="Current view" />}
              <button
                type="button"
                aria-label={`Delete view ${view.name}`}
                className="grid size-6 place-items-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 group-focus:opacity-100 hover:bg-danger-subtle hover:text-danger"
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  void deleteView({ id: view.id, scope })
                    .unwrap()
                    .then(() => toast.success(`Deleted “${view.name}”`));
                }}
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!current || !!active} onSelect={() => setSaveOpen(true)}>
            <BookmarkPlusIcon /> Save current view…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {saveOpen && <SaveViewDialog scope={scope} query={current} onClose={() => setSaveOpen(false)} />}
    </>
  );
}

function SaveViewDialog({ scope, query, onClose }: { scope: string; query: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [create, { isLoading }] = useCreateSavedViewMutation();

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await create({ scope, name, query }).unwrap();
      toast.success(`Saved view “${name.trim()}”`);
      onClose();
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.fieldErrors?.name ?? apiError.message);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Save view"
      description="Keeps the current filters, search and sort so you can come back in one click. Only you see it."
      submitLabel="Save view"
      isPending={isLoading}
      onSubmit={submit}
      className="sm:max-w-md"
    >
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="view-name">Name</FieldLabel>
        <Input
          id="view-name"
          autoFocus
          maxLength={40}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="e.g. My units in review"
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>
    </FormDialog>
  );
}
