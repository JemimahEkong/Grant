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
            <div className="eyebrow">Music licensing for freelance editors</div>
            <h1>
              Know what you can use
              <br />
              <em>before you export.</em>
            </h1>
            <p className="hero-sub">
              Find a track, see exactly what its license lets you do, and pay for it once. If it won't
              cover your video, Grant says so before you spend anything.
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
            <div className="hero-micro">Test money only · no card · you approve every payment</div>
          </div>

          <div className="hero-card-wrap">
            <div className="hero-card-stage" aria-label="Example Grant clearance card">
              <div className="hero-stats-glass">
                <span className="hero-stats-label">Clearance</span>
                <strong>4 of 6</strong>
                <span className="hero-stats-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
              </div>
              <div className="license-card license-card-back">
                <div className="license-eyebrow"><span>PROJECT BUDGET</span><span>TESTNET</span></div>
                <div className="back-card-balance"><span>Available after license</span><strong>4.00 <small>USDC</small></strong></div>
                <div className="back-card-footer"><span>One approval</span><span>Bound terms</span></div>
              </div>
              <div className="license-card license-card-front"><div className="license-eyebrow"><span>GRANT / CLEARANCE</span><span>TESTNET</span></div>
                <div className="license-card-head">
                  <div>
                    <h2>{heroTitle}</h2>
                    <p>{heroSeller}</p>
                  </div>
                  <div className="license-card-price">{heroPrice}<small>USDC</small></div>
                </div>
                <ClearanceStrip segments={heroSegments} />
                <div className="license-card-foot">
                  <span className="id">{heroLicense}</span>
                  <Chip tone="settled">Settled</Chip>
                </div>
              </div>
              <div className="hero-float-note"><span className="tick"><ProofIcon className="nav-icon" /></span><span>Terms checked<strong>Before you pay</strong></span></div>
              <div className="hero-income-glass"><span>Delivered</span><strong>Audio + PDF + proof</strong></div>
            </div>
          </div>
        </section>

        <div className="refusal-band" role="note">
          <div className="x" aria-hidden="true">✕</div>
          <p>
            <strong>Studio Pulse doesn't cover paid ads.</strong> So Grant said no, told you which part
            didn't fit, and charged nothing.
          </p>
        </div>

        <section className="landing-section" id="how">
          <div className="section-head">
            <div>
              <div className="micro">How it works</div>
              <h2>Three steps. No email thread.</h2>
            </div>
            <p className="section-desc">Nobody to chase, and no invoice arriving next month.</p>
          </div>
          <div className="steps">
            <div className="step" data-step="1">
              <div className="n">01</div>
              <div className="h">Say what you're making</div>
              <div className="d">30 seconds, Instagram and TikTok, three months. Tap the details instead of writing a paragraph.</div>
            </div>
            <div className="step" data-step="2">
              <div className="n">02</div>
              <div className="h">See what's covered</div>
              <div className="d">Green means included, amber means it isn't. You see the price and what's left in your budget before you decide.</div>
            </div>
            <div className="step" data-step="3">
              <div className="n">03</div>
              <div className="h">Pay once, get your files</div>
              <div className="d">The audio, a one-page PDF of the license, and a link your client can open without an account.</div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="catalog">
          <div className="section-head">
            <div>
              <div className="micro">The strip</div>
              <h2>
                Every license stops somewhere.
                <br />
                You should see where.
              </h2>
            </div>
            <p className="section-desc">
              "Royalty free" tells you the price, not what you're allowed to do with it. A paid ad isn't the
              same as a post on Instagram.
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
              <h2>What you get when you pay.</h2>
            </div>
            <p className="section-desc">
              Nothing downloads until the payment goes through.
            </p>
          </div>
          <div className="deliverables">
            <div className="deliverable">
              <div className="deliverable-icon">
                <PdfIcon className="nav-icon" />
              </div>
              <div className="h">License PDF</div>
              <div className="d">One page with the terms you agreed to and the license number. Keep it, or send it to your client.</div>
            </div>
            <div className="deliverable">
              <div className="deliverable-icon">
                <AudioIcon className="nav-icon" />
              </div>
              <div className="h">The audio file</div>
              <div className="d">The full-quality track, ready to drop into your edit. The download link is private and expires.</div>
            </div>
            <div className="deliverable">
              <div className="deliverable-icon">
                <ProofIcon className="nav-icon" />
              </div>
              <div className="h">Proof link</div>
              <div className="d">A page your client can open without an account. It shows the terms, never your files or your client's name.</div>
            </div>
          </div>
        </section>

        <div className="safety-band">
          <div className="safety-cell">
            <div className="k">You approve the terms</div>
            <div className="v">Nothing is charged until you tap approve. That approval only works for that one purchase.</div>
          </div>
          <div className="safety-cell">
            <div className="k">A limit you set</div>
            <div className="v">Grant can't spend past your project budget, and it holds the money aside before paying.</div>
          </div>
          <div className="safety-cell">
            <div className="k">No accidental double charge</div>
            <div className="v">If a payment gets stuck, it waits to be checked instead of paying again.</div>
          </div>
        </div>

        <section className="landing-close">
          <div className="micro">Try it</div>
          <h2>
            The music is placeholder.
            <br />
            The rules are real.
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

      </div>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">Grant<span>.</span></div>
            <p>Music licensing for freelance editors. Know what a license covers before you export.</p>
            <div className="footer-social">
              <a href="https://github.com/JemimahEkong/Grant" target="_blank" rel="noreferrer">GitHub</a>
              <a href="https://stellar.org" target="_blank" rel="noreferrer">Stellar</a>
              <a href="https://developers.stellar.org/docs/build/agentic-payments/x402" target="_blank" rel="noreferrer">x402</a>
            </div>
            <div className="footer-copy">© Grant 2026 · All rights reserved</div>
          </div>
          <div className="footer-cols">
            <div>
              <h4>Product</h4>
              <a href="#how">How it works</a>
              <a href="#catalog">The clearance strip</a>
              <a href="#delivery">Delivery</a>
              <Link href="/signin?mode=signup&next=%2Fapp%2Fnew">Start a demo</Link>
            </div>
            <div>
              <h4>Built on</h4>
              <a href="https://stellar.org" target="_blank" rel="noreferrer">Stellar testnet</a>
              <a href="https://developers.stellar.org/docs/build/agentic-payments/x402" target="_blank" rel="noreferrer">x402 payments</a>
              <a href="https://www.x402.org/facilitator" target="_blank" rel="noreferrer">Facilitator</a>
              <a href="https://lab.stellar.org" target="_blank" rel="noreferrer">Stellar Lab</a>
            </div>
            <div>
              <h4>Project</h4>
              <a href="https://github.com/JemimahEkong/Grant" target="_blank" rel="noreferrer">GitHub</a>
              {proofPath ? <Link href={proofPath}>Sample license</Link> : null}
              <Link href="/signin">Sign in</Link>
              <Link href="/app">Open the app</Link>
            </div>
          </div>
        </div>
        <div className="footer-legal">
          <span>Demo build · CC0 demo audio · testnet USDC only</span>
          <span>Shows license terms. Not legal advice.</span>
        </div>
        <div className="footer-word" aria-hidden="true">Grant</div>
      </footer>
    </div>
  );
}
