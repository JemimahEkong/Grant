"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingStep } from "../../../../components/OnboardingStep";
import { Spinner } from "../../../../components/ui";
import { createWallet, getWallet } from "../../../../lib/ui/actions";
import type { WalletView } from "../../../../lib/ui/api";

export default function GenerateWalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWallet()
      .then(result => {
        if (result.step === "complete") router.replace("/app");
        else if (result.step !== "wallet") router.replace(`/app/onboarding/${result.step}`);
        else setWallet(result);
      })
      .catch(failure => setError((failure as Error).message));
  }, [router]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      await createWallet();
      router.push("/app/onboarding/activate");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return <div className="onboarding-card"><div className="row" style={{ color: "var(--muted)", fontSize: 10 }}><Spinner /> <span>Preparing wallet</span></div></div>;
  }

  return (
    <OnboardingStep
      step={0}
      title="Generate your wallet"
      lede="Grant creates a Stellar testnet account for this user. There is no extension to install and no seed phrase to write down."
      actionLabel="Generate wallet"
      onAction={generate}
      busy={busy}
      error={error}
    >
      <div className="explain-panel">
        <div className="h">Custody disclosure</div>
        <p>{wallet.custody}</p>
      </div>
    </OnboardingStep>
  );
}
