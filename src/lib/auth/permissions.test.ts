import { describe, expect, it } from "vitest";
import type { Role } from "@/types/domain";
import { can, canAny, isAuditor, Permission } from "./permissions";

const as = (role: Role) => ({ role });

describe("permissions (spec §18)", () => {
  it("reserves irreversible / system-level actions for AUDITOR_ADMIN", () => {
    const adminOnly = [
      Permission.MASTERS_MANAGE,
      Permission.USERS_MANAGE,
      Permission.EVIDENCE_INVALIDATE,
      Permission.AUDIT_RUNS_EDIT_PUBLISHED,
    ];
    for (const permission of adminOnly) {
      expect(can(as("AUDITOR_ADMIN"), permission)).toBe(true);
      expect(can(as("AUDITOR_USER"), permission)).toBe(false);
      expect(can(as("VENDOR_USER"), permission)).toBe(false);
      expect(can(as("PE_USER"), permission)).toBe(false);
    }
  });

  it("lets AUDITOR_USER run the full audit lifecycle", () => {
    const lifecycle = [
      Permission.AUDIT_RUNS_CREATE,
      Permission.AUDIT_RUNS_REVIEW,
      Permission.AUDIT_RUNS_PUBLISH,
      Permission.ASSIGNMENTS_MANAGE,
      Permission.EVIDENCE_UPLOAD_AS_AUDITOR,
      Permission.FINDINGS_MANAGE,
    ];
    for (const permission of lifecycle) expect(can(as("AUDITOR_USER"), permission)).toBe(true);
  });

  it("never lets an audited party stamp, publish or manage findings", () => {
    for (const role of ["VENDOR_USER", "PE_USER"] as const) {
      expect(can(as(role), Permission.AUDIT_RUNS_REVIEW)).toBe(false);
      expect(can(as(role), Permission.AUDIT_RUNS_PUBLISH)).toBe(false);
      expect(can(as(role), Permission.FINDINGS_MANAGE)).toBe(false);
      expect(can(as(role), Permission.EVIDENCE_UPLOAD_AS_PARTY)).toBe(true);
      expect(can(as(role), Permission.FINDINGS_REMEDIATE)).toBe(true);
    }
  });

  it("denies everything to a signed-out user", () => {
    expect(can(null, Permission.DASHBOARD_VIEW)).toBe(false);
    expect(canAny(undefined, [Permission.DASHBOARD_VIEW])).toBe(false);
  });

  it("identifies auditor roles", () => {
    expect(isAuditor(as("AUDITOR_ADMIN"))).toBe(true);
    expect(isAuditor(as("AUDITOR_USER"))).toBe(true);
    expect(isAuditor(as("VENDOR_USER"))).toBe(false);
  });
});
