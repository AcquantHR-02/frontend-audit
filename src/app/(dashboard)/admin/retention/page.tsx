import type { Metadata } from "next";
import { RetentionPage } from "@/features/reports";

export const metadata: Metadata = { title: "Retention" };

export default function AdminRetentionRoute() {
  return <RetentionPage />;
}
