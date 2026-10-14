"use client";

import { AlertTriangleIcon, CheckCircle2Icon, FileWarningIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/shared/kpi-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatScore } from "@/lib/domain";
import { SectionCard } from "./section-card";

export function ComponentsSection() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total audit runs" value="148" hint="1 PE · 10 units" />
        <KpiCard label="In progress" value="37" hint="Windows open" />
        <KpiCard label="Pending review" value="9" tone="warning" hint="Awaiting auditor" />
        <KpiCard label="Published" value="96" hint="FY 2026–27" />
        <KpiCard label="Open findings" value="23" tone="danger" hint="Across 6 vendors" />
        <KpiCard
          label="Compliance score"
          value={formatScore({ complied: 1372, notApplicable: 820, assignedTotal: 2217 })}
          tone="primary"
          hint="July 2026 grand total"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Buttons">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button>
                <PlusIcon /> New audit run
              </Button>
              <Button variant="outline">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive">Destructive</Button>
              <Button size="sm">Small</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled>Disabled</Button>
              <Button disabled>
                <Loader2Icon className="animate-spin" /> Saving…
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Form controls">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="unit">Unit name</FieldLabel>
              <Input id="unit" defaultValue="Jigani" />
            </Field>
            <Field data-invalid>
              <FieldLabel htmlFor="code">Unit code</FieldLabel>
              <Input id="code" aria-invalid placeholder="VOM-XXX" />
              <FieldError>Enter the unit code, e.g. VOM-JIG</FieldError>
            </Field>
            <Field>
              <FieldLabel>Cadence</FieldLabel>
              <Select defaultValue="PERIODIC">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIFETIME">Lifetime</SelectItem>
                  <SelectItem value="ONE_TIME">One-time</SelectItem>
                  <SelectItem value="PERIODIC">Periodic</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </SectionCard>

        <SectionCard title="Evidence submission">
          <FieldGroup className="gap-4">
            <Field orientation="horizontal">
              <Switch id="na" />
              <FieldLabel htmlFor="na">Propose as not applicable</FieldLabel>
            </Field>
            <Field>
              <FieldLabel htmlFor="remarks">Vendor remarks</FieldLabel>
              <Textarea id="remarks" placeholder="Describe the evidence you are submitting…" />
              <FieldDescription>Mandatory. 1–3 files unless proposing NA.</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="confirm" />
              <FieldLabel htmlFor="confirm">I confirm these documents are genuine</FieldLabel>
            </Field>
          </FieldGroup>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionCard title="Banners">
          <div className="flex flex-col gap-3">
            <Alert className="border-success-border bg-success-subtle text-success">
              <CheckCircle2Icon />
              <AlertTitle>Published 15 Jul 2026</AlertTitle>
              <AlertDescription className="text-success/90">Vendor writes are frozen for this run.</AlertDescription>
            </Alert>
            <Alert className="border-warning-border bg-warning-subtle text-warning">
              <AlertTriangleIcon />
              <AlertTitle>Window 2 required</AlertTitle>
              <AlertDescription className="text-warning/90">
                3 items are pending or not complied. Set Window 2 dates to continue.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <FileWarningIcon />
              <AlertTitle>Checklist assignment changed within the Activity Period</AlertTitle>
              <AlertDescription>Stabilise the assignment before creating the audit run.</AlertDescription>
            </Alert>
          </div>
        </SectionCard>

        <SectionCard title="Toasts">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => toast.success("Evidence uploaded", { description: "ESI_Challan_Jul2026.pdf linked" })}
            >
              Success toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.error("Couldn't save remarks", { description: "The server didn't respond. Your text is kept." })
              }
            >
              Error toast
            </Button>
            <Button variant="outline" onClick={() => toast.info("Window 1 closes in 2 days")}>
              Info toast
            </Button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
