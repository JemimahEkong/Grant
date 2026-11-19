"use client";

import { useState } from "react";
import { fundWallet, refreshWallet } from "../lib/ui/actions";
import type { ApiFailure, WalletView } from "../lib/ui/api";
import { formatUsdc } from "../lib/ui/format";
import { Spinner, PrimaryButton, SecondaryButton } from "./ui";
import { WalletAddress } from "./WalletAddress";

export function FundWallet({
  wallet,
  onUpdated,
  onComplete,
}: {
  wallet: WalletView;
  onUpdated: (wallet: WalletView) => void;
  onComplete?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [manual, setManual] = useState(wallet.status === "funded");

  async function fund() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await fundWallet();
      if (result.wallet) onUpdated(result.wallet);
      if (result.code === "FAUCET_PENDING") {
        setManual(true);
        setMessage("Funding was submitted and is not confirmed yet. Check the balance before retrying.");
        return;
      }
      setMessage("Funding confirmed. Your testnet USDC is on chain.");
      onComplete?.();
    } catch (failure) {
      const apiFailure = failure as ApiFailure;
      const body = apiFailure.body as { wallet?: WalletView } | undefined;
      if (body?.wallet) onUpdated(body.wallet);
      if (apiFailure.code === "ALREADY_FUNDED") {
        setManual(true);
        setMessage("The one-time faucet grant for this wallet has already been used. Send testnet USDC to the address below, then check the balance.");
      } else if (apiFailure.code === "FAUCET_TREASURY_EMPTY") {
        setManual(true);
        setMessage("The faucet treasury is empty. Send testnet USDC to your address below, then check the balance.");
      } else if (apiFailure.code === "FAUCET_DAILY_CAP") {
        setManual(true);
        setMessage("The daily treasury cap has been reached. Send testnet USDC to your address below, then check the balance.");
      } else if (apiFailure.code === "FAUCET_PENDING") {
        setManual(true);
        setMessage("Funding was submitted and is not confirmed yet. Check the balance before retrying.");
      } else {
        setError(apiFailure.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setChecking(true);
    setError(null);
    try {
      const view = await refreshWallet();
      onUpdated(view);
      if (view.step === "complete") {
        setMessage("Balance confirmed. Your wallet is funded.");
        onComplete?.();
      } else {
        setMessage("No USDC has arrived yet. Wait for the transfer and check again.");
      }
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="stack">
      <div className="panel panel-pad">
        <div className="micro">Faucet</div>
        <div className="budget-number" style={{ marginTop: 4 }}>
          <span className="money" style={{ fontSize: 28.0, fontWeight: 600 }}>{formatUsdc(wallet.faucetAmountBaseUnits)}</span>
          <span className="of">testnet USDC</span>
        </div>
        <p className="fine-note">
          One grant per wallet, capped by the treasury daily limit. This is real testnet USDC, not real money.
        </p>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {message ? <p className="explain-panel" style={{ marginTop: 10 }}>{message}</p> : null}
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <PrimaryButton className="" type="button" onClick={() => void fund()} disabled={busy || checking}>
            {busy ? "Sending…" : "Fund from faucet"}
            {busy ? <Spinner /> : null}
          </PrimaryButton>
          {manual ? (
            <SecondaryButton className="" type="button" onClick={() => void check()} disabled={busy || checking}>
              {checking ? "Checking…" : "Check balance"}
            </SecondaryButton>
          ) : null}
        </div>
      </div>
      <WalletAddress address={wallet.address} />
    </div>
  );
}
