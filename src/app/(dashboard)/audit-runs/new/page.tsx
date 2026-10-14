"use client";

import { Forbidden } from "@/components/shared/forbidden";
import { CreateRunWizard } from "@/features/audit-runs";
import { useCan } from "@/hooks/use-current-user";
import { Permission } from "@/lib/auth";

export default function NewAuditRunRoute() {
  // The route guard only checks AUDIT_RUNS_VIEW (shared with parties); creation needs more.
  return useCan(Permission.AUDIT_RUNS_CREATE) ? <CreateRunWizard /> : <Forbidden />;
}
