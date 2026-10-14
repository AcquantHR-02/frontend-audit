"use client";

import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserWithPassword } from "../api/users.api";

/**
 * Shows a newly issued temporary password exactly once.
 * Production note: the backend should deliver it by email instead (see PROGRESS.md › Open Questions).
 */
export function TemporaryPasswordDialog({
  result,
  context,
  onClose,
}: {
  result: UserWithPassword | null;
  context: "created" | "reset";
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-primary" aria-hidden />
            {context === "created" ? "User created" : "Password reset"}
          </DialogTitle>
          <DialogDescription>
            Share this temporary password with <b className="text-foreground">{result?.user.fullName}</b> through a
            secure channel. They must set a new password when they first sign in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <code className="flex-1 font-mono text-base tracking-wider select-all">{result?.temporaryPassword}</code>
          <Button variant="outline" size="sm" onClick={copy} aria-label="Copy password">
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <Alert className="border-warning-border bg-warning-subtle text-warning">
          <AlertDescription className="text-warning">
            This password won&apos;t be shown again. Sign-in email: {result?.user.email}
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
