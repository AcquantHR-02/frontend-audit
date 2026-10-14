// Public API of the "masters" feature.
// Other modules must import from "@/features/masters" only, never from its internal folders.
export { actsApi, useGetActsQuery } from "./api/acts.api";
export { checklistItemsApi, useGetChecklistItemsQuery, type ChecklistKind } from "./api/checklist-items.api";
export {
  principalEmployersApi,
  useGetPrincipalEmployerQuery,
  useGetPrincipalEmployersQuery,
  useGetUnitsQuery,
} from "./api/principal-employers.api";
export { statesApi, useGetStatesQuery } from "./api/states.api";
export { useGetVendorsQuery, vendorsApi } from "./api/vendors.api";
export { ActsPage } from "./components/acts/acts-page";
export { ChecklistMasterPage } from "./components/checklists/checklist-master-page";
export { PrincipalEmployerDetailPage } from "./components/principal-employers/pe-detail-page";
export { PrincipalEmployerListPage } from "./components/principal-employers/pe-list-page";
export { StatesPage } from "./components/states/states-page";
export { VendorsPage } from "./components/vendors/vendors-page";
export {
  useActOptions,
  usePrincipalEmployerOptions,
  useStateOptions,
  useVendorOptions,
} from "./hooks/use-master-options";
