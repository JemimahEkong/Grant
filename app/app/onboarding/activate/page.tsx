"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingStep } from "../../../../components/OnboardingStep";
import { Spinner } from "../../../../components/ui";
import { WalletAddress } from "../../../../components/WalletAddress";
import { activateWallet, getWallet } from "../../../../lib/ui/actions";
import type { WalletView } from "../../../../lib/ui/api";

export default function ActivateWalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWallet()
      .then(result => {
        if (result.step === "complete") router.replace("/app");
        else if (result.step !== "activate") router.replace(`/app/onboarding/${result.step}`);
        else setWallet(result);
      })
      .catch(failure => setError((failure as Error).message));
  }, [router]);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      await activateWallet();
      router.push("/app/onboarding/trustline");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return <div className="onboarding-card"><div className="row" style={{ color: "var(--muted)", fontSize: 10 }}><Spinner /> <span>Checking account</span></div></div>;
  }

  return (
    <OnboardingStep
      step={1}
      title="Activate the account"
      lede="A new Stellar account needs a small XLM reserve before it exists on-chain. The demo treasury sends that reserve."
      actionLabel="Activate account"
      onAction={activate}
      busy={busy}
      error={error}
    >
      <WalletAddress address={wallet.address} />
    </OnboardingStep>
  );
}
