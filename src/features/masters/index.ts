// Public API of the "masters" feature.
// Other modules must import from "@/features/masters" only, never from its internal folders.
export { useGetVendorsQuery, vendorsApi } from "./api/vendors.api";
