import type { Metadata } from "next";
import { ReportsPage } from "@/features/reports";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsRoute() {
  return <ReportsPage />;
}
