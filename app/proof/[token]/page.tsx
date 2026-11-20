import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearanceStrip, LicenseCredit, Logo, TestnetBadge, Tick } from "../../../components/ui";
import { getDatabase } from "../../../lib/db/client";
import { getPublicProof } from "../../../lib/documents/share";
import { formatDate, formatUsdc, shortHash } from "../../../lib/ui/format";
import { buildProofStrip } from "../../../lib/ui/strip";

export const dynamic = "force-dynamic";

type ProofPageProps = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "License proof",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ProofPage({ params }: ProofPageProps) {
  const { token } = await params;
  const proof = await getPublicProof(getDatabase(), token);
  if (!proof) notFound();

  const strip = buildProofStrip(proof.license.coverage);
  const explorer = proof.payment.transactionHash
    ? `https://stellar.expert/explorer/testnet/tx/${proof.payment.transactionHash}`
    : null;

  return (
    <div className="page proof-page">
      <div className="proof-frame">
        <div className="proof-chrome">
          <div className="proof-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="proof-url">grant-roan.vercel.app/proof/{token.slice(0, 8)}…</div>
          <TestnetBadge />
        </div>

        <div className="proof-body">
          <div className="proof-left">
            <div className="proof-verified">
              <Tick />
              <span className="proof-label">Settled on Stellar testnet</span>
            </div>
            <h1 className="proof-title">{proof.track.title}</h1>
            <div className="proof-by">{proof.track.sellerName} · licensed for one client project</div>
            <LicenseCredit
              licenseCode={proof.track.licenseCode}
              attributionText={proof.track.attributionText}
              sourceUrl={proof.track.sourceUrl}
            />
            <div style={{ marginTop: 16 }}>
              <ClearanceStrip segments={strip} />
            </div>
            <p className="fine-note" style={{ marginTop: 16 }}>
              {proof.demoDisclosure}
            </p>
          </div>

          <div className="proof-right">
            <div className="kv">
              <span className="k">License</span>
              <span className="v">{proof.license.number}</span>
            </div>
            <div className="kv">
              <span className="k">Issued</span>
              <span className="v">{formatDate(proof.license.startsAt)}</span>
            </div>
            <div className="kv">
              <span className="k">Term</span>
              <span className="v">{proof.license.coverage.termDays} days</span>
            </div>
            <div className="kv">
              <span className="k">Territory</span>
              <span className="v">
                {proof.license.coverage.territory.worldwide
                  ? "Worldwide"
                  : proof.license.coverage.territory.countries.join(", ")}
              </span>
            </div>
            <div className="kv">
              <span className="k">Amount</span>
              <span className="v">{formatUsdc(proof.payment.amountBaseUnits)} USDC</span>
            </div>
            <div className="kv">
              <span className="k">Transaction</span>
              <span className="v">{shortHash(proof.payment.transactionHash)}</span>
            </div>
            {explorer ? (
              <div className="kv">
                <span className="k">Explorer</span>
                <span className="v">
                  <a href={explorer} target="_blank" rel="noreferrer" className="accent">
                    stellar.expert ↗
                  </a>
                </span>
              </div>
            ) : null}
            <p className="fine-note" style={{ marginTop: 14 }}>
              This page records the license terms that were purchased. It does not verify copyright ownership and it is
              not legal advice. Audio is not available on this page.
            </p>
          </div>
        </div>

        <div className="proof-foot">
          <span>Issued by Grant · proof is public, the audio isn't</span>
          <span>Revocable by the license holder</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 18 }}>
        <Logo />
        <Link href="/" className="muted" style={{ fontSize: 13 }}>
          Back to Grant
        </Link>
      </div>
    </div>
  );
}
