"use client";

import { ChevronDownIcon, ChevronUpIcon, DownloadIcon, FileTextIcon, Loader2Icon, LockIcon } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { RemarkTemplates } from "./remark-templates";

const stampOptions: { value: ComplianceStatus; hint: string; key: string }[] = [
  { value: "COMPLIED", hint: "Requirement met for this period.", key: "C" },
  { value: "NOT_APPLICABLE", hint: "Doesn't fire this period. Explain why in remarks.", key: "A" },
  { value: "NOT_COMPLIED", hint: "Deficiency. Opens a finding when the run is published.", key: "N" },
];

/** Position of the open item in the list it was opened from; drives prev/next. */
export interface DrawerNav {
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
}

/** True when a key press belongs to a text field and must not trigger shortcuts. */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-grid h-5 min-w-5 place-items-center rounded border border-b-2 bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function AirDrawer({
  run,
  air,
  isParty,
  nav,
  onClose,
}: {
  run: AuditRunView;
  air: AuditItemResult | null;
  isParty: boolean;
  nav?: DrawerNav;
  onClose: () => void;
}) {
  // J / K move through the list. Ignored while typing, and for key events that bubble
  // through React portals from dialogs opened above the drawer.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.target as Node) || isTyping(event.target)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "j" && nav?.onNext) nav.onNext();
    else if (event.key === "k" && nav?.onPrev) nav.onPrev();
    else return;
    event.preventDefault();
  }

  return (
    <Sheet open={!!air} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full gap-0 overflow-y-auto p-0 outline-none sm:max-w-xl"
        onKeyDown={onKeyDown}
        // Focus the panel, not its first button: shortcuts work at once and no tooltip pops open.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        {air && <AirDrawerBody key={air.id} run={run} air={air} isParty={isParty} nav={nav} />}
      </SheetContent>
    </Sheet>
  );
}

function NavButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={!onClick}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label} <Kbd>{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

function AirDrawerBody({
  run,
  air,
  isParty,
  nav,
}: {
  run: AuditRunView;
  air: AuditItemResult;
  isParty: boolean;
  nav?: DrawerNav;
}) {
  const canReview = useCan(Permission.AUDIT_RUNS_REVIEW);
  const canUploadAsAuditor = useCan(Permission.EVIDENCE_UPLOAD_AS_AUDITOR);
  const { data: evidence, isLoading } = useGetAirEvidenceQuery(air.id);
  const remarksLabel = run.auditType === "VENDOR" ? "Vendor remarks" : "PE remarks";
  const partyMayUpload = isParty && canPartyUpload(run.phase, air);
  const naProposed = evidence?.[0]?.naProposedByParty;
  const stamping = !isParty && canReview && canAuditorStamp(run.phase);

  return (
    <>
      <SheetHeader className="border-b p-5">
        {nav && nav.total > 1 && (
          <div className="-mt-1 mb-1 flex items-center gap-1.5 pr-8">
            <NavButton label="Previous item" shortcut="K" onClick={nav.onPrev}>
              <ChevronUpIcon />
            </NavButton>
            <NavButton label="Next item" shortcut="J" onClick={nav.onNext}>
              <ChevronDownIcon />
            </NavButton>
            <span className="ml-1 text-xs text-muted-foreground tabular">
              Item {nav.index + 1} of {nav.total}
            </span>
          </div>
        )}
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

      <div className="flex-1 space-y-6 p-5">
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
          <ReviewForm
            run={run}
            air={air}
            hasEvidence={!!evidence?.length}
            naProposed={!!naProposed}
            onNext={nav?.onNext}
          />
        )}
      </div>

      {stamping && (
        <footer className="sticky bottom-0 hidden flex-wrap items-center gap-x-4 gap-y-1.5 border-t bg-muted/80 px-5 py-2.5 text-[11px] text-muted-foreground backdrop-blur sm:flex">
          <span className="flex items-center gap-1">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd> next / previous
          </span>
          <span className="flex items-center gap-1">
            <Kbd>C</Kbd>
            <Kbd>A</Kbd>
            <Kbd>N</Kbd> status
          </span>
          <span className="flex items-center gap-1">
            <Kbd>R</Kbd> remarks
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd> save{nav?.onNext ? " & next" : ""}
          </span>
        </footer>
      )}
    </>
  );
}

