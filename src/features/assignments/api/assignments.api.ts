import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type {
  AssignmentStatus,
  PEChecklistAssignment,
  VendorChecklistAssignment,
  VendorUnitAssignmentView,
} from "@/types/domain";

export type VendorUnitListParams = PageRequest & { vendorId?: string; peUnitId?: string; status?: AssignmentStatus };

export const assignmentsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getVendorUnitAssignments: build.query<Page<VendorUnitAssignmentView>, VendorUnitListParams>({
      query: (params) => ({ url: "/vendor-unit-assignments", params }),
      providesTags: (result) => providesPage("VendorUnitAssignment", result),
    }),
    assignVendorToUnit: build.mutation<
      VendorUnitAssignmentView,
      { vendorId: string; peUnitId: string; effectiveFrom: string }
    >({
      query: (body) => ({ url: "/vendor-unit-assignments", method: "POST", body }),
      invalidatesTags: ["VendorUnitAssignment", "Vendor", "PEUnit"],
    }),
    endVendorUnitAssignment: build.mutation<VendorUnitAssignmentView, { id: string; effectiveTo: string }>({
      query: ({ id, effectiveTo }) => ({
        url: `/vendor-unit-assignments/${id}/end`,
        method: "POST",
        body: { effectiveTo },
      }),
      invalidatesTags: ["VendorUnitAssignment", "Vendor", "PEUnit"],
    }),

    getVendorChecklistVersions: build.query<VendorChecklistAssignment[], { vendorId: string; peUnitId: string }>({
      query: (params) => ({ url: "/vendor-checklist-assignments", params }),
      providesTags: (_r, _e, { vendorId, peUnitId }) => [
        { type: "VendorChecklistAssignment", id: `${vendorId}:${peUnitId}` },
      ],
    }),
    saveVendorChecklistVersion: build.mutation<
      VendorChecklistAssignment,
      { vendorId: string; peUnitId: string; effectiveFrom: string; checklistItemIds: string[] }
    >({
      query: (body) => ({ url: "/vendor-checklist-assignments", method: "POST", body }),
      invalidatesTags: (_r, _e, { vendorId, peUnitId }) => [
        { type: "VendorChecklistAssignment", id: `${vendorId}:${peUnitId}` },
      ],
    }),

    getPEChecklistVersions: build.query<PEChecklistAssignment[], string>({
      query: (peId) => ({ url: "/pe-checklist-assignments", params: { peId } }),
      providesTags: (_r, _e, peId) => [{ type: "PEChecklistAssignment", id: peId }],
    }),
    savePEChecklistVersion: build.mutation<
      PEChecklistAssignment,
      { peId: string; effectiveFrom: string; peChecklistItemIds: string[] }
    >({
      query: (body) => ({ url: "/pe-checklist-assignments", method: "POST", body }),
      invalidatesTags: (_r, _e, { peId }) => [{ type: "PEChecklistAssignment", id: peId }],
    }),
  }),
});

export const {
  useGetVendorUnitAssignmentsQuery,
  useAssignVendorToUnitMutation,
  useEndVendorUnitAssignmentMutation,
  useGetVendorChecklistVersionsQuery,
  useSaveVendorChecklistVersionMutation,
  useGetPEChecklistVersionsQuery,
  useSavePEChecklistVersionMutation,
} = assignmentsApi;
