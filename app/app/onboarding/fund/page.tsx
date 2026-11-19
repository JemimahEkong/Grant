"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingStep } from "../../../../components/OnboardingStep";
import { FundWallet } from "../../../../components/FundWallet";
import { Spinner } from "../../../../components/ui";
import { getWallet } from "../../../../lib/ui/actions";
import type { WalletView } from "../../../../lib/ui/api";

export default function FundWalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWallet()
      .then(result => {
        if (result.step === "complete") router.replace("/app");
        else if (result.step !== "fund") router.replace(`/app/onboarding/${result.step}`);
        else setWallet(result);
      })
      .catch(failure => setError((failure as Error).message));
  }, [router]);

  if (!wallet) {
    return <div className="onboarding-card"><div className="row" style={{ color: "var(--muted)", fontSize: 13 }}><Spinner /> <span>Checking balance</span></div></div>;
  }

  return (
    <OnboardingStep
      step={3}
      title="Fund your wallet"
      lede="Use the faucet for a one-time 5 USDC grant, or send testnet USDC to your address from another wallet. The balance is read from chain."
      hideAction
      error={error}
    >
      <FundWallet wallet={wallet} onUpdated={setWallet} onComplete={() => router.push("/app")} />
    </OnboardingStep>
  );
}
