import { http, HttpResponse } from "msw";
import { Permission } from "@/lib/auth";
import { assignmentStatus, periodsOverlap, planNewVersion } from "@/lib/domain/assignments";
import type { VendorUnitAssignment, VendorUnitAssignmentView } from "@/types/domain";
import { logEvent } from "../audit-log";
import { requireUser, stampCreated } from "../crud";
import { db, persist } from "../db";
import { apiUrl, errorResponse, networkDelay, newId, nowIso, paginate, todayIso } from "../utils";

const MANAGE = Permission.ASSIGNMENTS_MANAGE;

const fieldError = (field: string, message: string, status = 400) =>
  errorResponse(status, message, {
    code: status === 409 ? "CONFLICT" : "VALIDATION_FAILED",
    fieldErrors: { [field]: message },
  });

function toView(a: VendorUnitAssignment): VendorUnitAssignmentView {
  const unit = db.peUnits.find((u) => u.id === a.peUnitId);
  const pe = db.principalEmployers.find((p) => p.id === unit?.peId);
  return {
    ...a,
    vendorName: db.vendors.find((v) => v.id === a.vendorId)?.name ?? "—",
    unitCode: unit?.code ?? "—",
    unitName: unit?.name ?? "—",
    unitStateId: unit?.stateId ?? "",
    peId: pe?.id ?? "",
    peName: pe?.name ?? "—",
    status: assignmentStatus(a, todayIso()),
  };
}

/** Item ids must be a strict subset of the active master applicable to these states (§7A Lock 6). */
function invalidItems(
  ids: string[],
  master: { id: string; stateId: string | null; isActive: boolean }[],
  stateIds: string[],
) {
  const allowed = new Set(
    master.filter((i) => i.isActive && (i.stateId === null || stateIds.includes(i.stateId))).map((i) => i.id),
  );
  return ids.filter((id) => !allowed.has(id));
}

