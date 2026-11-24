import type { ReactNode } from "react";
import WorkspaceShell from "../ui/workspace-shell";

export default function ClienteLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShell area="client" title="Area cliente" homeHref="/cliente" links={[
      { label: "I tuoi siti", href: "/cliente" },
      { label: "Crea una vetrina", href: "/cliente/nuovo" },
    ]}>
      {children}
    </WorkspaceShell>
  );
}
