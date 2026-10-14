"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FILES, validateEvidence } from "@/lib/domain";
import type { ApiError } from "@/types/api";
import { useUploadEvidenceMutation } from "../../api/audit-runs.api";

/** Path 1 (party: files + remarks, optional NA proposal) or Path 2 (auditor: optional files only). */
export function EvidenceUploadForm({
  airId,
  runId,
  uploader,
  remarksLabel,
}: {
  airId: string;
  runId: string;
  uploader: "PARTY" | "AUDITOR";
  remarksLabel: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [naProposed, setNaProposed] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [upload, { isLoading }] = useUploadEvidenceMutation();

  async function submit() {
    const problem = validateEvidence({ uploader, fileCount: files.length, naProposed, partyRemarks: remarks });
    if (problem) return setError(problem);
    if (uploader === "AUDITOR" && files.length === 0)
      return setError("Attach at least one file, or stamp the item directly.");
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    if (uploader === "PARTY") {
      form.append("partyRemarks", remarks);
      form.append("naProposedByParty", String(naProposed));
    }
    try {
      await upload({ airId, runId, form }).unwrap();
      toast.success(naProposed ? "Not-applicable proposal submitted" : "Evidence uploaded");
      setFiles([]);
      setRemarks("");
      setNaProposed(false);
      setError(null);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  return (
    <div className="space-y-4">
      {uploader === "PARTY" && (
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Switch id={`na-${airId}`} checked={naProposed} onCheckedChange={setNaProposed} />
          <Label htmlFor={`na-${airId}`} className="flex flex-col items-start gap-0.5 font-normal">
            <span className="font-medium">Propose as not applicable</span>
            <span className="text-xs text-muted-foreground">
              Files become optional. The auditor makes the final decision.
            </span>
          </Label>
        </div>
      )}

      <FileDropzone
        files={files}
        onChange={setFiles}
        maxFiles={MAX_FILES}
        hint={uploader === "PARTY" && !naProposed ? "at least 1 required" : undefined}
        onReject={setError}
      />

      {uploader === "PARTY" && (
        <Field>
          <FieldLabel htmlFor={`remarks-${airId}`}>{remarksLabel}</FieldLabel>
          <Textarea
            id={`remarks-${airId}`}
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={
              naProposed
                ? "Why doesn't this item apply this period?"
                : "What do these documents show? e.g. ESI challan for July, paid 14 Aug"
            }
          />
          <FieldDescription>Required.</FieldDescription>
        </Field>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-[13px] text-danger"
        >
          {error}
        </p>
      )}
      <Button onClick={submit} disabled={isLoading} className="w-full">
        {isLoading && <Loader2Icon className="animate-spin" />}
        {uploader === "PARTY"
          ? naProposed
            ? "Submit NA proposal"
            : "Submit evidence"
          : "Upload on behalf of the party"}
      </Button>
    </div>
  );
}
