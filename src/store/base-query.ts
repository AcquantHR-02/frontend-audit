import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { env } from "@/config/env";
import type { ApiError } from "@/types/api";
import { loggedOut, tokenRefreshed, type SessionState } from "./slices/session.slice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.apiBaseUrl,
  credentials: "include", // send the httpOnly refresh cookie
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { session: SessionState }).session.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

/**
 * Single in-flight refresh shared by all concurrent 401s, so ten parallel
 * requests trigger one /auth/refresh — not ten.
 */
let refreshPromise: Promise<boolean> | null = null;

const AUTH_ENDPOINTS = ["/auth/login", "/auth/refresh", "/auth/logout"];

function urlOf(args: string | FetchArgs) {
  return typeof args === "string" ? args : args.url;
}

/** Wraps fetchBaseQuery: on 401, refresh once and retry; on refresh failure, log out. */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401 || AUTH_ENDPOINTS.includes(urlOf(args))) {
    return result;
  }

  refreshPromise ??= (async () => {
    const refresh = await rawBaseQuery({ url: "/auth/refresh", method: "POST" }, api, extraOptions);
    const accessToken = (refresh.data as { accessToken?: string } | undefined)?.accessToken;
    if (accessToken) {
      api.dispatch(tokenRefreshed({ accessToken }));
      return true;
    }
    api.dispatch(loggedOut());
    return false;
  })().finally(() => {
    refreshPromise = null;
  });

  if (await refreshPromise) {
    result = await rawBaseQuery(args, api, extraOptions);
  }
  return result;
};

/** Maps any transport/HTTP error into the app-wide `ApiError` shape. */
export function toApiError(error: FetchBaseQueryError): ApiError {
  if (typeof error.status === "number") {
    const body = (error.data ?? {}) as Partial<ApiError>;
    return {
      status: error.status,
      message: body.message ?? `Request failed (${error.status})`,
      code: body.code,
      fieldErrors: body.fieldErrors,
    };
  }
  const messages: Record<string, string> = {
    FETCH_ERROR: "Can't reach the server. Check your connection and try again.",
    TIMEOUT_ERROR: "The server took too long to respond.",
    PARSING_ERROR: "The server sent an unexpected response.",
  };
  return { status: 0, message: messages[error.status] ?? "Something went wrong." };
}

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (args, api, extraOptions) => {
  const result = await baseQueryWithReauth(args, api, extraOptions);
  return result.error ? { error: toApiError(result.error), meta: result.meta } : result;
};
