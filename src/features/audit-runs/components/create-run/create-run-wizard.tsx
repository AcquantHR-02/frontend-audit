"use client";

import { AlertTriangleIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetVendorUnitAssignmentsQuery } from "@/features/assignments";
import { useGetUnitsQuery, usePrincipalEmployerOptions, useVendorOptions } from "@/features/masters";
import { addDays, suggestWindows, validateRunDates, type RunDateErrors, type RunDates } from "@/lib/domain";
import { cn, formatDateRange } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { AuditType, TriggerOccasion } from "@/types/domain";
import { useCreateAuditRunMutation, usePreviewRunChecklistQuery } from "../../api/audit-runs.api";
import { PeriodicItemsStep, type PeriodMap } from "./periodic-items-step";

const STEPS = ["Scope", "Dates & windows", "Items", "Review"] as const;

interface Scope {
  auditType: AuditType;
  vendorId: string;
  peId: string;
  peUnitId: string;
  triggerOccasion: TriggerOccasion | "";
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
function previousMonth() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));
  return { activityPeriodStart: iso(start), activityPeriodEnd: iso(end) };
}
function previousQuarter() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(Date.UTC(now.getFullYear(), (q - 1) * 3, 1));
  const end = new Date(Date.UTC(now.getFullYear(), q * 3, 0));
  return { activityPeriodStart: iso(start), activityPeriodEnd: iso(end) };
}
const withSuggestions = (p: { activityPeriodStart: string; activityPeriodEnd: string }): RunDates => ({
  ...p,
  ...suggestWindows(p.activityPeriodEnd),
});

