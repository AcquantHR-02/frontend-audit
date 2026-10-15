import { baseApi, userUpdated } from "@/store";
import type { NotificationType, SessionUser } from "@/types/domain";

export interface Preferences {
  /** Notification types this user has switched off. */
  mutedNotifications: NotificationType[];
}

export const settingsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    updateProfile: build.mutation<SessionUser, { fullName: string }>({
      query: (body) => ({ url: "/me", method: "PATCH", body }),
      // The header and menus read the name from the session.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userUpdated(data));
        } catch {
          // The form shows the error from the mutation result.
        }
      },
    }),
    getPreferences: build.query<Preferences, void>({
      query: () => "/me/preferences",
      providesTags: ["Preferences"],
    }),
    updatePreferences: build.mutation<Preferences, Preferences>({
      query: (body) => ({ url: "/me/preferences", method: "PUT", body }),
      // Optimistic: the switch flips at once and rolls back if the save fails.
      async onQueryStarted(body, { dispatch, queryFulfilled }) {
        const patch = dispatch(settingsApi.util.updateQueryData("getPreferences", undefined, () => body));
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const { useUpdateProfileMutation, useGetPreferencesQuery, useUpdatePreferencesMutation } = settingsApi;
