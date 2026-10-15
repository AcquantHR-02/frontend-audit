"use client";

import { CircleCheckIcon, CircleSlashIcon, CircleXIcon, TriangleAlertIcon, XIcon, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { bulkStampBlocker, complianceMeta } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { AuditItemResult, ComplianceStatus } from "@/types/domain";
import { useBulkReviewMutation } from "../../api/audit-runs.api";
import { RemarkTemplates } from "./remark-templates";

const actions: { status: ComplianceStatus; icon: LucideIcon; className: string }[] = [
  { status: "COMPLIED", icon: CircleCheckIcon, className: "text-success" },
  { status: "NOT_APPLICABLE", icon: CircleSlashIcon, className: "text-muted-foreground" },
  { status: "NOT_COMPLIED", icon: CircleXIcon, className: "text-danger" },
];

/** Floating bar shown while items are selected: stamp them all with one status. */
export function BulkStampBar({
  runId,
  selected,
  onClear,
}: {
  runId: string;
  selected: AuditItemResult[];
  onClear: () => void;
}) {
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  if (selected.length === 0) return null;

  return (
    <>
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit max-w-[calc(100vw-2rem)] animate-in items-center gap-1 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg duration-200 fade-in-0 slide-in-from-bottom-4"
      >
        <span className="px-2.5 text-[13px] font-medium whitespace-nowrap tabular">{selected.length} selected</span>
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-6" />
        <span className="hidden px-1 text-xs text-muted-foreground sm:inline">Stamp as</span>
        {actions.map(({ status: value, icon: Icon, className }) => (
          <Button key={value} variant="ghost" size="sm" onClick={() => setStatus(value)}>
            <Icon className={className} aria-hidden />
            <span className="hidden sm:inline">{complianceMeta[value].label}</span>
            <span className="sr-only sm:hidden">{complianceMeta[value].label}</span>
          </Button>
        ))}
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-6" />
        <Button variant="ghost" size="icon" className="size-8" onClick={onClear} aria-label="Clear selection">
          <XIcon />
        </Button>
      </div>
      {status && (
        <BulkStampDialog
          runId={runId}
          items={selected}
          status={status}
          onClose={() => setStatus(null)}
          onDone={onClear}
        />
      )}
    </>
  );
}

function BulkStampDialog({
  runId,
  items,
  status,
  onClose,
  onDone,
}: {
  runId: string;
  items: AuditItemResult[];
  status: ComplianceStatus;
  onClose: () => void;
  onDone: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bulkReview, { isLoading }] = useBulkReviewMutation();

  // Mirrors the server rule so the auditor sees what will be skipped before confirming.
  const blocked = items.filter((air) => bulkStampBlocker(air, air.evidenceCount > 0));
  const eligible = items.length - blocked.length;
  const restamps = items.filter((air) => air.complianceStatus && air.complianceStatus !== status).length;
  const meta = complianceMeta[status];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!remarks.trim()) {
      setError("Audit remarks are required for every item");
      return;
    }
    try {
      const result = await bulkReview({
        runId,
        airIds: items.map((i) => i.id),
        complianceStatus: status,
        auditRemarks: remarks,
      }).unwrap();
      const n = result.stamped.length;
      const message = `Stamped ${n} item${n === 1 ? "" : "s"} ${meta.label.toLowerCase()}`;
      if (result.skipped.length) {
        toast.warning(message, {
          description: `${result.skipped.length} skipped: ${result.skipped[0].reason}`,
        });
      } else {
        toast.success(message);
      }
      onDone();
      onClose();
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Stamp ${items.length} item${items.length === 1 ? "" : "s"}`}
      description={
        <span className="flex flex-wrap items-center gap-1.5">
          Every selected item gets the same status and remarks: <StatusBadge meta={meta} />
        </span>
      }
      submitLabel={`Stamp ${eligible} item${eligible === 1 ? "" : "s"}`}
      isPending={isLoading}
      onSubmit={submit}
    >
      {(blocked.length > 0 || restamps > 0 || status === "NOT_COMPLIED") && (
        <ul className="space-y-1.5 rounded-lg border border-warning-border bg-warning-subtle px-3 py-2.5 text-[13px] text-warning">
          {blocked.length > 0 && (
            <li className="flex gap-2">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {blocked.length} one-time item{blocked.length === 1 ? " needs" : "s need"} a certificate valid-to date and
              will be skipped. Stamp {blocked.length === 1 ? "it" : "them"} one by one.
            </li>
          )}
          {restamps > 0 && (
            <li className="flex gap-2">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {restamps} item{restamps === 1 ? " is" : "s are"} already stamped differently and will be re-stamped.
            </li>
          )}
          {status === "NOT_COMPLIED" && (
            <li className="flex gap-2">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              Each not-complied item opens a finding when the run is published.
            </li>
          )}
        </ul>
      )}
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="bulk-remarks">Audit remarks</FieldLabel>
        <Textarea
          id="bulk-remarks"
          rows={3}
          autoFocus
          value={remarks}
          onChange={(e) => {
            setRemarks(e.target.value);
            setError(null);
          }}
          placeholder="What you verified and why this status."
        />
        <RemarkTemplates status={status} onPick={(text) => (setRemarks(text), setError(null))} />
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <details className="group text-[13px]">
        <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
          Show selected items
        </summary>
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
          {items.map((air) => (
            <li
              key={air.id}
              className={cn("flex gap-2", blocked.includes(air) && "text-muted-foreground line-through")}
            >
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{air.actNameSnapshot}</span>
              <span className="line-clamp-1">{air.descriptionSnapshot}</span>
            </li>
          ))}
        </ul>
      </details>
    </FormDialog>
  );
}
