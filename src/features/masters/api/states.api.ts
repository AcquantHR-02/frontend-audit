import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { State } from "@/types/domain";

export type StateInput = Pick<State, "code" | "name">;

export const statesApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getStates: build.query<Page<State>, PageRequest | void>({
      query: (params) => ({ url: "/states", params: params ?? undefined }),
      providesTags: (result) => providesPage("State", result),
    }),
    createState: build.mutation<State, StateInput>({
      query: (body) => ({ url: "/states", method: "POST", body }),
      invalidatesTags: [{ type: "State", id: "LIST" }],
    }),
    updateState: build.mutation<State, StateInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/states/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "State", id }, "PEUnit", "ChecklistItem", "PEChecklistItem"],
    }),
  }),
});

export const { useGetStatesQuery, useCreateStateMutation, useUpdateStateMutation } = statesApi;