export const assignmentsHandlers = [
  /* ---------- Vendor ↔ unit (§12.2) ---------- */
  http.get(apiUrl("/vendor-unit-assignments"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.MASTERS_VIEW);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const vendorId = url.searchParams.get("vendorId");
    const peUnitId = url.searchParams.get("peUnitId");
    const status = url.searchParams.get("status");
    const rows = db.vendorUnitAssignments
      .map(toView)
      .filter(
        (a) =>
          (!vendorId || a.vendorId === vendorId) &&
          (!peUnitId || a.peUnitId === peUnitId) &&
          (!status || a.status === status),
      );
    return HttpResponse.json(paginate(rows, url, ["vendorName", "unitCode", "unitName"], "vendorName,asc"));
  }),

  http.post(apiUrl("/vendor-unit-assignments"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, MANAGE);
    if (user instanceof Response) return user;
    const { vendorId, peUnitId, effectiveFrom } = (await request.json()) as Record<string, string>;
    const vendor = db.vendors.find((v) => v.id === vendorId && v.isActive);
    const unit = db.peUnits.find((u) => u.id === peUnitId);
    if (!vendor) return fieldError("vendorId", "Select an active vendor");
    if (!unit) return fieldError("peUnitId", "Select a unit");
    if (unit.closedAt) return fieldError("peUnitId", "This unit is closed. Reopen it before assigning vendors.", 409);
    if (!effectiveFrom) return fieldError("effectiveFrom", "Select the start date");
    const candidate = { effectiveFrom, effectiveTo: null };
    const clash = db.vendorUnitAssignments.some(
      (a) => a.vendorId === vendorId && a.peUnitId === peUnitId && periodsOverlap(a, candidate),
    );
    if (clash)
      return fieldError("peUnitId", `${vendor.name} is already assigned to ${unit.code} for this period.`, 409);

    const assignment: VendorUnitAssignment = {
      id: newId("vua"),
      vendorId,
      peUnitId,
      effectiveFrom,
      effectiveTo: null,
      ...stampCreated(user),
    };
    db.vendorUnitAssignments.push(assignment);
    logEvent(
      user,
      "VENDOR_ASSIGNED",
      "VendorUnitAssignment",
      assignment.id,
      `${vendor.name} assigned to ${unit.code} from ${effectiveFrom}`,
    );
    persist();
    return HttpResponse.json(toView(assignment), { status: 201 });
  }),

  /** §13 rule 7 — vendor-at-unit termination: stamp effective_to on this one row, no cascade. */
  http.post(apiUrl("/vendor-unit-assignments/:id/end"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, MANAGE);
    if (user instanceof Response) return user;
    const assignment = db.vendorUnitAssignments.find((a) => a.id === params.id);
    if (!assignment) return errorResponse(404, "Assignment not found.");
    if (assignment.effectiveTo) return errorResponse(409, "This assignment has already ended.");
    const { effectiveTo } = (await request.json()) as { effectiveTo?: string };
    if (!effectiveTo || effectiveTo < assignment.effectiveFrom) {
      return fieldError("effectiveTo", `End date must be on or after ${assignment.effectiveFrom}.`);
    }
    Object.assign(assignment, { effectiveTo, updatedAt: nowIso(), updatedBy: user.id });
    persist();
    return HttpResponse.json(toView(assignment));
  }),

  /* ---------- Vendor checklist versions per (vendor, unit) (§12.3) ---------- */
  http.get(apiUrl("/vendor-checklist-assignments"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.MASTERS_VIEW);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const vendorId = url.searchParams.get("vendorId");
    const peUnitId = url.searchParams.get("peUnitId");
    const versions = db.vendorChecklistAssignments
      .filter((a) => a.vendorId === vendorId && a.peUnitId === peUnitId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return HttpResponse.json(versions);
  }),

  http.post(apiUrl("/vendor-checklist-assignments"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, MANAGE);
    if (user instanceof Response) return user;
    const { vendorId, peUnitId, effectiveFrom, checklistItemIds } = (await request.json()) as {
      vendorId: string;
      peUnitId: string;
      effectiveFrom: string;
      checklistItemIds: string[];
    };
    const unit = db.peUnits.find((u) => u.id === peUnitId);
    if (!unit || !db.vendors.some((v) => v.id === vendorId)) return errorResponse(400, "Unknown vendor or unit.");
    if (!checklistItemIds?.length) return fieldError("checklistItemIds", "Select at least one checklist item.");
    if (invalidItems(checklistItemIds, db.checklistItems, [unit.stateId]).length) {
      return fieldError("checklistItemIds", "Some items aren't on the active master for this unit's state.");
    }
    const versions = db.vendorChecklistAssignments.filter((a) => a.vendorId === vendorId && a.peUnitId === peUnitId);
    const plan = planNewVersion(versions, effectiveFrom);
    if (!plan.ok) return fieldError("effectiveFrom", plan.message);
    if (plan.previous)
      Object.assign(plan.previous, { effectiveTo: plan.previousEndsOn, updatedAt: nowIso(), updatedBy: user.id });

    const version = {
      id: newId("vca"),
      vendorId,
      peUnitId,
      effectiveFrom,
      effectiveTo: null,
      checklistItemIds,
      ...stampCreated(user),
    };
    db.vendorChecklistAssignments.push(version);
    logEvent(
      user,
      "CHECKLIST_VERSION",
      "VendorChecklistAssignment",
      version.id,
      `New vendor checklist version from ${effectiveFrom} (${checklistItemIds.length} items)`,
    );
    persist();
    return HttpResponse.json(version, { status: 201 });
  }),

  /* ---------- PE checklist versions per PE (§12.4, §19) ---------- */
  http.get(apiUrl("/pe-checklist-assignments"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.MASTERS_VIEW);
    if (user instanceof Response) return user;
    const peId = new URL(request.url).searchParams.get("peId");
    const versions = db.peChecklistAssignments
      .filter((a) => a.peId === peId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return HttpResponse.json(versions);
  }),

  http.post(apiUrl("/pe-checklist-assignments"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, MANAGE);
    if (user instanceof Response) return user;
    const { peId, effectiveFrom, peChecklistItemIds } = (await request.json()) as {
      peId: string;
      effectiveFrom: string;
      peChecklistItemIds: string[];
    };
    if (!db.principalEmployers.some((p) => p.id === peId)) return errorResponse(400, "Unknown Principal Employer.");
    if (!peChecklistItemIds?.length) return fieldError("peChecklistItemIds", "Select at least one checklist item.");
    const stateIds = [...new Set(db.peUnits.filter((u) => u.peId === peId).map((u) => u.stateId))];
    if (invalidItems(peChecklistItemIds, db.peChecklistItems, stateIds).length) {
      return fieldError("peChecklistItemIds", "Some items aren't on the active PE master for this employer's states.");
    }
    const versions = db.peChecklistAssignments.filter((a) => a.peId === peId);
    const plan = planNewVersion(versions, effectiveFrom);
    if (!plan.ok) return fieldError("effectiveFrom", plan.message);
    if (plan.previous)
      Object.assign(plan.previous, { effectiveTo: plan.previousEndsOn, updatedAt: nowIso(), updatedBy: user.id });

    const version = {
      id: newId("pca"),
      peId,
      effectiveFrom,
      effectiveTo: null,
      peChecklistItemIds,
      ...stampCreated(user),
    };
    db.peChecklistAssignments.push(version);
    logEvent(
      user,
      "CHECKLIST_VERSION",
      "PEChecklistAssignment",
      version.id,
      `New PE checklist version from ${effectiveFrom} (${peChecklistItemIds.length} items)`,
    );
    persist();
    return HttpResponse.json(version, { status: 201 });
  }),
];
