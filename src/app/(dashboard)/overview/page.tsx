import type { Metadata } from "next";
import { Overview } from "@/features/dashboard";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return <Overview />;
}