export function CreateRunWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [scope, setScope] = useState<Scope>({
    auditType: "VENDOR",
    vendorId: "",
    peId: "",
    peUnitId: "",
    triggerOccasion: "",
  });
  const [dates, setDates] = useState<RunDates>(() => withSuggestions(previousMonth()));
  const [dateErrors, setDateErrors] = useState<RunDateErrors>({});
  const [periods, setPeriods] = useState<PeriodMap>({});
  const [createRun, { isLoading: creating }] = useCreateAuditRunMutation();

  const vendorOptions = useVendorOptions();
  const peOptions = usePrincipalEmployerOptions();
  const vendorUnits = useGetVendorUnitAssignmentsQuery(
    { vendorId: scope.vendorId, status: "CURRENT", size: 200 },
    { skip: scope.auditType !== "VENDOR" || !scope.vendorId },
  );
  const peUnits = useGetUnitsQuery(
    { peId: scope.peId, status: "open", size: 200 },
    { skip: scope.auditType !== "PE" || !scope.peId },
  );
  const unitOptions =
    scope.auditType === "VENDOR"
      ? (vendorUnits.data?.content ?? []).map((a) => ({
          value: a.peUnitId,
          label: `${a.unitCode} · ${a.unitName} (${a.peName})`,
          peId: a.peId,
        }))
      : (peUnits.data?.content ?? []).map((u) => ({ value: u.id, label: `${u.code} · ${u.name}`, peId: u.peId }));
  const unitLabel = unitOptions.find((u) => u.value === scope.peUnitId)?.label ?? "—";
  const partyLabel =
    (scope.auditType === "VENDOR"
      ? vendorOptions.find((v) => v.value === scope.vendorId)
      : peOptions.find((p) => p.value === scope.peId)
    )?.label ?? "—";

  const runScope = {
    auditType: scope.auditType,
    vendorId: scope.auditType === "VENDOR" ? scope.vendorId : undefined,
    peId: scope.auditType === "PE" ? scope.peId : undefined,
    peUnitId: scope.peUnitId,
    activityPeriodStart: dates.activityPeriodStart,
    activityPeriodEnd: dates.activityPeriodEnd,
  };
  const preview = usePreviewRunChecklistQuery(runScope, { skip: step < 2 });
  const previewError = preview.error as ApiError | undefined;
  const items = preview.data?.items ?? [];
  const periodicAirs = Object.values(periods).reduce((n, list) => n + list.length, 0);
  const autoAirs = items.filter((i) => i.cadence !== "PERIODIC").length;

  const scopeValid =
    !!scope.peUnitId && (scope.auditType === "VENDOR" ? !!scope.vendorId : !!scope.peId && !!scope.triggerOccasion);

  function next() {
    if (step === 1) {
      const errors = validateRunDates(dates);
      setDateErrors(errors);
      if (Object.keys(errors).length) return;
      setPeriods({}); // periods depend on the activity period
    }
    setStep((s) => s + 1);
  }

  async function submit() {
    try {
      const run = await createRun({
        ...runScope,
        ...dates,
        triggerOccasion: scope.auditType === "PE" ? (scope.triggerOccasion as TriggerOccasion) : undefined,
        periodicItems: Object.entries(periods)
          .filter(([, list]) => list.length)
          .map(([checklistItemId, list]) => ({ checklistItemId, periods: list })),
      }).unwrap();
      toast.success(`Audit run ${run.code} created`, {
        description: `${run.score.assignedTotal} items · Window 1 opens ${run.window1Start}`,
      });
      router.push(`/audit-runs/${run.id}`);
    } catch (error) {
      toast.error((error as ApiError).message);
    }
  }

  const setDate = (key: keyof RunDates, value: string) => setDates((d) => ({ ...d, [key]: value }));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/audit-runs">
          <ArrowLeftIcon /> Audit runs
        </Link>
      </Button>
      <PageHeader
        title="New audit run"
        description="One run covers one audited party at one unit for one activity period."
      />

      <ol className="flex flex-wrap items-center gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
                i < step && "border-primary bg-primary text-primary-foreground",
                i === step && "border-primary text-primary",
                i > step && "text-muted-foreground",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? <CheckIcon className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("text-[13px]", i === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="space-y-6">
          {step === 0 && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["VENDOR", "Vendor audit", "Audit a contractor at one of the PE's units."],
                    ["PE", "PE audit", "Audit the Principal Employer itself (onboarding or ad hoc)."],
                  ] as const
                ).map(([value, title, text]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setScope({ auditType: value, vendorId: "", peId: "", peUnitId: "", triggerOccasion: "" })
                    }
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors hover:bg-accent/50",
                      scope.auditType === value && "border-primary bg-accent ring-1 ring-primary",
                    )}
                    aria-pressed={scope.auditType === value}
                  >
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="text-[13px] text-muted-foreground">{text}</div>
                  </button>
                ))}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {scope.auditType === "VENDOR" ? (
                  <PickField
                    label="Vendor"
                    value={scope.vendorId}
                    options={vendorOptions}
                    onChange={(v) => setScope((s) => ({ ...s, vendorId: v, peUnitId: "" }))}
                  />
                ) : (
                  <PickField
                    label="Principal Employer"
                    value={scope.peId}
                    options={peOptions}
                    onChange={(v) => setScope((s) => ({ ...s, peId: v, peUnitId: "" }))}
                  />
                )}
                <PickField
                  label="Unit"
                  value={scope.peUnitId}
                  options={unitOptions}
                  disabled={scope.auditType === "VENDOR" ? !scope.vendorId : !scope.peId}
                  placeholder={
                    scope.auditType === "VENDOR" ? "Units the vendor currently works at" : "Operational units"
                  }
                  onChange={(v) => setScope((s) => ({ ...s, peUnitId: v }))}
                />
                {scope.auditType === "PE" && (
                  <PickField
                    label="Reason"
                    value={scope.triggerOccasion}
                    options={[
                      { value: "ONBOARDING", label: "Onboarding health-check" },
                      { value: "AD_HOC", label: "Ad hoc (requested by the PE)" },
                    ]}
                    onChange={(v) => setScope((s) => ({ ...s, triggerOccasion: v as TriggerOccasion }))}
                  />
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-muted-foreground">Quick fill:</span>
                <Button variant="outline" size="sm" onClick={() => setDates(withSuggestions(previousMonth()))}>
                  Last month
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDates(withSuggestions(previousQuarter()))}>
                  Last quarter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDates((d) => ({ ...d, ...suggestWindows(d.activityPeriodEnd) }))}
                >
                  Re-suggest windows
                </Button>
              </div>
              <DateGroup title="Activity period" hint="The period being audited. Any length.">
                <DateField
                  label="From"
                  value={dates.activityPeriodStart}
                  error={dateErrors.activityPeriodStart}
                  onChange={(v) => setDate("activityPeriodStart", v)}
                />
                <DateField
                  label="To"
                  value={dates.activityPeriodEnd}
                  error={dateErrors.activityPeriodEnd}
                  onChange={(v) => setDate("activityPeriodEnd", v)}
                />
              </DateGroup>
              <DateGroup
                title="Execution window"
                hint="When the audit itself happens. Starts after the activity period ends."
              >
                <DateField
                  label="From"
                  value={dates.executionWindowStart}
                  min={dates.activityPeriodEnd}
                  error={dateErrors.executionWindowStart}
                  onChange={(v) => setDate("executionWindowStart", v)}
                />
                <DateField
                  label="To"
                  value={dates.executionWindowEnd}
                  error={dateErrors.executionWindowEnd}
                  onChange={(v) => setDate("executionWindowEnd", v)}
                />
              </DateGroup>
              <DateGroup title="Window 1" hint="The audited party uploads and edits evidence freely. Review follows.">
                <DateField
                  label="From"
                  value={dates.window1Start}
                  error={dateErrors.window1Start}
                  onChange={(v) => setDate("window1Start", v)}
                />
                <DateField
                  label="To"
                  value={dates.window1End}
                  error={dateErrors.window1End}
                  onChange={(v) => setDate("window1End", v)}
                />
              </DateGroup>
              <p className="text-xs text-muted-foreground">
                Window 2 isn&apos;t set now. It opens only if items are still pending or not complied after review.
              </p>
            </>
          )}

          {step === 2 &&
            (preview.isFetching ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : previewError ? (
              <Alert variant="destructive">
                <AlertTriangleIcon />
                <AlertTitle>This run can&apos;t be created yet</AlertTitle>
                <AlertDescription>
                  <p>{previewError.message}</p>
                  {(previewError.code === "ASSIGNMENT_NOT_FOUND" ||
                    previewError.code === "ASSIGNMENT_CHANGED_IN_PERIOD") && (
                    <Link
                      className="mt-1 inline-block font-medium underline"
                      href={
                        scope.auditType === "VENDOR"
                          ? `/assignments/vendor-checklists?vendor=${scope.vendorId}&unit=${scope.peUnitId}`
                          : `/assignments/pe-checklists?pe=${scope.peId}`
                      }
                    >
                      Open the checklist assignment
                    </Link>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <PeriodicItemsStep
                items={items}
                activityStart={dates.activityPeriodStart}
                activityEnd={dates.activityPeriodEnd}
                periods={periods}
                onChange={setPeriods}
              />
            ))}

          {step === 3 && (
            <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-[180px_minmax(0,1fr)]">
              <Summary label="Audit type">
                {scope.auditType === "VENDOR"
                  ? "Vendor audit"
                  : `PE audit · ${scope.triggerOccasion === "ONBOARDING" ? "Onboarding" : "Ad hoc"}`}
              </Summary>
              <Summary label={scope.auditType === "VENDOR" ? "Vendor" : "Principal Employer"}>{partyLabel}</Summary>
              <Summary label="Unit">{unitLabel}</Summary>
              <Summary label="Activity period">
                {formatDateRange(dates.activityPeriodStart, dates.activityPeriodEnd)}
              </Summary>
              <Summary label="Execution window">
                {formatDateRange(dates.executionWindowStart, dates.executionWindowEnd)}
              </Summary>
              <Summary label="Window 1">{formatDateRange(dates.window1Start, dates.window1End)}</Summary>
              <Summary label="Items">
                <b>{autoAirs + periodicAirs}</b> total: {autoAirs} automatic + {periodicAirs} periodic
              </Summary>
              <Summary label="After creation">
                The item list is locked for this run (no items added or removed later). Edit dates before Window 1
                opens.
              </Summary>
            </dl>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || creating}>
          <ArrowLeftIcon /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={next}
            disabled={(step === 0 && !scopeValid) || (step === 2 && (!!previewError || preview.isFetching))}
          >
            Next <ArrowRightIcon />
          </Button>
        ) : (
          <Button onClick={submit} disabled={creating}>
            {creating && <Loader2Icon className="animate-spin" />} Create audit run
          </Button>
        )}
      </div>
    </>
  );
}

function PickField({
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = `pick-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder ?? `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function DateGroup({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-[220px_repeat(2,minmax(0,200px))] sm:items-start">
      <legend className="sr-only">{title}</legend>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <FieldDescription>{hint}</FieldDescription>
      </div>
      {children}
    </fieldset>
  );
}

function DateField({
  label,
  value,
  onChange,
  error,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  min?: string;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel className="text-xs">{label}</FieldLabel>
      <Input
        type="date"
        value={value}
        min={min ? addDays(min, 0) : undefined}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

function Summary({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