function ReviewForm({
  run,
  air,
  hasEvidence,
  naProposed,
  onNext,
}: {
  run: AuditRunView;
  air: AuditItemResult;
  hasEvidence: boolean;
  naProposed: boolean;
  /** Present when there's a next item: enables "Save & next". */
  onNext?: () => void;
}) {
  const [status, setStatus] = useState<ComplianceStatus | "">(air.complianceStatus ?? "");
  const [remarks, setRemarks] = useState(air.auditRemarks ?? "");
  const [validTo, setValidTo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, { isLoading }] = useReviewAirMutation();
  const open = canAuditorStamp(run.phase);
  const askValidTo = needsValidTo(air.cadenceSnapshot, hasEvidence);
  const sectionRef = useRef<HTMLElement>(null);
  const remarksRef = useRef<HTMLTextAreaElement>(null);

  async function save(andNext = false) {
    const next: Record<string, string> = {};
    if (!status) next.complianceStatus = "Select a status";
    if (!remarks.trim()) next.auditRemarks = "Audit remarks are required for every item";
    if (askValidTo && !validTo) next.validTo = "Enter the certificate's valid-to date";
    setErrors(next);
    if (Object.keys(next).length) {
      if (next.auditRemarks && !next.complianceStatus) remarksRef.current?.focus();
      return;
    }
    try {
      await review({
        airId: air.id,
        runId: run.id,
        complianceStatus: status as ComplianceStatus,
        auditRemarks: remarks,
        validTo: validTo || null,
      }).unwrap();
      toast.success(`Stamped ${complianceMeta[status as ComplianceStatus].label.toLowerCase()}`);
      if (andNext) onNext?.();
    } catch (e) {
      const apiError = e as ApiError;
      setErrors(apiError.fieldErrors ?? { form: apiError.message });
    }
  }

  // C / A / N pick a status, R jumps to remarks, Ctrl/⌘+Enter saves (and moves on).
  useDrawerKeys(sectionRef, (event) => {
    if (!open || isLoading) return false;
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      void save(!!onNext);
      return true;
    }
    if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return false;
    const option = stampOptions.find((o) => o.key.toLowerCase() === event.key.toLowerCase());
    if (option) {
      setStatus(option.value);
      setErrors((current) => ({ ...current, complianceStatus: "" }));
      return true;
    }
    if (event.key.toLowerCase() === "r") {
      remarksRef.current?.focus();
      return true;
    }
    return false;
  });

  return (
    <section ref={sectionRef} className="space-y-4">
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
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40",
                status === option.value && "border-primary bg-accent",
              )}
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <span className="flex flex-1 flex-col gap-0.5">
                <StatusBadge meta={complianceMeta[option.value]} className="w-fit" />
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </span>
              {open && (
                <span className="hidden sm:block">
                  <Kbd>{option.key}</Kbd>
                </span>
              )}
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
            ref={remarksRef}
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
          {open && <RemarkTemplates status={status} onPick={setRemarks} />}
          {errors.auditRemarks && <FieldError>{errors.auditRemarks}</FieldError>}
        </Field>
        {errors.form && <FieldError>{errors.form}</FieldError>}
        <div className="flex gap-2">
          <Button
            onClick={() => void save()}
            disabled={isLoading || !open}
            variant={onNext ? "outline" : "default"}
            className="flex-1"
          >
            {isLoading && !onNext && <Loader2Icon className="animate-spin" />}
            {air.complianceStatus ? "Update stamp" : "Save stamp"}
          </Button>
          {onNext && (
            <Button onClick={() => void save(true)} disabled={isLoading || !open} className="flex-1">
              {isLoading && <Loader2Icon className="animate-spin" />}
              Save &amp; next
            </Button>
          )}
        </div>
      </fieldset>
    </section>
  );
}

/**
 * Keyboard handler scoped to the drawer that contains `scope`. Listens on the document because
 * focus may sit on the sheet itself, and ignores keys from dialogs opened above it.
 * The handler returns true when it used the key.
 */
function useDrawerKeys(scope: RefObject<HTMLElement | null>, handler: (event: globalThis.KeyboardEvent) => boolean) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      const drawer = scope.current?.closest("[role=dialog]");
      if (!drawer || event.defaultPrevented) return;
      if (!(event.target instanceof Node) || !drawer.contains(event.target)) return;
      if (latest.current(event)) event.preventDefault();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [scope]);
}
