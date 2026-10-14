"use client";

import { useEffect, useState, type ReactNode } from "react";
import { env } from "@/config/env";

/**
 * Start-once guard: React Strict Mode runs effects twice in development, and MSW refuses
 * to start an already-enabled worker. Kept on globalThis so it also survives Fast Refresh
 * re-evaluating this module while the worker is still running.
 */
const mswGlobal = globalThis as typeof globalThis & { __mswStarted?: Promise<unknown> };

function startMocking() {
  mswGlobal.__mswStarted ??= import("@/mocks/browser").then(({ worker }) =>
    worker.start({ onUnhandledFrame: "bypass", quiet: true }),
  );
  return mswGlobal.__mswStarted;
}

/**
 * Starts the MSW service worker before rendering the app, so no request can
 * race past the mock layer. With NEXT_PUBLIC_API_MOCKING=disabled this is a pass-through,
 * and the dynamic import keeps all mock code out of the production bundle.
 */
export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!env.isMockingEnabled);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    startMocking().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return ready ? children : null;
}
