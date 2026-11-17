import type { ReactNode } from "react";
import { AppShell, AuthGate } from "../../components/providers";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
