"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingStep } from "../../../../components/OnboardingStep";
import { Spinner } from "../../../../components/ui";
import { WalletAddress } from "../../../../components/WalletAddress";
import { addWalletTrustline, getWallet } from "../../../../lib/ui/actions";
import type { WalletView } from "../../../../lib/ui/api";

export default function TrustlinePage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWallet()
      .then(result => {
        if (result.step === "complete") router.replace("/app");
        else if (result.step !== "trustline") router.replace(`/app/onboarding/${result.step}`);
        else setWallet(result);
      })
      .catch(failure => setError((failure as Error).message));
  }, [router]);

  async function trustline() {
    setBusy(true);
    setError(null);
    try {
      await addWalletTrustline();
      router.push("/app/onboarding/fund");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return <div className="onboarding-card"><div className="row" style={{ color: "var(--muted)", fontSize: 10 }}><Spinner /> <span>Checking trustline</span></div></div>;
  }

  return (
    <OnboardingStep
      step={2}
      title="Add the USDC trustline"
      lede="A trustline tells Stellar that this account can receive USDC. Without it, the faucet transfer would fail."
      actionLabel="Add USDC trustline"
      onAction={trustline}
      busy={busy}
      error={error}
    >
      <WalletAddress address={wallet.address} />
    </OnboardingStep>
  );
}
