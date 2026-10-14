"use client";

import type { ReactNode } from "react";
import { ConfirmDialog } from "./confirm-dialog";

interface StatusChangeDialogProps {
  /** The record being changed; null closes the dialog. */
  target: { name: string; isActive: boolean } | null;
  onClose: () => void;
  /** e.g. "vendor", "Act" */
  entityLabel: string;
  /** What deactivation means for this entity. */
  deactivateNote?: ReactNode;
  isPending?: boolean;
  onConfirm: () => Promise<unknown>;
}

/** Soft-delete confirmation (spec §7A Lock 5: never hard-delete master data). */
export function StatusChangeDialog({
  target,
  onClose,
  entityLabel,
  deactivateNote,
  isPending,
  onConfirm,
}: StatusChangeDialogProps) {
  const deactivating = !!target?.isActive;
  return (
    <ConfirmDialog
      open={!!target}
      onOpenChange={(open) => !open && onClose()}
      title={deactivating ? `Deactivate ${entityLabel}?` : `Reactivate ${entityLabel}?`}
      description={
        deactivating ? (
          <>
            <p>
              <b className="text-foreground">{target?.name}</b> will no longer be available for new assignments or audit
              runs. History is kept and you can reactivate it at any time.
            </p>
            {deactivateNote}
          </>
        ) : (
          <p>
            <b className="text-foreground">{target?.name}</b> will be available again for new assignments and audit
            runs.
          </p>
        )
      }
      confirmLabel={deactivating ? "Deactivate" : "Reactivate"}
      destructive={deactivating}
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
