"use client";

import { FlaskConicalIcon } from "lucide-react";
import { roleMeta } from "@/lib/domain";
import type { Role } from "@/types/domain";

const DEMO_PASSWORD = "Password@123";

const accounts: { email: string; role: Role; note?: string }[] = [
  { email: "admin@acquanthr.test", role: "AUDITOR_ADMIN" },
  { email: "auditor@acquanthr.test", role: "AUDITOR_USER" },
  { email: "vendor@rathna.test", role: "VENDOR_USER" },
  { email: "pe@veerometals.test", role: "PE_USER" },
  { email: "newuser@acquanthr.test", role: "AUDITOR_USER", note: "first login" },
];

/** Development helper — rendered only while the MSW mock backend is enabled. One chip per account. */
export function DemoAccounts({ onSelect }: { onSelect: (email: string, password: string) => void }) {
  return (
    <section aria-labelledby="demo-accounts" className="rounded-lg border border-dashed bg-muted/40 p-3">
      <h2 id="demo-accounts" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <FlaskConicalIcon className="size-3.5" aria-hidden />
        Demo accounts · click to fill
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {accounts.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => onSelect(account.email, DEMO_PASSWORD)}
              title={account.email}
              className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors outline-none hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {roleMeta[account.role].label}
              {account.note && <span className="font-normal text-muted-foreground"> · {account.note}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
