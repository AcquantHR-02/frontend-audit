"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MswProvider } from "./msw-provider";
import { StoreProvider } from "./store-provider";
import { ThemeProvider } from "./theme-provider";

/** Single composition point for every app-wide provider (order matters: mocks → store → UI). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MswProvider>
        <StoreProvider>
          <TooltipProvider delayDuration={200}>
            <NuqsAdapter>{children}</NuqsAdapter>
            <Toaster richColors closeButton position="top-right" />
          </TooltipProvider>
        </StoreProvider>
      </MswProvider>
    </ThemeProvider>
  );
}
