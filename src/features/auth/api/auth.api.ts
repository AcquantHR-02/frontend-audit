import { baseApi, credentialsReceived, loggedOut, userUpdated } from "@/store";
import type { SessionUser } from "@/types/domain";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: SessionUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const authApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(credentialsReceived(data));
        } catch {
          // Failure is surfaced to the caller via the mutation result; nothing to store.
        }
      },
    }),

    /** Restores the session on page load from the refresh cookie. */
    refreshSession: build.mutation<AuthResponse, void>({
      query: () => ({ url: "/auth/refresh", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(credentialsReceived(data));
        } catch {
          dispatch(loggedOut());
        }
      },
    }),

    changePassword: build.mutation<SessionUser, ChangePasswordRequest>({
      query: (body) => ({ url: "/auth/change-password", method: "POST", body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userUpdated(data));
        } catch {
          // Shown inline by the form.
        }
      },
    }),

    logout: build.mutation<void, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled.catch(() => undefined);
        dispatch(loggedOut());
        // Drop every cached response so the next user never sees the previous user's data.
        dispatch(baseApi.util.resetApiState());
      },
    }),
  }),
});

export const { useLoginMutation, useRefreshSessionMutation, useChangePasswordMutation, useLogoutMutation } = authApi;
