import { http, HttpResponse } from "msw";
import { Permission } from "@/lib/auth";
import type {
  Act,
  ActSummary,
  Cadence,
  ChecklistItem,
  ChecklistItemView,
  PEUnit,
  PEUnitView,
  PrincipalEmployer,
  PrincipalEmployerSummary,
  State,
  Vendor,
  VendorSummary,
} from "@/types/domain";
import { crudHandlers, isTaken, requireUser, stampCreated } from "../crud";
import { db, persist } from "../db";
import { apiUrl, boolParam, errorResponse, networkDelay, newId, nowIso, todayIso } from "../utils";

const VIEW = Permission.MASTERS_VIEW;
const MANAGE = Permission.MASTERS_MANAGE;
const CADENCES: Cadence[] = ["LIFETIME", "ONE_TIME", "PERIODIC"];

const activeFilter = (item: { isActive: boolean }, url: URL) => {
  const active = boolParam(url, "active");
  return active === null || item.isActive === active;
};

const isAssignmentCurrent = (a: { effectiveFrom: string; effectiveTo: string | null }) => {
  const today = todayIso();
  return a.effectiveFrom <= today && (a.effectiveTo === null || a.effectiveTo >= today);
};

/* ---------------- States ---------------- */
type StateInput = Pick<State, "code" | "name">;

const stateHandlers = crudHandlers<State, StateInput>({
  path: "/states",
  collection: () => db.states,
  readPermission: VIEW,
  writePermission: MANAGE,
  searchFields: ["code", "name"],
  defaultSort: "name,asc",
  validate: (input, existing) => {
    const errors: Record<string, string> = {};
    if (!/^[A-Z]{2,3}$/.test(input.code ?? "")) errors.code = "Use the 2–3 letter state code, e.g. KA";
    else if (isTaken(db.states, existing, (s) => s.code, input.code)) errors.code = "This state code already exists";
    if (!input.name?.trim()) errors.name = "Enter the state name";
    else if (isTaken(db.states, existing, (s) => s.name, input.name)) errors.name = "This state already exists";
    return Object.keys(errors).length ? errors : null;
  },
  create: (input, user) => ({ id: newId("st"), code: input.code, name: input.name.trim(), ...stampCreated(user) }),
  update: (item, input) => Object.assign(item, { code: input.code, name: input.name.trim() }),
});

/* ---------------- Acts ---------------- */
type ActInput = Pick<Act, "name" | "shortName" | "category">;

const actHandlers = crudHandlers<Act, ActInput, ActSummary>({
  path: "/acts",
  collection: () => db.acts,
  readPermission: VIEW,
  writePermission: MANAGE,
  searchFields: ["name", "shortName", "category"],
  defaultSort: "shortName,asc",
  softDelete: true,
  filter: activeFilter,
  toView: (act) => ({
    ...act,
    checklistItemCount: db.checklistItems.filter((i) => i.actId === act.id).length,
    peChecklistItemCount: db.peChecklistItems.filter((i) => i.actId === act.id).length,
  }),
  validate: (input, existing) => {
    const errors: Record<string, string> = {};
    if (!input.name?.trim()) errors.name = "Enter the full name of the Act";
    else if (isTaken(db.acts, existing, (a) => a.name, input.name))
      errors.name = "An Act with this name already exists";
    if (!input.shortName?.trim()) errors.shortName = "Enter a short name, e.g. CLRA";
    else if (isTaken(db.acts, existing, (a) => a.shortName, input.shortName))
      errors.shortName = "This short name is already used";
    return Object.keys(errors).length ? errors : null;
  },
  create: (input, user) => ({
    id: newId("act"),
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    category: input.category?.trim() || null,
    isActive: true,
    ...stampCreated(user),
  }),
  update: (item, input) =>
    Object.assign(item, {
      name: input.name.trim(),
      shortName: input.shortName.trim(),
      category: input.category?.trim() || null,
    }),
});

/* ---------------- Principal Employers ---------------- */
type PEInput = Pick<PrincipalEmployer, "name" | "legalName">;

