"use client";

import { ArrowLeftIcon, CheckCircle2Icon, Loader2Icon, LockIcon, RotateCcwIcon, ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { usePageTitle } from "@/components/layout/page-title";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { FileList } from "@/components/shared/file-preview";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCan, useCurrentUser } from "@/hooks/use-current-user";
import { Permission } from "@/lib/auth";
import { findingMeta } from "@/lib/domain";
import { formatDateRange, formatDateTime } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { FindingDetail } from "@/types/domain";
import { useAddRemediationMutation, useGetFindingQuery, useUpdateFindingMutation } from "../api/findings.api";

export function FindingDetailPage({ findingId }: { findingId: string }) {
  const user = useCurrentUser();
  const canManage = useCan(Permission.FINDINGS_MANAGE);
  const canRemediate = useCan(Permission.FINDINGS_REMEDIATE);
  const { data: finding, error } = useGetFindingQuery(findingId);
  usePageTitle(finding?.requirement);

  if ((error as ApiError | undefined)?.status === 404) {
    return (
      <EmptyState
        icon={ShieldAlertIcon}
        title="Finding not found"
        description="It may not exist, or you don't have access to it."
      />
    );
  }
  if (!finding) return <Skeleton className="h-48 w-full" />;

  // PE users can read vendor findings at their units but only remediate their own PE audit findings.
  const isParty =
    canRemediate &&
    ((finding.auditType === "VENDOR" && user?.role === "VENDOR_USER") ||
      (finding.auditType === "PE" && user?.role === "PE_USER"));
  const mayUpload = canManage || (isParty && finding.status === "OPEN");

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/findings">
          <ArrowLeftIcon /> Findings
        </Link>
      </Button>
      <PageHeader
        title={finding.requirement}
        badge={<StatusBadge meta={findingMeta[finding.status]} />}
        description={`${finding.partyName} · ${finding.unitCode} ${finding.unitName} · ${finding.peName}`}
        actions={canManage && <StatusAction finding={finding} />}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm">Remediation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 py-4">
              {finding.attachments.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No remediation uploaded yet.</p>
              ) : (
                <ol className="space-y-3">
                  {finding.attachments.map((a) => (
                    <li key={a.id} className="space-y-2 rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{a.uploadedByName}</span> ·{" "}
                        {formatDateTime(a.uploadedAt)}
                      </div>
                      <p className="text-[13px]">{a.remarks}</p>
                      <FileList files={a.files} />
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {mayUpload ? (
            <RemediationForm findingId={finding.id} />
          ) : (
            isParty && (
              <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <LockIcon className="size-4" aria-hidden /> This finding is resolved. Remediation is closed.
              </p>
            )
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-[13px]">
                <dt className="text-muted-foreground">Audit run</dt>
                <dd>
                  <Link
                    href={`/audit-runs/${finding.runId}`}
                    className="font-mono text-xs font-medium text-primary hover:underline"
                  >
                    {finding.runCode}
                  </Link>
                </dd>
                <dt className="text-muted-foreground">Act</dt>
                <dd className="font-mono text-xs">{finding.actName}</dd>
                <dt className="text-muted-foreground">Period</dt>
                <dd>
                  {finding.periodStart
                    ? formatDateRange(finding.periodStart, finding.periodEnd)
                    : "Whole activity period"}
                </dd>
                <dt className="text-muted-foreground">Opened</dt>
                <dd>{formatDateTime(finding.createdAt)}</dd>
                <dt className="text-muted-foreground">Audit remarks</dt>
                <dd>{finding.auditRemarks ?? "—"}</dd>
              </dl>
            </CardContent>
          </Card>
          {canManage && <NotesCard finding={finding} />}
        </div>
      </div>
    </>
  );
}

function StatusAction({ finding }: { finding: FindingDetail }) {
  const [open, setOpen] = useState(false);
  const [update, { isLoading }] = useUpdateFindingMutation();
  const resolving = finding.status === "OPEN";
  return (
    <>
      <Button variant={resolving ? "default" : "outline"} onClick={() => setOpen(true)}>
        {resolving ? <CheckCircle2Icon /> : <RotateCcwIcon />} {resolving ? "Mark resolved" : "Reopen"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={resolving ? "Mark this finding resolved?" : "Reopen this finding?"}
        description={
          <p>
            {resolving
              ? "The audited party can no longer upload remediation. You can reopen it later if needed."
              : "The audited party can upload remediation again."}
          </p>
        }
        confirmLabel={resolving ? "Mark resolved" : "Reopen"}
        isPending={isLoading}
        onConfirm={async () => {
          try {
            await update({ id: finding.id, status: resolving ? "RESOLVED" : "OPEN" }).unwrap();
            toast.success(resolving ? "Finding resolved" : "Finding reopened");
            setOpen(false);
          } catch (e) {
            toast.error((e as ApiError).message);
          }
        }}
      />
    </>
  );
}

function NotesCard({ finding }: { finding: FindingDetail }) {
  const [notes, setNotes] = useState(finding.remarks ?? "");
  const [update, { isLoading }] = useUpdateFindingMutation();
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm">Auditor notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 py-4">
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes on follow-up or resolution"
          aria-label="Auditor notes"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={isLoading || notes === (finding.remarks ?? "")}
          onClick={async () => {
            try {
              await update({ id: finding.id, remarks: notes }).unwrap();
              toast.success("Notes saved");
            } catch (e) {
              toast.error((e as ApiError).message);
            }
          }}
        >
          {isLoading && <Loader2Icon className="animate-spin" />} Save notes
        </Button>
      </CardContent>
    </Card>
  );
}

function RemediationForm({ findingId }: { findingId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [add, { isLoading }] = useAddRemediationMutation();

  async function submit() {
    if (files.length === 0) return setError("Attach at least one file.");
    if (!remarks.trim()) return setError("Describe what was done to fix this.");
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("remarks", remarks);
    try {
      await add({ id: findingId, form }).unwrap();
      toast.success("Remediation submitted");
      setFiles([]);
      setRemarks("");
      setError(null);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm">Add remediation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <FileDropzone files={files} onChange={setFiles} maxFiles={3} hint="at least 1 required" onReject={setError} />
        <Field>
          <FieldLabel htmlFor="remediation-remarks">Remarks</FieldLabel>
          <Textarea
            id="remediation-remarks"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="What was done to fix this? e.g. Paid the July ESI challan on 20 Aug"
          />
        </Field>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-[13px] text-danger"
          >
            {error}
          </p>
        )}
        <Button onClick={submit} disabled={isLoading}>
          {isLoading && <Loader2Icon className="animate-spin" />} Submit remediation
        </Button>
      </CardContent>
    </Card>
  );
}
