import { http, HttpResponse } from "msw";
import { can, Permission } from "@/lib/auth";
import { scorecardHref } from "@/lib/domain";
import { formatDateRange } from "@/lib/utils";
import { authenticate } from "../auth";
import { db } from "../db";
import { apiUrl, networkDelay } from "../utils";
import { toRunView, visibleTo } from "./audit-runs.handlers";
import { canSee } from "./findings.handlers";

const LIMIT = 5;

interface Hit {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/**
 * Global search across the records the caller may see: runs, findings, vendors, Principal
 * Employers and (admins) users. Case-insensitive "contains" on the visible labels.
 */
export const searchHandlers = [
  http.get(apiUrl("/search"), async ({ request }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    if (q.length < 2) return HttpResponse.json({ groups: [] });
    const match = (...fields: (string | null | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q));

    const runs: Hit[] = db.auditRuns
      .filter((r) => visibleTo(user, r))
      .map(toRunView)
      .filter((r) => match(r.code, r.partyName, r.unitCode, r.unitName, r.peName))
      .sort((a, b) => b.activityPeriodEnd.localeCompare(a.activityPeriodEnd))
      .slice(0, LIMIT)
      .map((r) => ({
        id: r.id,
        title: `${r.code} · ${r.partyName}`,
        subtitle: `${r.unitCode} ${r.unitName} · ${formatDateRange(r.activityPeriodStart, r.activityPeriodEnd)}`,
        href: `/audit-runs/${r.id}`,
      }));

    const findings: Hit[] = can(user, Permission.FINDINGS_VIEW)
      ? db.findings
          .filter((f) => canSee(user, f))
          .flatMap((f) => {
            const air = db.airs.find((a) => a.id === f.airId)!;
            const run = toRunView(db.auditRuns.find((r) => r.id === air.runId)!);
            return match(air.descriptionSnapshot, air.actNameSnapshot, run.partyName, run.code)
              ? [
                  {
                    id: f.id,
                    title: air.descriptionSnapshot,
                    subtitle: `${f.status === "OPEN" ? "Open" : "Resolved"} · ${run.partyName} · ${run.code}`,
                    href: `/findings/${f.id}`,
                  },
                ]
              : [];
          })
          .slice(0, LIMIT)
      : [];

    const auditor = can(user, Permission.MASTERS_VIEW);
    const vendors: Hit[] = db.vendors
      .filter((v) => (auditor || v.id === user.vendorId) && match(v.name))
      .slice(0, LIMIT)
      .map((v) => ({ id: v.id, title: v.name, subtitle: "Vendor scorecard", href: scorecardHref("VENDOR", v.id) }));

    const pes: Hit[] = db.principalEmployers
      .filter((p) => (auditor || p.id === user.peId) && match(p.name, p.legalName))
      .slice(0, LIMIT)
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.legalName,
        href: auditor ? `/masters/principal-employers/${p.id}` : scorecardHref("PE", p.id),
      }));

    const users: Hit[] = can(user, Permission.USERS_MANAGE)
      ? db.users
          .filter((u) => match(u.fullName, u.email))
          .slice(0, LIMIT)
          .map((u) => ({
            id: u.id,
            title: u.fullName,
            subtitle: u.email,
            href: `/admin/users?search=${encodeURIComponent(u.email)}`,
          }))
      : [];

    const groups = [
      { type: "runs", label: "Audit runs", items: runs },
      { type: "findings", label: "Findings", items: findings },
      { type: "vendors", label: "Vendors", items: vendors },
      { type: "pes", label: "Principal employers", items: pes },
      { type: "users", label: "Users", items: users },
    ].filter((g) => g.items.length > 0);
    return HttpResponse.json({ groups });
  }),
];
