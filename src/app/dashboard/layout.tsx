import type { ReactNode } from "react";
import WorkspaceShell from "../ui/workspace-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShell area="platform" title="Amministrazione" homeHref="/dashboard" links={[
      { label: "Panoramica", href: "/dashboard" },
      { label: "Attività", href: "/dashboard/ristoranti" },
    ]}>
      {children}
    </WorkspaceShell>
  );
}
