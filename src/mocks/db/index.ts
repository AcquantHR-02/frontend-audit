/**
 * In-browser mock database. MSW handlers run on the main thread, so the DB can
 * persist to localStorage — mutations survive reloads, like a real backend.
 * Bump DB_VERSION whenever the seed shape changes to discard stale data.
 */
import type { AuditItemResult, AuditRun, EvidenceRecord } from "@/types/domain";
import * as seed from "./seed";

const STORAGE_KEY = "ams.mock-db";
const DB_VERSION = 5;

function createSeedDb() {
  return {
    version: DB_VERSION,
    states: structuredClone(seed.states),
    acts: structuredClone(seed.acts),
    principalEmployers: structuredClone(seed.principalEmployers),
    peUnits: structuredClone(seed.peUnits),
    vendors: structuredClone(seed.vendors),
    vendorUnitAssignments: structuredClone(seed.vendorUnitAssignments),
    checklistItems: structuredClone(seed.checklistItems),
    peChecklistItems: structuredClone(seed.peChecklistItems),
    vendorChecklistAssignments: structuredClone(seed.vendorChecklistAssignments),
    peChecklistAssignments: structuredClone(seed.peChecklistAssignments),
    auditRuns: [] as AuditRun[],
    airs: [] as AuditItemResult[],
    evidence: [] as EvidenceRecord[],
    users: structuredClone(seed.users),
    /** Plain-text only because this is a mock; the real backend stores hashes. */
    passwords: Object.fromEntries(seed.users.map((u) => [u.id, seed.MOCK_PASSWORD])) as Record<string, string>,
    failedLogins: {} as Record<string, number>,
    /** Stands in for the backend's httpOnly refresh cookie. */
    refreshSession: null as { userId: string } | null,
  };
}

export type MockDb = ReturnType<typeof createSeedDb>;

function load(): MockDb {
  if (typeof window === "undefined") return createSeedDb();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === DB_VERSION) return parsed;
    }
  } catch {
    // Corrupt or blocked storage: fall back to a fresh seed.
  }
  return createSeedDb();
}

export const db: MockDb = load();

/** Call after every mutation. */
export function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage full or blocked — data stays in memory for this session.
  }
}

/** Restore the seed (exposed in the UI as "Reset demo data"). */
export function resetDb() {
  Object.assign(db, createSeedDb());
  persist();
}

export { MOCK_PASSWORD } from "./seed";
