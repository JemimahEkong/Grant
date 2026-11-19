"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FundWallet } from "../../../components/FundWallet";
import { EmptyState, PageHeader, TestnetBadge, GroupedList, SecondaryButton } from "../../../components/ui";
import { getWallet, getWalletTransactions, refreshWallet } from "../../../lib/ui/actions";
import type { WalletTransaction, WalletView } from "../../../lib/ui/api";
import { formatDate, formatUsdcDecimal, shortHash } from "../../../lib/ui/format";

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getWallet(), getWalletTransactions()])
      .then(([view, tx]) => {
        if (!active) return;
        if (view.step !== "complete") {
          router.replace(`/app/onboarding/${view.step}`);
          return;
        }
        setWallet(view);
        setTransactions(tx.transactions);
      })
      .catch(failure => {
        if (active) setError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const view = await refreshWallet();
      setWallet(view);
      const tx = await getWalletTransactions();
      setTransactions(tx.transactions);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <>
        <PageHeader title="Wallet" lede="Your Stellar testnet account." />
        <EmptyState title="Wallet unavailable" description={error} action={<SecondaryButton className="" onClick={() => void refresh()}>Try again</SecondaryButton>} />
      </>
    );
  }

  if (!wallet) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: 160 }} />
        <div className="skeleton" />
      </div>
    );
  }

  return (
    <>
      <Link href="/app" className="back-link">← Back to home</Link>
      <div className="row-between" style={{ alignItems: "flex-start", marginTop: 10 }}>
        <PageHeader title="Wallet" lede="Address, live balance, funding, and on-chain history. Balance is read from Stellar and cached for at most 30 seconds." />
        <TestnetBadge />
      </div>

      <div className="wallet-overview">
        <div className="wallet-balance-card">
          <div className="row-between">
            <span className="micro">Live balance</span>
            <SecondaryButton className="" type="button" onClick={() => void refresh()} disabled={busy}>
              {busy ? "Refreshing…" : "Refresh"}
            </SecondaryButton>
          </div>
          <div className="budget-number" style={{ marginTop: 8 }}>
            <span className="big">{formatUsdcDecimal(wallet.balance)}</span>
            <span className="of">testnet USDC</span>
          </div>
          <div className="budget-meta" style={{ marginTop: 10 }}>
            <span>XLM {formatUsdcDecimal(wallet.xlm, 2)}</span>
            <span>{wallet.exists ? "On chain" : "Not activated"}</span>
          </div>
        </div>
      </div>

      <FundWallet wallet={wallet} onUpdated={setWallet} />

      <div className="section-label" style={{ marginTop: 22 }}>
        <span className="micro">Transaction history</span>
        <span className="muted" style={{ fontSize: 13 }}>stellar:testnet</span>
      </div>
      {transactions.length === 0 ? (
        <EmptyState title="No transactions yet" description="Your activation, trustline, faucet grant, and purchases will appear here." />
      ) : (
        <GroupedList className="tx-list">
          {transactions.map((tx, index) => (
            <div className="tx-row" key={`${tx.hash}-${tx.type}-${index}`}>
              <div className="tx-main">
                <div className="tx-title">{tx.label}</div>
                <div className="tx-sub">
                  {shortHash(tx.hash)} · {formatDate(tx.createdAt)} · {tx.successful ? "confirmed" : "failed"}
                </div>
              </div>
              <div className="tx-amount">
                {tx.amount ? `${tx.direction === "out" ? "−" : "+"}${tx.amount} ${tx.asset ?? ""}` : ""}
              </div>
            </div>
          ))}
        </GroupedList>
      )}

      <div className="explain-panel" style={{ marginTop: 20 }}>
        <div className="h">Custody disclosure</div>
        <p>{wallet.custody}</p>
      </div>
      <div className="status-line">
        <span>Testnet only. Never send real funds.</span>
      </div>
    </>
  );
}
