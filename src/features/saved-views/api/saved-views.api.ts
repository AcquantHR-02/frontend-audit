import { baseApi } from "@/store";
import type { SavedView } from "@/types/domain";

export const savedViewsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getSavedViews: build.query<SavedView[], string>({
      query: (scope) => ({ url: "/me/views", params: { scope } }),
      providesTags: (_r, _e, scope) => [{ type: "SavedView", id: scope }],
    }),
    createSavedView: build.mutation<SavedView, { scope: string; name: string; query: string }>({
      query: (body) => ({ url: "/me/views", method: "POST", body }),
      invalidatesTags: (_r, _e, { scope }) => [{ type: "SavedView", id: scope }],
    }),
    deleteSavedView: build.mutation<void, { id: string; scope: string }>({
      query: ({ id }) => ({ url: `/me/views/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { scope }) => [{ type: "SavedView", id: scope }],
    }),
  }),
});

export const { useGetSavedViewsQuery, useCreateSavedViewMutation, useDeleteSavedViewMutation } = savedViewsApi;
