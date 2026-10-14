"use client";

import { FileIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = {
  "application/pdf": [".pdf"],
  "image/*": [".png", ".jpg", ".jpeg"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};
const formatSize = (b: number) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

/** Controlled multi-file picker with drag and drop (PDF / image / Excel, 10 MB each). */
export function FileDropzone({
  files,
  onChange,
  maxFiles,
  hint,
  onReject,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles: number;
  hint?: string;
  onReject?: (message: string) => void;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    maxSize: MAX_SIZE,
    accept: ACCEPT,
    onDrop: (accepted, rejected) => {
      if (rejected.length) onReject?.("Some files were skipped: use PDF, image or Excel files up to 10 MB.");
      onChange([...files, ...accepted].slice(0, maxFiles));
    },
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-5 text-center transition-colors hover:bg-accent/40",
          isDragActive && "border-primary bg-accent",
          files.length >= maxFiles && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} aria-label="Upload files" />
        <UploadCloudIcon className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-[13px] font-medium">
          {isDragActive ? "Drop files here" : "Drag files here or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, image or Excel · up to {maxFiles} files · 10 MB each{hint ? ` · ${hint}` : ""}
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
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
