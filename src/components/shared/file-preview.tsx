"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchFile, saveBlob } from "@/store";
import { useAppStore } from "@/store/hooks";
import type { ApiError } from "@/types/api";
import type { StoredFile } from "@/types/domain";

type Kind = "image" | "pdf" | "text" | "sheet" | "other";

function kindOf(file: StoredFile): Kind {
  const type = file.contentType;
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/") || type === "application/json") return "text";
  if (type.includes("spreadsheet") || type.includes("excel") || /\.(xlsx?|csv)$/i.test(file.fileName)) return "sheet";
  return "other";
}

const kindIcon: Record<Kind, LucideIcon> = {
  image: FileImageIcon,
  pdf: FileTextIcon,
  text: FileTextIcon,
  sheet: FileSpreadsheetIcon,
  other: FileIcon,
};

export const formatFileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Download through the authenticated API, with a toast on failure. */
function useDownload() {
  const store = useAppStore();
  return async (file: StoredFile) => {
    try {
      saveBlob(await fetchFile(file.url, store), file.fileName);
    } catch (e) {
      toast.error((e as ApiError).message ?? "Couldn't download the file.");
    }
  };
}

/** Evidence / remediation files as chips: click to preview, arrow button to download. */
export function FileList({ files, className }: { files: StoredFile[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const download = useDownload();
  if (files.length === 0) return null;

  return (
    <>
      <ul className={cn("flex flex-wrap gap-1.5", className)}>
        {files.map((file, index) => {
          const Icon = kindIcon[kindOf(file)];
          return (
            <li key={file.id} className="flex items-stretch overflow-hidden rounded-md border bg-muted/40 text-xs">
              <button
                type="button"
                onClick={() => setOpen(index)}
                className="flex min-w-0 items-center gap-1.5 px-2 py-1 transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
                title={`Preview ${file.fileName}`}
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="max-w-56 truncate">{file.fileName}</span>
                <span className="text-muted-foreground tabular">{formatFileSize(file.sizeBytes)}</span>
              </button>
              <button
                type="button"
                onClick={() => void download(file)}
                aria-label={`Download ${file.fileName}`}
                className="grid w-7 place-items-center border-l text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:bg-accent"
              >
                <DownloadIcon className="size-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {open !== null && (
        <FilePreviewDialog files={files} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

type Loaded = { fileId: string; url: string; blob: Blob; text?: string } | { fileId: string; error: string };

/** Full-size viewer for images, PDFs and text; other types offer a download. ← / → switch files. */
export function FilePreviewDialog({
  files,
  index,
  onIndexChange,
  onClose,
}: {
  files: StoredFile[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const store = useAppStore();
  const download = useDownload();
  const file = files[index];
  const kind = kindOf(file);
  const previewable = kind === "image" || kind === "pdf" || kind === "text";
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const current = loaded?.fileId === file.id ? loaded : null;

  useEffect(() => {
    if (!previewable) return;
    const controller = new AbortController();
    let url: string | null = null;
    fetchFile(file.url, store, controller.signal)
      .then(async (blob) => {
        url = URL.createObjectURL(blob);
        const text = kind === "text" ? await blob.text() : undefined;
        if (!controller.signal.aborted) setLoaded({ fileId: file.id, url, blob, text });
      })
      .catch((e: ApiError) => {
        if (!controller.signal.aborted) setLoaded({ fileId: file.id, error: e.message ?? "Couldn't load the file." });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, file.url, kind, previewable, store]);

  const go = (step: number) => onIndexChange((index + step + files.length) % files.length);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex h-[min(88svh,900px)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0 sm:max-w-5xl"
        onKeyDown={(event) => {
          if (files.length < 2) return;
          if (event.key === "ArrowRight") go(1);
          else if (event.key === "ArrowLeft") go(-1);
        }}
      >
        <DialogHeader className="flex-row items-center gap-3 border-b py-3 pr-12 pl-4 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
            {(() => {
              const Icon = kindIcon[kind];
              return <Icon className="size-4.5" aria-hidden />;
            })()}
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-sm">{file.fileName}</DialogTitle>
            <DialogDescription className="text-xs tabular">
              {formatFileSize(file.sizeBytes)} · {file.contentType}
              {files.length > 1 && ` · ${index + 1} of ${files.length}`}
            </DialogDescription>
          </div>
          {files.length > 1 && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => go(-1)}
                aria-label="Previous file"
              >
                <ChevronLeftIcon />
              </Button>
              <Button variant="outline" size="icon" className="size-8" onClick={() => go(1)} aria-label="Next file">
                <ChevronRightIcon />
              </Button>
            </div>
          )}
          {current && "url" in current && kind === "pdf" && (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <a href={current.url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon /> Open
              </a>
            </Button>
          )}
          <Button size="sm" onClick={() => void download(file)}>
            <DownloadIcon /> Download
          </Button>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 overflow-auto bg-muted/50">
          {!previewable ? (
            <Placeholder
              title="No preview for this file type"
              description="Download the file to open it in its own application."
              action={
                <Button variant="outline" onClick={() => void download(file)}>
                  <DownloadIcon /> Download {file.fileName}
                </Button>
              }
            />
          ) : !current ? (
            <div className="grid h-full place-items-center text-muted-foreground">
              <Loader2Icon className="size-6 animate-spin" aria-label="Loading preview" />
            </div>
          ) : "error" in current ? (
            <Placeholder title="Preview unavailable" description={current.error} />
          ) : kind === "image" ? (
            <div className="grid min-h-full place-items-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, not optimisable */}
              <img
                src={current.url}
                alt={file.fileName}
                className="max-h-full max-w-full rounded-md bg-white object-contain shadow-sm"
              />
            </div>
          ) : kind === "pdf" ? (
            <iframe src={current.url} title={file.fileName} className="size-full border-0 bg-white" />
          ) : (
            <pre className="p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{current.text}</pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Placeholder({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <span className="mb-1 grid size-12 place-items-center rounded-full bg-card text-muted-foreground shadow-xs">
        <FileIcon className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
