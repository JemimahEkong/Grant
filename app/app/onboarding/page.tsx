"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "../../../components/ui";
import { getWallet } from "../../../lib/ui/actions";

export default function OnboardingIndex() {
  const router = useRouter();
  useEffect(() => {
    getWallet()
      .then(wallet => router.replace(wallet.step === "complete" ? "/app" : `/app/onboarding/${wallet.step}`))
      .catch(() => router.replace("/app/onboarding/wallet"));
  }, [router]);
  return (
    <div className="onboarding-card">
      <div className="row" style={{ justifyContent: "center", color: "var(--muted)", fontSize: 10 }}>
        <Spinner /> <span>Opening onboarding</span>
      </div>
    </div>
  );
}
