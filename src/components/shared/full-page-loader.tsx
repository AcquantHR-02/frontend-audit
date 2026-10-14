import { Loader2Icon } from "lucide-react";

export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh items-center justify-center gap-2.5 text-muted-foreground"
    >
      <Loader2Icon className="size-5 animate-spin text-primary" aria-hidden />
      {label}
    </div>
  );
}
