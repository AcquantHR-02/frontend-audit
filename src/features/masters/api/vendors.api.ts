import { baseApi } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { Vendor } from "@/types/domain";

export const vendorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getVendors: build.query<Page<Vendor>, PageRequest | void>({
      query: (params) => ({ url: "/vendors", params: params ?? undefined }),
      providesTags: (result) => [
        { type: "Vendor", id: "LIST" },
        ...(result?.content.map(({ id }) => ({ type: "Vendor" as const, id })) ?? []),
      ],
    }),
  }),
});

export const { useGetVendorsQuery } = vendorsApi;
