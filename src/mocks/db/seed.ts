/**
 * Seed data for the mock backend, modelled on spec V6 §3 / §5.1 (Veero Metals, Karnataka).
 * Vendor and unit names follow the spec; checklist descriptions are representative
 * placeholders matching the spec's per-Act item counts (35 KA items across 14 Acts).
 */
import type {
  Act,
  AuditColumns,
  Cadence,
  ChecklistItem,
  PEChecklistItem,
  PEUnit,
  PrincipalEmployer,
  Role,
  State,
  User,
  Vendor,
  VendorUnitAssignment,
} from "@/types/domain";

const SEEDED_AT = "2026-04-01T09:00:00Z";
const SYSTEM = "usr-admin";

const audit = (): AuditColumns => ({
  createdAt: SEEDED_AT,
  createdBy: SYSTEM,
  updatedAt: SEEDED_AT,
  updatedBy: SYSTEM,
});

/** Demo password for every seeded account (mock only). */
export const MOCK_PASSWORD = "Password@123";

export const states: State[] = [
  { id: "st-ka", code: "KA", name: "Karnataka", ...audit() },
  { id: "st-tn", code: "TN", name: "Tamil Nadu", ...audit() },
  { id: "st-mh", code: "MH", name: "Maharashtra", ...audit() },
  { id: "st-tg", code: "TG", name: "Telangana", ...audit() },
];

export const principalEmployers: PrincipalEmployer[] = [
  { id: "pe-veero", name: "Veero Metals", legalName: "Veero O Metals Private Limited", isActive: true, ...audit() },
];

const unitSeed: [code: string, name: string][] = [
  ["JIG", "Jigani"],
  ["MKL", "Makali"],
  ["NAG", "Nagasandra"],
  ["HRH", "Harohalli"],
  ["BDD", "Bidadi"],
  ["HSK", "Hoskote"],
  ["DBP", "Doddaballapur"],
  ["NLM", "Nelamangala"],
  ["PNY", "Peenya"],
  ["ATB", "Attibele"],
];

export const peUnits: PEUnit[] = unitSeed.map(([code, name]) => ({
  id: `unit-${code.toLowerCase()}`,
  peId: "pe-veero",
  stateId: "st-ka",
  code: `VOM-${code}`,
  name,
  closedAt: null,
  closedBy: null,
  ...audit(),
}));

