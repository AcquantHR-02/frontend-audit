"use client";

import { DownloadIcon, FileTextIcon, Loader2Icon, LockIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCan } from "@/hooks/use-current-user";
import { Permission } from "@/lib/auth";
import {
  cadenceMeta,
  canAuditorStamp,
  canAuditorUpload,
  canPartyUpload,
  complianceMeta,
  needsValidTo,
  submissionMeta,
} from "@/lib/domain";
import { cn, formatDate, formatDateRange, formatDateTime } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { AuditItemResult, AuditRunView, ComplianceStatus } from "@/types/domain";
import { useGetAirEvidenceQuery, useReviewAirMutation } from "../../api/audit-runs.api";
import { EvidenceUploadForm } from "./evidence-upload-form";

const stampOptions: { value: ComplianceStatus; hint: string }[] = [
  { value: "COMPLIED", hint: "Requirement met for this period." },
  { value: "NOT_APPLICABLE", hint: "Doesn't fire this period. Explain why in remarks." },
  { value: "NOT_COMPLIED", hint: "Deficiency. Opens a finding when the run is published." },
];

export function AirDrawer({
  run,
  air,
  isParty,
  onClose,
}: {
  run: AuditRunView;
  air: AuditItemResult | null;
  isParty: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!air} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {air && <AirDrawerBody key={air.id} run={run} air={air} isParty={isParty} />}
      </SheetContent>
    </Sheet>
  );
}

