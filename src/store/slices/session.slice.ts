import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SessionUser } from "@/types/domain";

/**
 * Core session state. Lives in `store/` (not `features/auth`) because the base query
 * reads the token on every request — infrastructure must not depend on a feature.
 *
 * The access token is kept in memory only; the refresh token is expected as an
 * httpOnly cookie set by the backend, so a page reload restores the session via /auth/refresh.
 */
export interface SessionState {
  accessToken: string | null;
  user: SessionUser | null;
  /** "idle" until the first refresh attempt finishes — lets route guards avoid flashing /login. */
  status: "idle" | "authenticated" | "anonymous";
}

const initialState: SessionState = {
  accessToken: null,
  user: null,
  status: "idle",
};

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    credentialsReceived(state, action: PayloadAction<{ accessToken: string; user: SessionUser }>) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.status = "authenticated";
    },
    tokenRefreshed(state, action: PayloadAction<{ accessToken: string }>) {
      state.accessToken = action.payload.accessToken;
    },
    userUpdated(state, action: PayloadAction<SessionUser>) {
      state.user = action.payload;
    },
    loggedOut(): SessionState {
      return { ...initialState, status: "anonymous" };
    },
  },
  selectors: {
    selectAccessToken: (state) => state.accessToken,
    selectCurrentUser: (state) => state.user,
    selectSessionStatus: (state) => state.status,
  },
});

export const { credentialsReceived, tokenRefreshed, userUpdated, loggedOut } = sessionSlice.actions;
export const { selectAccessToken, selectCurrentUser, selectSessionStatus } = sessionSlice.selectors;
