import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { env } from "@/config/env";
import type { ApiError } from "@/types/api";
import { baseQuery } from "./base-query";

type StoreLike = Pick<BaseQueryApi, "getState" | "dispatch">;

/**
 * Downloads a protected file as a Blob through the same base query as every API call, so it
 * carries the access token and gets the one-shot refresh on 401. Files can't go through RTK
 * Query's cache: Blobs aren't serialisable.
 */
export async function fetchFile(url: string, store: StoreLike, signal?: AbortSignal): Promise<Blob> {
  const controller = new AbortController();
  signal?.addEventListener("abort", () => controller.abort());
  // URLs returned by the API include the base path; the base query adds it again.
  const path = url.startsWith(env.apiBaseUrl) ? url.slice(env.apiBaseUrl.length) : url;
  const api: BaseQueryApi = {
    ...store,
    signal: controller.signal,
    abort: () => controller.abort(),
    extra: undefined,
    endpoint: "fetchFile",
    type: "query",
  };
  const result = await baseQuery(
    { url: path, responseHandler: (response) => (response.ok ? response.blob() : response.json()) },
    api,
    {},
  );
  if (result.error) throw result.error satisfies ApiError;
  return result.data as Blob;
}

/** Saves a Blob through the browser's download prompt. */
export function saveBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
