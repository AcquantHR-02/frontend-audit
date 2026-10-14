import type { Metadata } from "next";
import { PrincipalEmployerListPage } from "@/features/masters";

export const metadata: Metadata = { title: "Principal employers" };

export default function MastersPrincipalEmployersRoute() {
  return <PrincipalEmployerListPage />;
}
