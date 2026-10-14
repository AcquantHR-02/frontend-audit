import { ClipboardCheckIcon, ShieldAlertIcon, TimerIcon } from "lucide-react";
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

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-sidebar-gradient p-10 text-sidebar-foreground lg:flex lg:flex-col">
        {/* Decorative grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] [background-size:40px_40px]"
        />

        <div className="relative flex items-center gap-2 text-sm font-semibold text-white">
          Audit Management System
          <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80">
            by {siteConfig.organisation}
          </span>
        </div>

        {/* Brand hero: the glowing Acquant "A" */}
        <Image
          src="/brand/acquant-mark-glow.webp"
          alt=""
          width={1200}
          height={800}
          priority
          className="relative -mx-6 mt-6 h-auto w-[min(100%,520px)] select-none"
        />

        <div className="relative mt-auto max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl leading-tight font-semibold tracking-tight text-white">
              Compliance audits, evidence and findings in one place.
            </h2>
            <p className="text-sm text-white/70">{siteConfig.description}</p>
          </div>
          <ul className="space-y-5">
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

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <Wordmark className="mb-10 w-48" />
          {children}
        </div>
      </main>
    </div>
  );
}
