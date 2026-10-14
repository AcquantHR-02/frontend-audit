"use client";

import { AlertTriangleIcon, CheckCircle2Icon, Loader2Icon, PlayIcon, SendIcon, SquareIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCan } from "@/hooks/use-current-user";
import { Permission } from "@/lib/auth";
import { addDays, evaluateEndOfReview } from "@/lib/domain";
import type { ApiError } from "@/types/api";
import type { AuditItemResult, AuditRunView } from "@/types/domain";
import {
  useCloseWindow2Mutation,
  useEndReviewMutation,
  useGetPublishCheckQuery,
  usePublishRunMutation,
  useStartReviewMutation,
} from "../../api/audit-runs.api";

type Dialog = "start" | "end" | "close2" | "publish" | null;
const today = () => new Date().toISOString().slice(0, 10);

/** The one next step for the auditor in the current phase (§4). */
export function PhaseActions({ run, airs }: { run: AuditRunView; airs: AuditItemResult[] }) {
  const canReview = useCan(Permission.AUDIT_RUNS_REVIEW);
  const canPublish = useCan(Permission.AUDIT_RUNS_PUBLISH);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [w2Start, setW2Start] = useState(today);
  const [w2End, setW2End] = useState(() => addDays(today(), 7));
  const [startReview, startState] = useStartReviewMutation();
  const [endReview, endState] = useEndReviewMutation();
  const [closeWindow2, closeState] = useCloseWindow2Mutation();
  const [publish, publishState] = usePublishRunMutation();
  const check = useGetPublishCheckQuery(run.id, { skip: dialog !== "publish" });
  const evaluation = evaluateEndOfReview(airs);

  if (!canReview || run.phase === "PUBLISHED") return null;

  const run$ = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
      setDialog(null);
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  return (
    <>
      {(run.phase === "SCHEDULED" || run.phase === "WINDOW_1") && (
        <Button variant="outline" onClick={() => setDialog("start")}>
          <PlayIcon /> Start review
        </Button>
      )}
      {run.phase === "REVIEW" && (
        <Button onClick={() => setDialog("end")}>
          <CheckCircle2Icon /> End review
        </Button>
      )}
      {run.phase === "WINDOW_2" && (
        <Button variant="outline" onClick={() => setDialog("close2")}>
          <SquareIcon /> Close Window 2
        </Button>
      )}
      {run.phase === "FINAL_REVIEW" && canPublish && (
        <Button onClick={() => setDialog("publish")}>
          <SendIcon /> Publish
        </Button>
      )}

      <ConfirmDialog
        open={dialog === "start"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Close Window 1 and start review?"
        description={<p>The audited party can no longer upload or edit evidence. You can stamp items from now on.</p>}
        confirmLabel="Start review"
        isPending={startState.isLoading}
        onConfirm={() => run$(() => startReview(run.id).unwrap(), "Review started")}
      />

      <ConfirmDialog
        open={dialog === "end"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="End review?"
        description={
          evaluation.needsWindow2 ? (
            <p>
              <b className="text-foreground">{evaluation.pending}</b> item(s) pending and{" "}
              <b className="text-foreground">{evaluation.notComplied}</b> not complied. Window 2 is required: the party
              can upload again for these items only. A run gets one Window 2.
            </p>
          ) : (
            <p>Every item is Complied or Not applicable. Window 2 is skipped and the run moves to Final review.</p>
          )
        }
        confirmLabel={evaluation.needsWindow2 ? "Open Window 2" : "Go to Final review"}
        isPending={endState.isLoading}
        onConfirm={() =>
          run$(
            () =>
              endReview({
                runId: run.id,
                ...(evaluation.needsWindow2 ? { window2Start: w2Start, window2End: w2End } : {}),
              }).unwrap(),
            evaluation.needsWindow2 ? "Window 2 scheduled" : "Moved to Final review",
          )
        }
      >
        {evaluation.needsWindow2 && (
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="w2-start">Window 2 from</FieldLabel>
              <Input
                id="w2-start"
                type="date"
                min={today()}
                value={w2Start}
                onChange={(e) => setW2Start(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="w2-end">Window 2 to</FieldLabel>
              <Input id="w2-end" type="date" min={w2Start} value={w2End} onChange={(e) => setW2End(e.target.value)} />
            </Field>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "close2"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Close Window 2?"
        description={
          <p>
            The party is locked out again and the run moves to Final review. Window 2 won&apos;t reopen, even if you
            re-stamp items later.
          </p>
        }
        confirmLabel="Close Window 2"
        isPending={closeState.isLoading}
        onConfirm={() => run$(() => closeWindow2(run.id).unwrap(), "Moved to Final review")}
      />

      <ConfirmDialog
        open={dialog === "publish"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Publish ${run.code}?`}
        description={
          <p>Statuses become final, the audited party is frozen and a finding opens for every Not complied item.</p>
        }
        confirmLabel="Publish"
        isPending={publishState.isLoading}
        onConfirm={() => {
          if (!check.data?.canPublish) return;
          return run$(() => publish(run.id).unwrap(), `${run.code} published`);
        }}
      >
        {check.isFetching || !check.data ? (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Checking…
          </p>
        ) : (
          <div className="space-y-2">
            {check.data.blocking.map((b) => (
              <Alert key={b} variant="destructive">
                <AlertTriangleIcon />
                <AlertDescription>{b}</AlertDescription>
              </Alert>
            ))}
            {check.data.warnings.map((w) => (
              <Alert key={w} className="border-warning-border bg-warning-subtle text-warning">
                <AlertTriangleIcon />
                <AlertDescription className="text-warning">{w} You can still publish.</AlertDescription>
              </Alert>
            ))}
            {check.data.canPublish && (
              <p className="text-[13px]">
                {check.data.findingsToOpen > 0
                  ? `${check.data.findingsToOpen} finding(s) will be opened.`
                  : "No findings will be opened."}
              </p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
