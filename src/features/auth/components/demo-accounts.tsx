"use client";

import { FlaskConicalIcon } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
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

/** Development helper — rendered only while the MSW mock backend is enabled. */
export function DemoAccounts({ onSelect }: { onSelect: (email: string, password: string) => void }) {
  return (
    <section aria-labelledby="demo-accounts" className="rounded-lg border border-dashed bg-muted/40 p-3">
      <h2 id="demo-accounts" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <FlaskConicalIcon className="size-3.5" aria-hidden />
        Demo accounts · mock backend · password {DEMO_PASSWORD}
      </h2>
      <ul className="flex flex-col gap-1">
        {accounts.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => onSelect(account.email, DEMO_PASSWORD)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="truncate font-mono">{account.email}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {account.note && <span className="text-muted-foreground">{account.note}</span>}
                <StatusBadge meta={roleMeta[account.role]} dot={false} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
