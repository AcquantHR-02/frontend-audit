import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { Vendor, VendorSummary } from "@/types/domain";

export type VendorInput = Pick<Vendor, "name">;
export type VendorListParams = PageRequest & { active?: boolean };

export const vendorsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getVendors: build.query<Page<VendorSummary>, VendorListParams | void>({
      query: (params) => ({ url: "/vendors", params: params ?? undefined }),
      providesTags: (result) => providesPage("Vendor", result),
    }),
    createVendor: build.mutation<VendorSummary, VendorInput>({
      query: (body) => ({ url: "/vendors", method: "POST", body }),
      invalidatesTags: [{ type: "Vendor", id: "LIST" }],
    }),
    updateVendor: build.mutation<VendorSummary, VendorInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/vendors/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Vendor", id }, "User"],
    }),
    setVendorStatus: build.mutation<VendorSummary, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({ url: `/vendors/${id}/status`, method: "PATCH", body: { isActive } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Vendor", id }],
    }),
  }),
});

export const { useGetVendorsQuery, useCreateVendorMutation, useUpdateVendorMutation, useSetVendorStatusMutation } =
  vendorsApi;
