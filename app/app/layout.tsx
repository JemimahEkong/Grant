import type { ReactNode } from "react";
import { AuthGate, WorkspaceFrame } from "../../components/providers";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <WorkspaceFrame>{children}</WorkspaceFrame>
    </AuthGate>
  );
}
