import type { Metadata } from "next";
import { StatesPage } from "@/features/masters";

export const metadata: Metadata = { title: "States" };

export default function MastersStatesRoute() {
  return <StatesPage />;
}
