"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function WalletAddress({ address, compact = false }: { address: string | null; compact?: boolean }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) {
      setQr("");
      return;
    }
    QRCode.toString(address, {
      type: "svg",
      margin: 1,
      width: 150,
      color: { dark: getComputedStyle(document.documentElement).getPropertyValue("--ink").trim(), light: getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [address]);

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (!address) {
    return <p className="fine-note">No wallet address yet.</p>;
  }

  return (
    <div className={`wallet-address${compact ? " compact" : ""}`}>
      <div className="micro">Your Stellar address</div>
      <div className="wallet-address-text mono">{address}</div>
      <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button className="btn btn-secondary" type="button" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy address"}
        </button>
        <span className="micro">Stellar testnet</span>
      </div>
      {qr ? (
        <div
          className="wallet-qr"
          role="img"
          aria-label="QR code for your Stellar wallet address"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      ) : null}
    </div>
  );
}
