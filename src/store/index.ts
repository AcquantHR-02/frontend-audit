import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "./base-api";
import { sessionSlice } from "./slices/session.slice";

/** `combineSlices` lets features lazy-inject their own slices via `rootReducer.inject(...)`. */
export const rootReducer = combineSlices(baseApi, sessionSlice);

/**
 * Store factory — one store per browser tab, created inside StoreProvider.
 * (Official Next.js App Router pattern: never a module-level singleton.)
 */
export function makeStore() {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
    devTools: process.env.NODE_ENV !== "production",
  });
  // Enables refetchOnFocus / refetchOnReconnect.
  setupListeners(store.dispatch);
  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore["dispatch"];

export { baseApi, type TagType } from "./base-api";
export * from "./slices/session.slice";
export * from "./tags";
