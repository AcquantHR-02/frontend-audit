import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { PEUnit, PEUnitView, PrincipalEmployer, PrincipalEmployerSummary } from "@/types/domain";

export type PrincipalEmployerInput = Pick<PrincipalEmployer, "name" | "legalName">;
export type PEUnitInput = Pick<PEUnit, "peId" | "stateId" | "code" | "name">;
export type PEListParams = PageRequest & { active?: boolean };
export type UnitListParams = PageRequest & { peId?: string; status?: "open" | "closed" };

export const principalEmployersApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getPrincipalEmployers: build.query<Page<PrincipalEmployerSummary>, PEListParams | void>({
      query: (params) => ({ url: "/principal-employers", params: params ?? undefined }),
      providesTags: (result) => providesPage("PrincipalEmployer", result),
    }),
    getPrincipalEmployer: build.query<PrincipalEmployerSummary, string>({
      query: (id) => `/principal-employers/${id}`,
      providesTags: (_r, _e, id) => [{ type: "PrincipalEmployer", id }],
    }),
    createPrincipalEmployer: build.mutation<PrincipalEmployerSummary, PrincipalEmployerInput>({
      query: (body) => ({ url: "/principal-employers", method: "POST", body }),
      invalidatesTags: [{ type: "PrincipalEmployer", id: "LIST" }],
    }),
    updatePrincipalEmployer: build.mutation<PrincipalEmployerSummary, PrincipalEmployerInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/principal-employers/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "PrincipalEmployer", id }],
    }),
    setPrincipalEmployerStatus: build.mutation<PrincipalEmployerSummary, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({ url: `/principal-employers/${id}/status`, method: "PATCH", body: { isActive } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "PrincipalEmployer", id }],
    }),

    /* ----- Units ----- */
    getUnits: build.query<Page<PEUnitView>, UnitListParams>({
      query: (params) => ({ url: "/pe-units", params }),
      providesTags: (result) => providesPage("PEUnit", result),
    }),
    createUnit: build.mutation<PEUnitView, PEUnitInput>({
      query: (body) => ({ url: "/pe-units", method: "POST", body }),
      invalidatesTags: (_r, _e, { peId }) => [
        { type: "PEUnit", id: "LIST" },
        { type: "PrincipalEmployer", id: peId },
      ],
    }),
    updateUnit: build.mutation<PEUnitView, PEUnitInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/pe-units/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "PEUnit", id }],
    }),
    /** §13 — ends active vendor assignments at the unit (one-way). */
    closeUnit: build.mutation<{ unit: PEUnitView; endedAssignments: number }, { id: string; closedOn: string }>({
      query: ({ id, closedOn }) => ({ url: `/pe-units/${id}/close`, method: "POST", body: { closedOn } }),
      invalidatesTags: (result, _e, { id }) => [
        { type: "PEUnit", id },
        { type: "PrincipalEmployer", id: result?.unit.peId },
        "Vendor",
        "VendorUnitAssignment",
      ],
    }),
    reopenUnit: build.mutation<PEUnitView, string>({
      query: (id) => ({ url: `/pe-units/${id}/reopen`, method: "POST" }),
      invalidatesTags: (result, _e, id) => [
        { type: "PEUnit", id },
        { type: "PrincipalEmployer", id: result?.peId },
      ],
    }),
  }),
});

export const {
  useGetPrincipalEmployersQuery,
  useGetPrincipalEmployerQuery,
  useCreatePrincipalEmployerMutation,
  useUpdatePrincipalEmployerMutation,
  useSetPrincipalEmployerStatusMutation,
  useGetUnitsQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useCloseUnitMutation,
  useReopenUnitMutation,
} = principalEmployersApi;
