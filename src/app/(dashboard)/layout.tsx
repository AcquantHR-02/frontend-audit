import { DashboardShell } from "./_components/dashboard-shell";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return <DashboardShell>{children}</DashboardShell>;
}
