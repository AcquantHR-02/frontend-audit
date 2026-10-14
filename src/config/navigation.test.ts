import { describe, expect, it } from "vitest";
import { can } from "@/lib/auth";
import type { Role } from "@/types/domain";
import { allNavItems, findNavItem } from "./navigation";

const visibleTitles = (role: Role) => allNavItems.filter((item) => can({ role }, item.permission)).map((i) => i.title);

describe("navigation", () => {
  it("resolves nested paths to their section (longest prefix)", () => {
    expect(findNavItem("/audit-runs/abc-123")?.item.title).toBe("Audit runs");
    expect(findNavItem("/masters/checklists/pe")?.item.title).toBe("PE checklist master");
    expect(findNavItem("/audit-runsX")).toBeNull();
  });

  it("shows audited parties only their workspace", () => {
    expect(visibleTitles("VENDOR_USER")).toEqual(["Overview", "Audit runs", "Findings", "Reports"]);
    expect(visibleTitles("PE_USER")).toEqual(["Overview", "Audit runs", "Findings", "Reports"]);
  });

  it("hides administration from AUDITOR_USER but not AUDITOR_ADMIN", () => {
    expect(visibleTitles("AUDITOR_USER")).not.toContain("Users & access");
    expect(visibleTitles("AUDITOR_USER")).toContain("Vendor checklists");
    expect(visibleTitles("AUDITOR_ADMIN")).toContain("Users & access");
  });
});