const vendorNames = [
  "Bellfast",
  "Janani Water",
  "Meraqui",
  "Rathna",
  "Manpro",
  "Uniq",
  "ASA",
  "Shashi",
  "S S Enterprises",
  "Coll-Eff",
  "Yashas",
  "KPS",
  "SRF",
  "Avashya",
  "Earthtree",
  "AKSHU",
  "Friendly",
  "Arun HR",
  "Ecological Solutions",
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const vendors: Vendor[] = vendorNames.map((name) => ({
  id: `ven-${slug(name)}`,
  name,
  isActive: true,
  ...audit(),
}));

/** §3 — Rathna at 10 units, Manpro at 8, Bellfast at 1 (Harohalli); others at 1–3. */
const vendorUnitPlan: Record<string, number | string[]> = {
  rathna: 10,
  manpro: 8,
  bellfast: ["unit-hrh"],
};

export const vendorUnitAssignments: VendorUnitAssignment[] = vendors.flatMap((vendor, index) => {
  const key = vendor.id.replace("ven-", "");
  const plan = vendorUnitPlan[key] ?? (index % 3) + 1;
  const unitIds = Array.isArray(plan)
    ? plan
    : Array.from({ length: plan }, (_, i) => peUnits[(index + i) % peUnits.length].id);
  return unitIds.map((peUnitId) => ({
    id: `vua-${key}-${peUnitId}`,
    vendorId: vendor.id,
    peUnitId,
    effectiveFrom: "2026-04-01",
    effectiveTo: null,
    ...audit(),
  }));
});

/** §5.1 — the 14 Acts in the KA master, with item counts. */
const actSeed: [id: string, shortName: string, name: string, category: string][] = [
  ["clra", "CLRA", "Contract Labour (Regulation & Abolition) Act, 1970", "Labour"],
  ["esic", "ESIC", "Employees' State Insurance Act, 1948", "Social Security"],
  ["epf", "EPF", "Employees' Provident Funds & Misc. Provisions Act, 1952", "Social Security"],
  ["ptka", "PT-KA", "Karnataka Tax on Professions, Trades, Callings & Employments Act, 1976", "Tax"],
  ["fact", "Factories", "Factories Act, 1948", "Safety"],
  ["grat", "Gratuity", "Payment of Gratuity Act, 1972", "Wages & Benefits"],
  ["ec", "EC", "Employees' Compensation Act, 1923", "Social Security"],
  ["mat", "Maternity", "Maternity Benefit Act, 1961", "Wages & Benefits"],
  ["kase", "KA S&E", "Karnataka Shops & Commercial Establishments Act, 1961", "Labour"],
  ["comp", "Companies", "Companies Act, 2013", "Corporate"],
  ["psa", "PSA", "Payment of Subsistence Allowance Act", "Wages & Benefits"],
  ["pow", "POW", "Payment of Wages Act, 1936", "Wages & Benefits"],
  ["er", "ER", "Equal Remuneration Act, 1976", "Wages & Benefits"],
  ["bonus", "Bonus", "Payment of Bonus Act, 1965", "Wages & Benefits"],
];

export const acts: Act[] = actSeed.map(([id, shortName, name, category]) => ({
  id: `act-${id}`,
  name,
  shortName,
  category,
  isActive: true,
  ...audit(),
}));

const L: Cadence = "LIFETIME";
const O: Cadence = "ONE_TIME";
const P: Cadence = "PERIODIC";

/** 35 items — counts per Act match spec §5.1 (CLRA 8, ESIC 5, EPF 3, PT-KA 3, …). */
const checklistSeed: [act: string, cadence: Cadence, description: string, national?: boolean][] = [
  ["clra", O, "Contractor licence under CLRA (Form VI) valid for the unit"],
  ["clra", P, "Register of workmen employed by contractor (Form XIII)"],
  ["clra", P, "Muster roll maintained (Form XVI)"],
  ["clra", P, "Register of wages (Form XVII)"],
  ["clra", P, "Wage slips issued to workmen (Form XIX)"],
  ["clra", P, "Employment card issued to each workman (Form XIV)"],
  ["clra", P, "Half-yearly return filed by contractor (Form XXIV)"],
  ["clra", P, "Register of deductions, fines and advances"],
  ["esic", L, "ESIC registration / employer code", true],
  ["esic", P, "Monthly ESIC contribution challan paid by due date", true],
  ["esic", P, "ESIC monthly contribution return / ECR", true],
  ["esic", P, "ESIC e-Pehchan cards issued to new joiners", true],
  ["esic", P, "Accident report (Form 12) filed where applicable", true],
  ["epf", L, "EPF establishment code allotment", true],
  ["epf", P, "Monthly EPF ECR filed and challan paid", true],
  ["epf", P, "UAN generated and linked for all eligible employees", true],
  ["ptka", L, "Professional Tax enrolment certificate"],
  ["ptka", L, "Professional Tax registration certificate"],
  ["ptka", P, "Monthly PT return filed and tax remitted"],
  ["fact", P, "Register of adult workers (Form 12)"],
  ["fact", P, "Annual return under Factories Act"],
  ["grat", L, "Notice of opening under Gratuity Act", true],
  ["grat", P, "Gratuity nominations (Form F) on record", true],
  ["ec", O, "Employees' Compensation insurance policy in force", true],
  ["ec", P, "Accident notices / reports where applicable", true],
  ["mat", P, "Maternity benefit register maintained", true],
  ["mat", P, "Abstract of the Act displayed", true],
  ["kase", O, "Shops & Establishments registration certificate"],
  ["kase", P, "Annual return under KA S&E Act"],
  ["comp", L, "Certificate of incorporation / partnership deed", true],
  ["psa", P, "Subsistence allowance paid during suspension, where applicable"],
  ["pow", P, "Wages paid within the statutory due date", true],
  ["er", P, "Equal remuneration register maintained", true],
  ["bonus", P, "Annual bonus paid and Form C register maintained", true],
  ["epf", P, "EPF annual return filed", true],
];

export const checklistItems: ChecklistItem[] = checklistSeed.map(([act, cadence, description, national], i) => ({
  id: `ci-${String(i + 1).padStart(3, "0")}`,
  actId: `act-${act}`,
  stateId: national ? null : "st-ka",
  description,
  cadence,
  isActive: true,
  ...audit(),
}));

const user = (
  id: string,
  fullName: string,
  email: string,
  role: Role,
  scope: { vendorId?: string; peId?: string } = {},
): User => ({
  id,
  fullName,
  email,
  role,
  vendorId: scope.vendorId ?? null,
  peId: scope.peId ?? null,
  isActive: true,
  mustChangePassword: false,
  isLocked: false,
  ...audit(),
});

/** One demo account per role (§18). Password for all: MOCK_PASSWORD. */
export const users: User[] = [
  user("usr-admin", "Anita Rao", "admin@acquanthr.test", "AUDITOR_ADMIN"),
  user("usr-auditor", "Karthik Menon", "auditor@acquanthr.test", "AUDITOR_USER"),
  user("usr-vendor", "Suresh Kumar", "vendor@rathna.test", "VENDOR_USER", { vendorId: "ven-rathna" }),
  user("usr-pe", "Priya Shetty", "pe@veerometals.test", "PE_USER", { peId: "pe-veero" }),
  // Demonstrates the forced password change on first login (§18).
  { ...user("usr-new", "Neha Joshi", "newuser@acquanthr.test", "AUDITOR_USER"), mustChangePassword: true },
];

/** §19 — PE-side master: the PE's own statutory obligations (mostly company-wide, so mostly NATIONAL). */
const peChecklistSeed: [act: string, cadence: Cadence, description: string, national?: boolean][] = [
  ["clra", O, "Principal Employer registration certificate under CLRA (Form II)"],
  ["clra", P, "Register of contractors maintained (Form XII)"],
  ["clra", P, "Annual return by Principal Employer (Form XXV)"],
  ["fact", O, "Factory licence valid for the unit"],
  ["fact", P, "Half-yearly / annual returns under Factories Act"],
  ["fact", P, "Accident register and notices maintained"],
  ["esic", L, "ESIC employer registration", true],
  ["esic", P, "Verification of contractors' ESIC remittances", true],
  ["epf", L, "EPF establishment registration", true],
  ["epf", P, "Verification of contractors' EPF remittances", true],
  ["kase", O, "Shops & Establishments registration (offices)"],
  ["ptka", L, "Professional Tax employer registration"],
  ["bonus", P, "Annual return under Payment of Bonus Act (Form D)", true],
  ["mat", P, "Maternity benefit returns where applicable", true],
];

export const peChecklistItems: PEChecklistItem[] = peChecklistSeed.map(([act, cadence, description, national], i) => ({
  id: `pci-${String(i + 1).padStart(3, "0")}`,
  actId: `act-${act}`,
  stateId: national ? null : "st-ka",
  description,
  cadence,
  isActive: true,
  ...audit(),
}));
