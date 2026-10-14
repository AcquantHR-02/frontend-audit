"use client";

import { Loader2Icon } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  submitLabel: string;
  isPending?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  /** Form-level error (non-field), e.g. network failure. */
  error?: string;
  className?: string;
}

/** Consistent create/edit dialog: header, scrollable body, sticky footer, pending state. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isPending,
  onSubmit,
  children,
  error,
  className,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className={cn("gap-0 p-0 sm:max-w-lg", className)}>
        <form onSubmit={onSubmit} noValidate className="flex max-h-[85svh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {error && (
              <p role="alert" className="rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-danger">
                {error}
              </p>
            )}
            {children}
          </div>
          <DialogFooter className="border-t px-6 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" aria-hidden />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
