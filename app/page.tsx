import Link from "next/link";
import { demoTracks } from "../demo/catalog";
import { Chip, ClearanceStrip, Legend, Logo } from "../components/ui";
import { getDatabase } from "../lib/db/client";
import { getPublicProof } from "../lib/documents/share";
import { formatDuration, formatUsdc } from "../lib/ui/format";
import { buildProofStrip } from "../lib/ui/strip";
import { ArrowRightIcon, AudioIcon, PdfIcon, ProofIcon } from "../components/icons";
import type { StripSegment } from "../lib/ui/strip";

const heroStrip: StripSegment[] = [
  { label: "Insta TikTok", covered: true },
  { label: "90 days", covered: true },
  { label: "World wide", covered: true },
  { label: "Client delivery", covered: true },
  { label: "Repost", covered: false },
  { label: "Future", covered: false },
];

const explainerStrip: StripSegment[] = [
  { label: "Instagram", covered: true },
  { label: "TikTok", covered: true },
  { label: "90 days", covered: true },
  { label: "Worldwide", covered: true },
  { label: "Reposting", covered: false },
  { label: "Future campaigns", covered: false },
];

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const proofPath = process.env.DEMO_PROOF_PATH;
  let proof = null;
  if (proofPath) {
    const token = proofPath.split("/").filter(Boolean).pop();
    if (token) {
      try {
        proof = await getPublicProof(getDatabase(), token);
      } catch {
        proof = null;
      }
    }
  }
  const heroTrack = proof ? demoTracks.find(track => track.id === proof.trackId) ?? null : null;
  const heroSegments = proof ? buildProofStrip(proof.license.coverage) : heroStrip;
  const heroTitle = proof?.track.title ?? "Quiet Cut";
  const heroSeller = proof
    ? `${proof.track.sellerName}${heroTrack ? ` · ${formatDuration(heroTrack.durationSeconds)} · ${heroTrack.bpm ? `${heroTrack.bpm} BPM` : "beatless"}` : ""}`
    : "Northline Audio · 0:48 · beatless";
  const heroPrice = proof ? formatUsdc(proof.payment.amountBaseUnits) : "1.00";
  const heroLicense = proof?.license.number ?? "GRANT-2026-74E7341FC8";
  return (
    <div className="page">
      <div className="landing-wrap">
        <nav className="landing-nav" aria-label="Main">
          <Logo />
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#catalog">Catalog</a>
            <a href="#sample">Sample license</a>
          </div>
          <Link href="/signin" className="btn btn-secondary" style={{ minHeight: 32, padding: "7px 12px", fontSize: 13 }}>
            Sign in
          </Link>
        </nav>

        <section className="landing-hero" id="sample">
          <div className="hero-copy">
            <div className="eyebrow">Music clearance for freelance editors</div>
            <h1>
              Know what you can use
              <br />
              <em>before you export.</em>
            </h1>
            <p className="hero-sub">
              Grant shows exactly what a track's license covers, refuses when it doesn't cover your cut, and pays
              only after you approve the terms.
            </p>
            <div className="hero-ctas">
              <Link href="/signin?mode=signup&next=%2Fapp%2Fnew" className="btn btn-primary">
                Start a demo project
              </Link>
              {proofPath ? (
                <Link href={proofPath} className="btn btn-secondary">
                  See a real license
                </Link>
              ) : (
                <span className="btn btn-secondary" aria-disabled="true" title="Available after a settled purchase">
                  See a real license
                </span>
              )}
            </div>
            <div className="hero-micro">Testnet USDC · no card · one approval per purchase</div>
          </div>

          <div className="hero-card-wrap"><div className="hero-float-note"><span className="tick"><ProofIcon className="nav-icon" /></span><span>Terms checked<strong>Before you pay</strong></span></div>
            <div className="license-card"><div className="license-eyebrow"><span>GRANT / CLEARANCE</span><span>TESTNET</span></div>
              <div className="license-card-head">
                <div>
                  <h2>{heroTitle}</h2>
                  <p>{heroSeller}</p>
                </div>
                <div className="license-card-price">{heroPrice}<small>USDC</small></div>
              </div>
              <div style={{ marginTop: 14 }}>
                <ClearanceStrip segments={heroSegments} />
              </div>
              <div className="license-card-foot">
                <span className="id">{heroLicense}</span>
                <Chip tone="settled">Settled</Chip>
              </div>
            </div><div className="hero-mini-receipt"><span className="micro">One approval. Three deliverables.</span><div><span>Audio</span><span>License PDF</span><span>Proof link</span></div></div>
          </div>
        </section>

        <div className="refusal-band" role="note">
          <div className="x" aria-hidden="true">✕</div>
          <p>
            <strong>Studio Pulse — paid ads not offered.</strong> Grant refused the quote instead of selling coverage
            the track doesn't have. No signature. No reservation. No receipt.
          </p>
        </div>

        <section className="landing-section" id="how">
          <div className="section-head">
            <div>
              <div className="micro">How it works</div>
              <h2>Three screens. No surprises.</h2>
            </div>
            <p className="section-desc">No account manager, no email thread, no invoice in ten days.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="n">01</div>
              <div className="h">Describe the cut</div>
              <div className="d">90 seconds, Instagram and TikTok, 90 days, for Harbor Athletics. Editable terms, not prose.</div>
            </div>
            <div className="step">
              <div className="n">02</div>
              <div className="h">See the edges</div>
              <div className="d">Covered and excluded side by side, with the price and the budget it leaves behind. Approve the exact terms or walk.</div>
            </div>
            <div className="step">
              <div className="n">03</div>
              <div className="h">Leave with a license</div>
              <div className="d">Audio, a PDF with the terms, and a proof link your client can open without an account.</div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="catalog">
          <div className="section-head">
            <div>
              <div className="micro">The strip</div>
              <h2>
                Every license has edges.
                <br />
                Grant draws them.
              </h2>
            </div>
            <p className="section-desc">
              Most catalogs show a price and a vague "royalty free" badge. Coverage is where the money actually is.
            </p>
          </div>
          <div style={{ marginTop: 24 }}>
            <ClearanceStrip segments={explainerStrip} tall />
            <Legend />
          </div>
        </section>

        <section className="landing-section" id="delivery">
          <div className="section-head">
            <div>
              <div className="micro">Delivery</div>
              <h2>What you actually walk away with.</h2>
            </div>
            <p className="section-desc">
              Delivered only after settlement. A payment receipt is not a download link. It has to be both.
            </p>
          </div>
          <div className="deliverables">
            <div className="deliverable">
              <div className="deliverable-icon">
                <PdfIcon className="nav-icon" />
              </div>
              <div className="h">License PDF</div>
              <div className="d">The frozen terms you approved, the license ID, and the transaction that paid for it.</div>
            </div>
            <div className="deliverable">
              <div className="deliverable-icon">
                <AudioIcon className="nav-icon" />
              </div>
              <div className="h">Cleared audio</div>
              <div className="d">A short-lived link, issued only to the owner of a settled purchase. No public URLs.</div>
            </div>
            <div className="deliverable">
              <div className="deliverable-icon">
                <ProofIcon className="nav-icon" />
              </div>
              <div className="h">Proof link</div>
              <div className="d">Public, revocable, and thin: terms and chain reference. Never your client's name.</div>
            </div>
          </div>
        </section>

        <div className="safety-band">
          <div className="safety-cell">
            <div className="k">Approval</div>
            <div className="v">One human approval, bound to an exact quote fingerprint.</div>
          </div>
          <div className="safety-cell">
            <div className="k">Budget</div>
            <div className="v">Capped per project, reserved atomically before signing.</div>
          </div>
          <div className="safety-cell">
            <div className="k">Retries</div>
            <div className="v">Uncertain outcomes stay pending. Nothing re-signs itself.</div>
          </div>
        </div>

        <section className="landing-close">
          <div className="micro">Try it</div>
          <h2>
            The catalog is a fixture.
            <br />
            The refusals are real.
          </h2>
          <div className="close-row">
            <Link href="/signin?mode=signup&next=%2Fapp%2Fnew" className="btn btn-primary">
              Start a demo project
            </Link>
            {proofPath ? (
              <Link href={proofPath} className="muted" style={{ fontSize: 13 }}>
                or open a settled license <ArrowRightIcon className="nav-icon" />
              </Link>
            ) : null}
          </div>
        </section>

        <footer className="landing-footer">
          <span>Demo build · CC0 demo audio · testnet USDC only</span>
          <span>Shows license terms. Not legal advice.</span>
        </footer>
      </div>
    </div>
  );
}
