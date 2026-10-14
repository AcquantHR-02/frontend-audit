import { ShieldCheckIcon } from "lucide-react";
import { SectionCard } from "./section-card";

const swatches = [
  { name: "Primary", className: "bg-primary" },
  { name: "Accent", className: "bg-accent" },
  { name: "Foreground", className: "bg-foreground" },
  { name: "Muted text", className: "bg-muted-foreground" },
  { name: "Background", className: "bg-background" },
  { name: "Border", className: "bg-border" },
  { name: "Success", className: "bg-success" },
  { name: "Warning", className: "bg-warning" },
  { name: "Danger", className: "bg-danger" },
  { name: "Info", className: "bg-info" },
  { name: "Violet", className: "bg-violet" },
];

export function TokensSection() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SectionCard title="Colour" hint="Red and amber only where meaning requires it">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5">
          {swatches.map((s) => (
            <div key={s.name} className="overflow-hidden rounded-md border bg-card">
              <div className={`h-11 ${s.className}`} />
              <div className="px-2 py-1.5 text-xs font-medium">{s.name}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Navigation chrome">
        <div className="flex h-full min-h-40 flex-col gap-1 rounded-md bg-sidebar-gradient p-3 text-sidebar-foreground">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex size-7 items-center justify-center rounded-md bg-white/10">
              <ShieldCheckIcon className="size-4" />
            </span>
            Audit Management
          </div>
          <span className="rounded-md bg-sidebar-accent px-2 py-1.5 text-white shadow-[inset_2px_0_0_var(--sidebar-primary)]">
            Dashboard
          </span>
          <span className="px-2 py-1.5">Audit runs</span>
          <span className="px-2 py-1.5">Findings</span>
        </div>
      </SectionCard>
    </div>
  );
}
