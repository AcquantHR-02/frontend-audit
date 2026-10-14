/**
 * Server-side stand-in for `msw/browser` (which declares `"node": null` and cannot resolve on the server).
 * Aliased in next.config.ts; never executed — MswProvider only starts the worker in the browser.
 */
export function setupWorker(): never {
  throw new Error("msw/browser is browser-only");
}
