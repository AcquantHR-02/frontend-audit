"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { siteConfig } from "@/config/site";

/**
 * Detail pages know their entity's name (run code, PE name…) only after data loads; static route
 * metadata can't. `usePageTitle` publishes it to the breadcrumbs (instead of a generic "Details")
 * and to the browser tab, so several open tabs stay tellable apart.
 */

interface PageTitleState {
  label: string | null;
  setLabel: (label: string | null) => void;
}

const PageTitleContext = createContext<PageTitleState | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  return <PageTitleContext.Provider value={{ label, setLabel }}>{children}</PageTitleContext.Provider>;
}

/** The current detail page's label, or null while loading / on list pages. */
export const useCurrentPageLabel = () => useContext(PageTitleContext)?.label ?? null;

/** Call from a detail page once its data is loaded; `undefined` while loading. */
export function usePageTitle(label: string | undefined) {
  const setLabel = useContext(PageTitleContext)?.setLabel;
  useEffect(() => {
    if (!label) return;
    setLabel?.(label);
    document.title = `${label} · ${siteConfig.shortName}`;
    // The next route's metadata sets its own tab title, so only the crumb needs resetting.
    return () => setLabel?.(null);
  }, [label, setLabel]);
}
