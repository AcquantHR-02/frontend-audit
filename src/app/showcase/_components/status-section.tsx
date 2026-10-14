import { StatusBadge } from "@/components/shared/status-badge";
import {
  cadenceMeta,
  complianceMeta,
  findingMeta,
  roleMeta,
  runPhaseMeta,
  submissionMeta,
  type StatusMeta,
} from "@/lib/domain";
import { SectionCard } from "./section-card";

const groups: { label: string; items: StatusMeta[]; mono?: boolean }[] = [
  { label: "Run phase", items: Object.values(runPhaseMeta) },
  { label: "Compliance (final)", items: Object.values(complianceMeta) },
  { label: "Submission", items: Object.values(submissionMeta) },
  { label: "Findings", items: Object.values(findingMeta) },
  { label: "Cadence", items: Object.values(cadenceMeta) },
  { label: "Roles", items: Object.values(roleMeta) },
];

export function StatusSection() {
  return (
    <SectionCard title="Status language" hint="Dot + text + colour — never colour alone">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
        {groups.map((group) => (
          <div key={group.label} className="contents">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{group.label}</dt>
            <dd className="flex flex-wrap gap-2">
              {group.items.map((meta) => (
                <StatusBadge key={meta.label} meta={meta} />
              ))}
            </dd>
          </div>
        ))}
        <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Party proposal</dt>
        <dd className="flex flex-wrap items-center gap-2">
          <StatusBadge draft mono tone="neutral" prefix="PROPOSED" label="NOT_APPLICABLE" />
          <StatusBadge draft mono tone="warning" label="PENDING" />
          <span className="text-xs text-muted-foreground">Dashed outline = not final until the auditor stamps it</span>
        </dd>
      </dl>
    </SectionCard>
  );
}