const peHandlers = crudHandlers<PrincipalEmployer, PEInput, PrincipalEmployerSummary>({
  path: "/principal-employers",
  collection: () => db.principalEmployers,
  readPermission: VIEW,
  writePermission: MANAGE,
  searchFields: ["name", "legalName"],
  defaultSort: "name,asc",
  softDelete: true,
  filter: activeFilter,
  toView: (pe) => {
    const units = db.peUnits.filter((u) => u.peId === pe.id);
    return { ...pe, unitCount: units.length, openUnitCount: units.filter((u) => !u.closedAt).length };
  },
  validate: (input, existing) => {
    const errors: Record<string, string> = {};
    if (!input.name?.trim()) errors.name = "Enter the display name";
    else if (isTaken(db.principalEmployers, existing, (p) => p.name, input.name))
      errors.name = "A Principal Employer with this name already exists";
    if (!input.legalName?.trim()) errors.legalName = "Enter the registered legal name";
    return Object.keys(errors).length ? errors : null;
  },
  create: (input, user) => ({
    id: newId("pe"),
    name: input.name.trim(),
    legalName: input.legalName.trim(),
    isActive: true,
    ...stampCreated(user),
  }),
  update: (item, input) => Object.assign(item, { name: input.name.trim(), legalName: input.legalName.trim() }),
});

/* ---------------- PE Units (+ closure, §13) ---------------- */
type UnitInput = Pick<PEUnit, "peId" | "stateId" | "code" | "name">;

const toUnitView = (unit: PEUnit): PEUnitView => ({
  ...unit,
  stateCode: db.states.find((s) => s.id === unit.stateId)?.code ?? "—",
  activeVendorCount: db.vendorUnitAssignments.filter((a) => a.peUnitId === unit.id && isAssignmentCurrent(a)).length,
});

const unitHandlers = crudHandlers<PEUnit, UnitInput, PEUnitView>({
  path: "/pe-units",
  collection: () => db.peUnits,
  readPermission: VIEW,
  writePermission: MANAGE,
  searchFields: ["code", "name"],
  defaultSort: "code,asc",
  filter: (unit, url) => {
    const peId = url.searchParams.get("peId");
    const status = url.searchParams.get("status"); // open | closed
    return (!peId || unit.peId === peId) && (!status || (status === "closed" ? !!unit.closedAt : !unit.closedAt));
  },
  toView: toUnitView,
  validate: (input, existing) => {
    const errors: Record<string, string> = {};
    if (!existing && !db.principalEmployers.some((p) => p.id === input.peId))
      errors.peId = "Unknown Principal Employer";
    if (!db.states.some((s) => s.id === input.stateId)) errors.stateId = "Select the state the unit is located in";
    if (!/^[A-Z0-9-]{3,20}$/.test(input.code ?? ""))
      errors.code = "Use 3–20 uppercase letters, digits or hyphens, e.g. VOM-JIG";
    else if (isTaken(db.peUnits, existing, (u) => u.code, input.code)) errors.code = "This unit code is already used";
    if (!input.name?.trim()) errors.name = "Enter the unit name";
    return Object.keys(errors).length ? errors : null;
  },
  create: (input, user) => ({
    id: newId("unit"),
    peId: input.peId,
    stateId: input.stateId,
    code: input.code,
    name: input.name.trim(),
    closedAt: null,
    closedBy: null,
    ...stampCreated(user),
  }),
  // peId is immutable after creation.
  update: (item, input) => Object.assign(item, { stateId: input.stateId, code: input.code, name: input.name.trim() }),
});

const unitClosureHandlers = [
  /** Closing is informational (§13): stamps closedAt and ends active vendor assignments — one-way. */
  http.post(apiUrl("/pe-units/:id/close"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.UNITS_CLOSE);
    if (user instanceof Response) return user;
    const unit = db.peUnits.find((u) => u.id === params.id);
    if (!unit) return errorResponse(404, "Unit not found.");
    if (unit.closedAt) return errorResponse(409, "This unit is already closed.");

    const { closedOn } = (await request.json()) as { closedOn?: string };
    if (!closedOn || closedOn > todayIso()) {
      return errorResponse(400, "Closure date can't be in the future.", {
        fieldErrors: { closedOn: "Closure date can't be in the future." },
      });
    }

    unit.closedAt = `${closedOn}T00:00:00Z`;
    unit.closedBy = user.id;
    unit.updatedAt = nowIso();
    unit.updatedBy = user.id;
    let endedAssignments = 0;
    for (const a of db.vendorUnitAssignments) {
      if (a.peUnitId === unit.id && a.effectiveTo === null) {
        a.effectiveTo = closedOn;
        a.updatedAt = nowIso();
        a.updatedBy = user.id;
        endedAssignments++;
      }
    }
    persist();
    return HttpResponse.json({ unit: toUnitView(unit), endedAssignments });
  }),

  /** Reopen clears closure only; vendor assignments are NOT resurrected (§13 rule 2). */
  http.post(apiUrl("/pe-units/:id/reopen"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.UNITS_CLOSE);
    if (user instanceof Response) return user;
    const unit = db.peUnits.find((u) => u.id === params.id);
    if (!unit) return errorResponse(404, "Unit not found.");
    unit.closedAt = null;
    unit.closedBy = null;
    unit.updatedAt = nowIso();
    unit.updatedBy = user.id;
    persist();
    return HttpResponse.json(toUnitView(unit));
  }),
];

