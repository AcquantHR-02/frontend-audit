import type { Metadata } from "next";
import { ActsPage } from "@/features/masters";

export const metadata: Metadata = { title: "Acts" };

export default function MastersActsRoute() {
  return <ActsPage />;
}
