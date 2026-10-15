import { ClipboardCheckIcon, ShieldAlertIcon, ShieldCheckIcon, TimerIcon } from "lucide-react";
import Image from "next/image";
import { Wordmark } from "@/components/layout/brand";
import { siteConfig } from "@/config/site";

const highlights = [
  {
    icon: ClipboardCheckIcon,
    title: "Vendor & PE audits",
    text: "One workflow for contractor audits and Principal Employer health-checks.",
  },
  {
    icon: TimerIcon,
    title: "Windowed evidence",
    text: "Upload windows, auditor review and a conditional second window.",
  },
  {
    icon: ShieldAlertIcon,
    title: "Findings & scores",
    text: "Every non-compliance becomes a tracked finding with its own remediation.",
  },
];

/**
 * Fixed-height split screen: the page itself never scrolls. Content that may not fit on very
 * short viewports (highlights, hero image) hides by height; the form column scrolls internally
 * only as a last resort.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid h-svh overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden min-h-0 flex-col overflow-hidden bg-sidebar-gradient p-10 text-sidebar-foreground lg:flex">
        {/* Decorative grid + glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_30%_30%,black,transparent_75%)] [background-size:40px_40px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-sidebar-primary/15 blur-3xl"
        />

        <div className="relative flex items-center gap-2 text-sm font-semibold text-white">
          Audit Management System
          <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80">
            by {siteConfig.organisation}
          </span>
        </div>

        {/* Brand hero: the glowing Acquant "A" — shrinks with the viewport height. */}
        <Image
          src="/brand/acquant-mark-glow.webp"
          alt=""
          width={1200}
          height={800}
          priority
          className="relative -mx-6 mt-4 h-auto max-h-[32svh] w-auto max-w-[min(100%,480px)] object-contain object-left select-none [@media(max-height:620px)]:hidden"
        />

        <div className="relative mt-auto max-w-md space-y-7">
          <div className="space-y-3">
            <h2 className="text-3xl leading-tight font-semibold tracking-tight text-white">
              Compliance audits, evidence and findings in one place.
            </h2>
            <p className="text-sm text-white/70">{siteConfig.description}</p>
          </div>
          <ul className="space-y-4 [@media(max-height:760px)]:hidden">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="size-4 text-sidebar-primary" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-[13px] text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/50">
            © 2026 {siteConfig.organisation} · Quantifying Excellence · v{siteConfig.version}
          </p>
        </div>
      </aside>

      <main className="relative isolate flex min-h-0 flex-col overflow-y-auto bg-background">
        {/* Soft brand glow behind the card — clipped in its own layer, otherwise the
            off-edge blobs extend the scroll area and make the column scrollable. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-brand-cyan/10 blur-3xl" />
        </div>

        <div className="m-auto w-full max-w-[420px] px-4 py-6 sm:px-6 [@media(max-height:700px)]:py-3">
          {/* The wordmark's navy lettering is turned white on dark surfaces. */}
          <Wordmark className="mx-auto mb-6 w-40 sm:mb-8 sm:w-44 dark:brightness-0 dark:invert [@media(max-height:700px)]:mb-3 [@media(max-height:700px)]:w-32" />
          <div className="rounded-2xl border bg-card p-5 shadow-lg shadow-primary/5 sm:p-7 [@media(max-height:700px)]:p-5">
            {children}
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground [@media(max-height:700px)]:hidden">
            <ShieldCheckIcon className="size-3.5 text-success" aria-hidden />
            Role-based access · every action is audit-logged
          </p>
        </div>
      </main>
    </div>
  );
}
