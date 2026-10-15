"use client";

import type { ComplianceStatus } from "@/types/domain";
import { remarkTemplates } from "../../utils/remark-templates";

/** Template chips under a remarks box; clicking one fills the box. */
export function RemarkTemplates({ status, onPick }: { status: ComplianceStatus | ""; onPick: (text: string) => void }) {
  if (!status) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Suggested remarks">
      {remarkTemplates[status].map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => onPick(text)}
          className="rounded-full border bg-muted/40 px-2.5 py-1 text-left text-xs text-muted-foreground transition-colors outline-none hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