/* ---------------- Vendors ---------------- */
type VendorInput = Pick<Vendor, "name">;

const vendorHandlers = crudHandlers<Vendor, VendorInput, VendorSummary>({
  path: "/vendors",
  collection: () => db.vendors,
  readPermission: VIEW,
  writePermission: MANAGE,
  searchFields: ["name"],
  defaultSort: "name,asc",
  softDelete: true,
  filter: activeFilter,
  toView: (vendor) => ({
    ...vendor,
    activeUnitCount: db.vendorUnitAssignments.filter((a) => a.vendorId === vendor.id && isAssignmentCurrent(a)).length,
  }),
  validate: (input, existing) => {
    if (!input.name?.trim()) return { name: "Enter the vendor name" };
    if (isTaken(db.vendors, existing, (v) => v.name, input.name))
      return { name: "A vendor with this name already exists" };
    return null;
  },
  create: (input, user) => ({ id: newId("ven"), name: input.name.trim(), isActive: true, ...stampCreated(user) }),
  update: (item, input) => Object.assign(item, { name: input.name.trim() }),
});

/* ---------------- Checklist masters (vendor-side + PE-side share one shape) ---------------- */
type ChecklistInput = Pick<ChecklistItem, "actId" | "stateId" | "description" | "cadence">;

function checklistHandlers(path: string, collection: () => ChecklistItem[], idPrefix: string) {
  return crudHandlers<ChecklistItem, ChecklistInput, ChecklistItemView>({
    path,
    collection,
    readPermission: VIEW,
    writePermission: MANAGE,
    searchFields: ["description", "actShortName"],
    defaultSort: "actShortName,asc",
    softDelete: true,
    filter: (item, url) => {
      const actId = url.searchParams.get("actId");
      const stateId = url.searchParams.get("stateId"); // "NATIONAL" or a state id
      const cadence = url.searchParams.get("cadence");
      // Resolver (§7A Lock 2): items for these states OR national.
      const forStates = url.searchParams.get("forStates")?.split(",").filter(Boolean);
      if (forStates && item.stateId !== null && !forStates.includes(item.stateId)) return false;
      return (
        activeFilter(item, url) &&
        (!actId || item.actId === actId) &&
        (!cadence || item.cadence === cadence) &&
        (!stateId || (stateId === "NATIONAL" ? item.stateId === null : item.stateId === stateId))
      );
    },
    toView: (item) => ({
      ...item,
      actShortName: db.acts.find((a) => a.id === item.actId)?.shortName ?? "—",
      stateCode: item.stateId ? (db.states.find((s) => s.id === item.stateId)?.code ?? "—") : null,
    }),
    validate: (input) => {
      const errors: Record<string, string> = {};
      const act = db.acts.find((a) => a.id === input.actId);
      if (!act) errors.actId = "Select the Act this requirement belongs to";
      else if (!act.isActive) errors.actId = "This Act is inactive";
      if (input.stateId !== null && !db.states.some((s) => s.id === input.stateId))
        errors.stateId = "Select a state or National";
      if (!CADENCES.includes(input.cadence)) errors.cadence = "Select a cadence";
      if ((input.description?.trim().length ?? 0) < 10)
        errors.description = "Describe the requirement (at least 10 characters)";
      return Object.keys(errors).length ? errors : null;
    },
    create: (input, user) => ({
      id: newId(idPrefix),
      actId: input.actId,
      stateId: input.stateId,
      description: input.description.trim(),
      cadence: input.cadence,
      isActive: true,
      ...stampCreated(user),
    }),
    // Mutable master: existing AIRs keep their snapshots (§7A Lock 4).
    update: (item, input) =>
      Object.assign(item, {
        actId: input.actId,
        stateId: input.stateId,
        description: input.description.trim(),
        cadence: input.cadence,
      }),
  });
}

export const mastersHandlers = [
  ...stateHandlers,
  ...actHandlers,
  ...peHandlers,
  ...unitClosureHandlers, // before generic /pe-units/:id routes
  ...unitHandlers,
  ...vendorHandlers,
  ...checklistHandlers("/checklist-items", () => db.checklistItems, "ci"),
  ...checklistHandlers("/pe-checklist-items", () => db.peChecklistItems, "pci"),
];
