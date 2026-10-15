import { ArrowLeftIcon, ClipboardCheckIcon, LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-10 text-center">
      {/* Faint brand grid + glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] [background-size:44px_44px] opacity-60"
      />
      <div
        aria-hidden
        className="absolute top-1/3 left-1/2 -z-10 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <Wordmark className="mb-10 w-36 dark:brightness-0 dark:invert" />
      <p className="bg-gradient-to-br from-primary to-brand-cyan bg-clip-text text-7xl font-bold tracking-tighter text-transparent tabular sm:text-8xl">
        404
      </p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="mt-1.5 max-w-sm text-muted-foreground">
        The link may be broken, or the page may have moved. Check the address, or head back to a page you know.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/overview">
            <LayoutDashboardIcon /> Go to overview
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/audit-runs">
            <ClipboardCheckIcon /> Audit runs
          </Link>
        </Button>
      </div>
      <Link
        href="/login"
        className="mt-8 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden /> Back to sign in
      </Link>
    </main>
  );
}
