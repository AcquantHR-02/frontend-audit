"use client";

import { LogOutIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoginMutation, useLogoutMutation } from "@/features/auth";
import { useGetVendorsQuery } from "@/features/masters";
import { roleMeta } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { selectCurrentUser } from "@/store";
import { useAppSelector } from "@/store/hooks";
import type { ApiError } from "@/types/api";
import { SectionCard } from "./section-card";

const demoAccounts = [
  { email: "admin@acquanthr.test", label: "Auditor Admin" },
  { email: "auditor@acquanthr.test", label: "Auditor" },
  { email: "vendor@rathna.test", label: "Vendor (Rathna)" },
  { email: "pe@veerometals.test", label: "PE (Veero Metals)" },
];

/** Proves the full pipeline: component → RTK Query → fetch → MSW → mock DB → back. */
export function LiveDataSection() {
  const user = useAppSelector(selectCurrentUser);
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [login, { isLoading: isSigningIn }] = useLoginMutation();
  const [logout] = useLogoutMutation();
  const { data, isFetching } = useGetVendorsQuery({ size: 8 }, { skip: !user });

  async function handleSignIn() {
    try {
      const result = await login({ email, password: "Password@123" }).unwrap();
      toast.success(`Signed in as ${result.user.fullName}`);
    } catch (error) {
      toast.error((error as ApiError).message);
    }
  }

  return (
    <SectionCard title="Live data · RTK Query → MSW" hint="Mock backend, real HTTP">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              <span className="text-sm">
                Signed in as <b>{user.fullName}</b>
              </span>
              <StatusBadge meta={roleMeta[user.role]} />
              <Button variant="outline" size="sm" onClick={() => logout()}>
                <LogOutIcon /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Select value={email} onValueChange={setEmail}>
                <SelectTrigger className="w-56" aria-label="Demo account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {demoAccounts.map((a) => (
                    <SelectItem key={a.email} value={a.email}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSignIn} disabled={isSigningIn}>
                {isSigningIn ? "Signing in…" : "Sign in & load vendors"}
              </Button>
            </>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>ID</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!user ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Sign in with a demo account to load data from the mock API.
                  </TableCell>
                </TableRow>
              ) : isFetching || !data ? (
                Array.from({ length: 4 }, (_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }, (_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                data.content.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{vendor.id}</TableCell>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={vendor.isActive ? "success" : "neutral"}
                        label={vendor.isActive ? "Active" : "Inactive"}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular">{formatDate(vendor.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data && user && (
          <p className="text-xs text-muted-foreground">
            Showing {data.content.length} of {data.totalElements} vendors (page {data.page + 1} of {data.totalPages}).
          </p>
        )}
      </div>
    </SectionCard>
  );
}
