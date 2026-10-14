"use client";

import { ClipboardListIcon, ListChecksIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import {
  useGetChecklistItemsQuery,
  useGetUnitsQuery,
  usePrincipalEmployerOptions,
  useVendorOptions,
} from "@/features/masters";
import { useCan } from "@/hooks/use-current-user";
import { useUrlFilter } from "@/hooks/use-url-filter";
import { Permission } from "@/lib/auth";
import {
  useGetPEChecklistVersionsQuery,
  useGetVendorChecklistVersionsQuery,
  useGetVendorUnitAssignmentsQuery,
  useSavePEChecklistVersionMutation,
  useSaveVendorChecklistVersionMutation,
} from "../api/assignments.api";
import { ChecklistEditor } from "./checklist-editor";

/** §12.3 — checklist per (Vendor, Unit). */
export function VendorChecklistsPage() {
  const canEdit = useCan(Permission.ASSIGNMENTS_MANAGE);
  const vendorOptions = useVendorOptions();
  const [vendorId, setVendorId] = useUrlFilter("vendor");
  const [unitId, setUnitId] = useUrlFilter("unit");

  const { data: assignments } = useGetVendorUnitAssignmentsQuery(
    { vendorId, status: "CURRENT", size: 200 },
    { skip: !vendorId },
  );
  const unit = assignments?.content.find((a) => a.peUnitId === unitId);
  const ready = !!vendorId && !!unit;

  const { data: master } = useGetChecklistItemsQuery(
    { kind: "vendor", params: { active: true, forStates: unit?.unitStateId, size: 200, sort: "actShortName,asc" } },
    { skip: !ready },
  );
  const { data: versions } = useGetVendorChecklistVersionsQuery({ vendorId, peUnitId: unitId }, { skip: !ready });
  const [save, { isLoading }] = useSaveVendorChecklistVersionMutation();

  return (
    <>
      <PageHeader
        title="Vendor checklists"
        description="Which master items apply to a vendor at a unit. Items that don't apply are simply left out (not marked NA)."
      />
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Vendor"
          allLabel="Select…"
          value={vendorId}
          onChange={(v) => {
            setVendorId(v);
            setUnitId("");
          }}
          options={vendorOptions}
        />
        <FilterSelect
          label="Unit"
          allLabel="Select…"
          value={unitId}
          onChange={setUnitId}
          options={(assignments?.content ?? []).map((a) => ({
            value: a.peUnitId,
            label: `${a.unitCode} · ${a.unitName}`,
          }))}
        />
      </div>
      {!ready ? (
        <EmptyState
          icon={ListChecksIcon}
          title={vendorId ? "Select a unit" : "Select a vendor and unit"}
          description={
            vendorId && assignments?.content.length === 0
              ? "This vendor has no current unit assignments. Assign it under Vendor units first."
              : "Only units where the vendor currently works are listed."
          }
        />
      ) : (
        <ChecklistEditor
          key={`${vendorId}:${unitId}`}
          masterItems={master?.content}
          versions={versions?.map((v) => ({ ...v, itemIds: v.checklistItemIds }))}
          canEdit={canEdit}
          isSaving={isLoading}
          onSave={(effectiveFrom, checklistItemIds) =>
            save({ vendorId, peUnitId: unitId, effectiveFrom, checklistItemIds }).unwrap()
          }
        />
      )}
    </>
  );
}

/** §12.4 / §19 — checklist per Principal Employer (applies to all its units). */
export function PEChecklistsPage() {
  const canEdit = useCan(Permission.ASSIGNMENTS_MANAGE);
  const peOptions = usePrincipalEmployerOptions();
  const [peId, setPeId] = useUrlFilter("pe");

  const { data: units } = useGetUnitsQuery({ peId, size: 200 }, { skip: !peId });
  const stateIds = [...new Set(units?.content.map((u) => u.stateId))].join(",");
  const { data: master } = useGetChecklistItemsQuery(
    { kind: "pe", params: { active: true, forStates: stateIds, size: 200, sort: "actShortName,asc" } },
    { skip: !peId || !units },
  );
  const { data: versions } = useGetPEChecklistVersionsQuery(peId, { skip: !peId });
  const [save, { isLoading }] = useSavePEChecklistVersionMutation();

  return (
    <>
      <PageHeader
        title="PE checklists"
        description="Which PE master items apply to a Principal Employer. One checklist applies uniformly to all its units."
      />
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Principal Employer"
          allLabel="Select…"
          value={peId}
          onChange={setPeId}
          options={peOptions}
        />
      </div>
      {!peId ? (
        <EmptyState icon={ClipboardListIcon} title="Select a Principal Employer" />
      ) : (
        <ChecklistEditor
          key={peId}
          masterItems={master?.content}
          versions={versions?.map((v) => ({ ...v, itemIds: v.peChecklistItemIds }))}
          canEdit={canEdit}
          isSaving={isLoading}
          onSave={(effectiveFrom, peChecklistItemIds) => save({ peId, effectiveFrom, peChecklistItemIds }).unwrap()}
        />
      )}
    </>
  );
}