function AirDrawerBody({ run, air, isParty }: { run: AuditRunView; air: AuditItemResult; isParty: boolean }) {
  const canReview = useCan(Permission.AUDIT_RUNS_REVIEW);
  const canUploadAsAuditor = useCan(Permission.EVIDENCE_UPLOAD_AS_AUDITOR);
  const { data: evidence, isLoading } = useGetAirEvidenceQuery(air.id);
  const remarksLabel = run.auditType === "VENDOR" ? "Vendor remarks" : "PE remarks";
  const partyMayUpload = isParty && canPartyUpload(run.phase, air);
  const naProposed = evidence?.[0]?.naProposedByParty;

  return (
    <>
      <SheetHeader className="border-b p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-muted-foreground">{air.actNameSnapshot}</span>
          <StatusBadge meta={cadenceMeta[air.cadenceSnapshot]} dot={false} />
          {air.complianceStatus ? (
            <StatusBadge meta={complianceMeta[air.complianceStatus]} />
          ) : (
            <StatusBadge meta={submissionMeta[air.submissionStatus]} draft />
          )}
          {air.isCarriedForward && <StatusBadge tone="violet" label="Carried forward" dot={false} />}
        </div>
        <SheetTitle className="text-base leading-snug">{air.descriptionSnapshot}</SheetTitle>
        <SheetDescription>
          {air.periodStart ? `Period ${formatDateRange(air.periodStart, air.periodEnd)}` : "Whole activity period"}
          {air.dueDate && ` · due ${formatDate(air.dueDate)}`}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Evidence</h3>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !evidence?.length ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-[13px] text-muted-foreground">
              No evidence yet. {!isParty && "The auditor can still stamp this item directly after an offline check."}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {evidence.map((record) => (
                <li key={record.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{record.uploadedByName}</span>·
                    <span>{formatDateTime(record.uploadedAt)}</span>
                    {record.naProposedByParty && (
                      <StatusBadge draft mono tone="neutral" prefix="PROPOSED" label="NOT_APPLICABLE" />
                    )}
                    {record.partyRemarks === null && !record.carriedForwardAt && (
                      <StatusBadge tone="info" label="Auditor upload" dot={false} />
                    )}
                    {record.carriedForwardAt && <StatusBadge tone="violet" label="From earlier run" dot={false} />}
                    {record.validTo && <span>· valid to {formatDate(record.validTo)}</span>}
                  </div>
                  {record.partyRemarks && <p className="text-[13px]">{record.partyRemarks}</p>}
                  {record.files.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {record.files.map((file) => (
                        <li key={file.id}>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs hover:bg-accent"
                          >
                            <FileTextIcon className="size-3.5" aria-hidden />
                            {file.fileName}
                            <DownloadIcon className="size-3 text-muted-foreground" aria-hidden />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {isParty && (
          <section className="space-y-3">
            <Separator />
            {partyMayUpload ? (
              <>
                <h3 className="text-sm font-semibold">
                  {evidence?.length ? "Add or replace evidence" : "Submit evidence"}
                </h3>
                <EvidenceUploadForm airId={air.id} runId={run.id} uploader="PARTY" remarksLabel={remarksLabel} />
              </>
            ) : (
              <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <LockIcon className="size-4" aria-hidden />
                {run.phase === "PUBLISHED"
                  ? "This run is published. Remediation goes on the finding."
                  : run.phase === "WINDOW_2"
                    ? "This item is already accepted, so it stays read-only."
                    : "Uploads are closed while the auditor reviews."}
              </p>
            )}
          </section>
        )}

        {!isParty && canUploadAsAuditor && canAuditorUpload(run.phase) && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                Upload on the party&apos;s behalf
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <EvidenceUploadForm airId={air.id} runId={run.id} uploader="AUDITOR" remarksLabel={remarksLabel} />
            </CollapsibleContent>
          </Collapsible>
        )}

        {!isParty && canReview && (
          <ReviewForm run={run} air={air} hasEvidence={!!evidence?.length} naProposed={!!naProposed} />
        )}
      </div>
    </>
  );
}

function ReviewForm({
  run,
  air,
  hasEvidence,
  naProposed,
}: {
  run: AuditRunView;
  air: AuditItemResult;
  hasEvidence: boolean;
  naProposed: boolean;
}) {
  const [status, setStatus] = useState<ComplianceStatus | "">(air.complianceStatus ?? "");
  const [remarks, setRemarks] = useState(air.auditRemarks ?? "");
  const [validTo, setValidTo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, { isLoading }] = useReviewAirMutation();
  const open = canAuditorStamp(run.phase);
  const askValidTo = needsValidTo(air.cadenceSnapshot, hasEvidence);

  async function save() {
    const next: Record<string, string> = {};
    if (!status) next.complianceStatus = "Select a status";
    if (!remarks.trim()) next.auditRemarks = "Audit remarks are required for every item";
    if (askValidTo && !validTo) next.validTo = "Enter the certificate's valid-to date";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await review({
        airId: air.id,
        runId: run.id,
        complianceStatus: status as ComplianceStatus,
        auditRemarks: remarks,
        validTo: validTo || null,
      }).unwrap();
      toast.success(`Stamped ${complianceMeta[status as ComplianceStatus].label.toLowerCase()}`);
    } catch (e) {
      const apiError = e as ApiError;
      setErrors(apiError.fieldErrors ?? { form: apiError.message });
    }
  }

  return (
    <section className="space-y-4">
      <Separator />
      <div>
        <h3 className="text-sm font-semibold">Auditor review</h3>
        {!open && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            {run.phase === "PUBLISHED" ? "Published. Status is final." : "Stamping opens when review starts."}
          </p>
        )}
        {naProposed && open && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            The party proposed this item as not applicable. Your stamp decides the final status.
          </p>
        )}
      </div>
      <fieldset disabled={!open} className="space-y-4 disabled:opacity-60">
        <RadioGroup
          value={status}
          onValueChange={(v) => setStatus(v as ComplianceStatus)}
          className="gap-2"
          aria-label="Compliance status"
        >
          {stampOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-accent/40",
                status === option.value && "border-primary bg-accent",
              )}
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <StatusBadge meta={complianceMeta[option.value]} className="w-fit" />
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {errors.complianceStatus && <FieldError>{errors.complianceStatus}</FieldError>}
        {askValidTo && (
          <Field data-invalid={!!errors.validTo}>
            <FieldLabel htmlFor={`valid-${air.id}`}>Certificate valid to</FieldLabel>
            <Input
              id={`valid-${air.id}`}
              type="date"
              className="w-44"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
            />
            {errors.validTo && <FieldError>{errors.validTo}</FieldError>}
          </Field>
        )}
        <Field data-invalid={!!errors.auditRemarks}>
          <FieldLabel htmlFor={`audit-remarks-${air.id}`}>Audit remarks</FieldLabel>
          <Textarea
            id={`audit-remarks-${air.id}`}
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={
              hasEvidence
                ? "What you verified and why this status."
                : "Offline verification: what you checked, where and when."
            }
          />
          {errors.auditRemarks && <FieldError>{errors.auditRemarks}</FieldError>}
        </Field>
        {errors.form && <FieldError>{errors.form}</FieldError>}
        <Button onClick={save} disabled={isLoading || !open} className="w-full">
          {isLoading && <Loader2Icon className="animate-spin" />}
          {air.complianceStatus ? "Update stamp" : "Save stamp"}
        </Button>
      </fieldset>
    </section>
  );
}
