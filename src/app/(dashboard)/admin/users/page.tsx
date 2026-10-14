import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Users & access" };

export default function AdminUsersPage() {
  return (
    <ModulePlaceholder
      title="Users & access"
      description="Accounts for all four roles. Only Auditor Admins can create or change users."
    />
  );
}
