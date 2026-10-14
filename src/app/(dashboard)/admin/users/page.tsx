import type { Metadata } from "next";
import { UsersPage } from "@/features/users";

export const metadata: Metadata = { title: "Users & access" };

export default function AdminUsersRoute() {
  return <UsersPage />;
}
