import type { Metadata } from "next";
import { FindingsPage } from "@/features/findings";

export const metadata: Metadata = { title: "Findings" };

export default function FindingsRoute() {
  return <FindingsPage />;
}
