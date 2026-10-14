"use client";

import { FileIcon, Loader2Icon, UploadCloudIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FILES, validateEvidence } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import { useUploadEvidenceMutation } from "../../api/audit-runs.api";

const MAX_SIZE = 10 * 1024 * 1024;
const formatSize = (b: number) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    maxSize: MAX_SIZE,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    onDrop: (accepted, rejected) => {
      setError(rejected.length ? "Some files were skipped: use PDF, image or Excel files up to 10 MB." : null);
      setFiles((current) => [...current, ...accepted].slice(0, MAX_FILES));
    },
  });

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

      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-5 text-center transition-colors hover:bg-accent/40",
          isDragActive && "border-primary bg-accent",
          files.length >= MAX_FILES && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} aria-label="Upload files" />
        <UploadCloudIcon className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-[13px] font-medium">
          {isDragActive ? "Drop files here" : "Drag files here or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, image or Excel · up to {MAX_FILES} files · 10 MB each
          {uploader === "PARTY" && !naProposed && " · at least 1 required"}
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[13px]">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{formatSize(f.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

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
