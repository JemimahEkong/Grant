"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClearanceStrip, Legend, PageHeader, Spinner, StatusChip } from "../../../../components/ui";
import {
  approvePurchase,
  createAddonQuote,
  createShare,
  deliverPurchase,
  getCatalog,
  getDownloadUrl,
  getProject,
  getPurchase,
  getPurchaseAddons,
  getWallet,
  payPurchase,
  reconcilePurchase,
} from "../../../../lib/ui/actions";
import type { AddonAvailability, AddonOfferView, ApiFailure, CatalogResponse, ProjectView, PurchaseView, WalletView } from "../../../../lib/ui/api";
import { effectivePurchaseStatus, formatDate, formatDuration, formatUsdc, formatUsdcDecimal, shortHash, subtractBaseUnits, usdcAmountToBaseUnits } from "../../../../lib/ui/format";
import { buildExclusions, buildReviewStrip, platformsLabel } from "../../../../lib/ui/strip";

type PanelState = "none" | "disabled" | "pending" | "refused" | "expired";

export default function PurchasePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const purchaseId = params.id;
  const [view, setView] = useState<PurchaseView | null>(null);
  const [addonAvailability, setAddonAvailability] = useState<AddonAvailability | null>(null);
  const [addonBusy, setAddonBusy] = useState<string | null>(null);
  const [projectView, setProjectView] = useState<ProjectView | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState>("none");
  const [busy, setBusy] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState<"pdf" | "audio" | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const deliveryAttempted = useRef(false);

  const refresh = useCallback(async () => {
    const [next, addonNext] = await Promise.all([getPurchase(purchaseId), getPurchaseAddons(purchaseId)]);
    setView(next);
    setAddonAvailability(addonNext);
    if (next.purchase.projectId) {
      setProjectView(await getProject(next.purchase.projectId));
    }
    return next;
  }, [purchaseId]);

  useEffect(() => {
    let active = true;
    Promise.all([getPurchase(purchaseId), getCatalog(), getWallet(), getPurchaseAddons(purchaseId)])
      .then(async ([next, catalogResponse, walletView, addonResponse]) => {
        if (!active) return;
        setView(next);
        setCatalog(catalogResponse);
        setWallet(walletView);
        setAddonAvailability(addonResponse);
        if (next.purchase.projectId) {
          const project = await getProject(next.purchase.projectId);
          if (active) setProjectView(project);
        }
      })
      .catch(failure => {
        if (active) setError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, [purchaseId]);

  useEffect(() => {
    if (!view) return;
    const pdfReady = view.artifacts.some(artifact => artifact.kind === "license_pdf" && artifact.state === "ready");
    const audioReady = view.artifacts.some(artifact => artifact.kind === "audio" && artifact.state === "ready");
    if (["settled", "issuing"].includes(view.purchase.status) && (!pdfReady || !audioReady) && !deliveryAttempted.current) {
      deliveryAttempted.current = true;
      deliverPurchase(purchaseId)
        .then(() => refresh())
        .catch(failure => setDeliveryError((failure as Error).message));
    }
  }, [purchaseId, refresh, view]);

  const trackItem = catalog?.items.find(item => item.trackId === view?.purchase.trackId) ?? null;

  if (error) {
    return (
      <>
        <PageHeader title="Purchase" lede="This record could not be loaded." />
        <div className="empty-state">
          <div className="h">Record unavailable</div>
          <p className="d">{error}</p>
          <Link href="/app/purchases" className="btn btn-secondary">
            Back to purchases
          </Link>
        </div>
      </>
    );
  }

  if (!view) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    );
  }

  const purchase = view.purchase;
  const request = purchase.requestSnapshot;
  const offer = purchase.offerSnapshot;
  const strip = buildReviewStrip(request, offer);
  const exclusions = buildExclusions(request, offer);
  const title = view.track?.title ?? trackItem?.title ?? purchase.trackId;
  const seller = trackItem?.sellerName ?? offer.sellerId;
  const meta = `${seller}${trackItem ? ` · ${formatDuration(trackItem.durationSeconds)} · ${trackItem.bpm ? `${trackItem.bpm} BPM` : "beatless"}` : ""}`;
  const status = effectivePurchaseStatus(purchase);
  const isSettled = ["settled", "issuing", "ready"].includes(status);
  const isPending = ["reserved", "payment_pending"].includes(status);
  const isExpired = status === "expired";
  const isRefused = status === "refused" || status === "failed_no_settlement";
  const isReview = status === "quoted" || status === "approved";
  const budget = projectView?.budget;
  const afterApproval = budget ? subtractBaseUnits(budget.availableBaseUnits, purchase.priceBaseUnits) : null;
  const receipt = view.receipt;
  const license = view.license;
  const walletReady = wallet?.step === "complete";
  const canPay = Boolean(walletReady && wallet && usdcAmountToBaseUnits(wallet.balance) >= BigInt(purchase.priceBaseUnits));
  const purchaseLimitReached = Boolean(budget && budget.purchasesUsed >= budget.purchaseCountCap);
  const pdfReady = view.artifacts.some(artifact => artifact.kind === "license_pdf" && artifact.state === "ready");
  const audioReady = view.artifacts.some(artifact => artifact.kind === "audio" && artifact.state === "ready");

  async function approveAndPay() {
    setBusy(true);
    setActionError(null);
    setPanel("none");
    try {
      const approval = await approvePurchase(purchaseId);
      if (approval.outcome === "expired") {
        setPanel("expired");
        await refresh();
        return;
      }
      const payment = await payPurchase(purchaseId);
      const next = await refresh();
      if (payment.code === "PURCHASE_ALREADY_SETTLED" || payment.outcome === "settled" || ["settled", "issuing", "ready"].includes(next.purchase.status)) {
        setPanel("none");
        return;
      }
      if (payment.code === "PAYMENTS_DISABLED") {
        setPanel("disabled");
        return;
      }
      setPanel("pending");
    } catch (failure) {
      const apiFailure = failure as ApiFailure;
      if (apiFailure.code === "PAYMENTS_DISABLED") {
        setPanel("disabled");
        return;
      }
      if (apiFailure.code === "QUOTE_EXPIRED" || apiFailure.code === "PURCHASE_NOT_AWAITING_APPROVAL") {
        setPanel("expired");
        await refresh();
        return;
      }
      const policyCodes = (apiFailure.body as { reasons?: Array<{ code?: string }> } | undefined)?.reasons?.map(reason => reason.code) ?? [];
      if (
        apiFailure.code === "PROJECT_BUDGET_EXCEEDED" ||
        apiFailure.code === "PURCHASE_CAP_EXCEEDED" ||
        apiFailure.code === "PURCHASE_COUNT_CAP_EXCEEDED" ||
        policyCodes.includes("PURCHASE_COUNT_CAP_EXCEEDED")
      ) {
        setPanel("refused");
        await refresh();
        return;
      }
      if (["WALLET_NOT_FUNDED", "WALLET_EMPTY", "INSUFFICIENT_BALANCE"].includes(apiFailure.code)) {
        setWallet(await getWallet());
        setActionError(apiFailure.message);
        return;
      }
      setActionError(apiFailure.message || "The purchase could not continue.");
    } finally {
      setBusy(false);
    }
  }

  async function payApproved() {
    setBusy(true);
    setActionError(null);
    setPanel("none");
    try {
      const payment = await payPurchase(purchaseId);
      const next = await refresh();
      if (payment.code === "PAYMENTS_DISABLED") {
        setPanel("disabled");
        return;
      }
      if (payment.code === "PURCHASE_ALREADY_SETTLED" || payment.outcome === "settled" || ["settled", "issuing", "ready"].includes(next.purchase.status)) {
        return;
      }
      setPanel("pending");
    } catch (failure) {
      const apiFailure = failure as ApiFailure;
      if (apiFailure.code === "PAYMENTS_DISABLED") {
        setPanel("disabled");
      } else if (apiFailure.code === "PROJECT_BUDGET_EXCEEDED" || apiFailure.code === "PURCHASE_CAP_EXCEEDED") {
        setPanel("refused");
        await refresh();
      } else if (["WALLET_NOT_FUNDED", "WALLET_EMPTY", "INSUFFICIENT_BALANCE"].includes(apiFailure.code)) {
        setWallet(await getWallet());
        setActionError(apiFailure.message);
      } else {
        setActionError(apiFailure.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function checkAgain() {
    setReconciling(true);
    setActionError(null);
    try {
      const result = await reconcilePurchase(purchaseId);
      const next = await refresh();
      if (result.outcome === "settled" || ["settled", "issuing", "ready"].includes(next.purchase.status)) {
        setPanel("none");
      } else {
        setPanel("pending");
      }
    } catch (failure) {
      setActionError((failure as Error).message);
    } finally {
      setReconciling(false);
    }
  }

  async function prepareDownloads() {
    setDeliveryBusy(true);
    setDeliveryError(null);
    try {
      await deliverPurchase(purchaseId);
      await refresh();
    } catch (failure) {
      setDeliveryError((failure as Error).message);
    } finally {
      setDeliveryBusy(false);
    }
  }

  async function download(asset: "pdf" | "audio") {
    setDownloadBusy(asset);
    setDeliveryError(null);
    try {
      const result = await getDownloadUrl(purchaseId, asset);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (failure) {
      setDeliveryError((failure as Error).message);
    } finally {
      setDownloadBusy(null);
    }
  }

  async function createProof() {
    setShareBusy(true);
    setActionError(null);
    try {
      const result = await createShare(purchaseId);
      setShareUrl(result.url);
    } catch (failure) {
      setActionError((failure as Error).message);
    } finally {
      setShareBusy(false);
    }
  }

  async function copyProof() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      setActionError("Copy failed. Select the link and copy it manually.");
    }
  }

  async function reviewAddon(addon: AddonOfferView) {
    setAddonBusy(addon.offerId);
    setActionError(null);
    try {
      const outcome = await createAddonQuote(purchaseId, {
        offerId: addon.offerId,
        offerVersion: addon.offerVersion,
        idempotencyKey: crypto.randomUUID(),
      });
      if (outcome.purchase) {
        router.push(`/app/purchase/${outcome.purchase.id}`);
      } else {
        setActionError(outcome.reasons?.[0]?.message ?? "The add-on quote was refused.");
      }
    } catch (failure) {
      setActionError((failure as Error).message);
    } finally {
      setAddonBusy(null);
    }
  }

  return (
    <>
      <Link href="/app/catalog" className="back-link">
        ← Back to catalog
      </Link>
      <div className="review-head" style={{ marginTop: 10 }}>
        <div>
          <h1 className="review-title">{title}</h1>
          <div className="review-by">{meta}</div>
          {view.track?.provenanceReference ? (
            <div className="fine-note" style={{ marginTop: 4 }}>{view.track.provenanceReference}</div>
          ) : null}
        </div>
        <StatusChip status={status} />
      </div>
      <div className="review-price">
        <span className="p">{formatUsdc(purchase.priceBaseUnits)}</span>
        <span className="u">USDC · testnet · one purchase</span>
      </div>

      {isExpired ? (
        <>
          <div style={{ marginTop: 16 }}>
            <ClearanceStrip segments={strip} />
            <Legend />
          </div>
          <div className="explain-panel" role="status">
            <div className="h">Quote expired</div>
            <p>
              The five-minute quote window closed. Nothing was signed, reserved, or charged. Start a new review for a
              fresh price and approval.
            </p>
            <Link href="/app/catalog" className="btn btn-secondary" style={{ marginTop: 10 }}>
              Review another track
            </Link>
          </div>
        </>
      ) : null}

      {isReview || isPending || isRefused ? (
        <>
          <div style={{ marginTop: 16 }}>
            <ClearanceStrip segments={strip} />
            <Legend />
          </div>

          {isRefused ? (
            <div className="refused-panel" role="alert">
              <div className="h">Grant refused this quote</div>
              <ul>
                {(purchase.coverageSnapshot.result.reasons.length > 0
                  ? purchase.coverageSnapshot.result.reasons.map(reason => reason.message)
                  : view.refusal
                    ? [view.refusal.safeExplanation]
                    : []
                ).map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
              <p className="fine-note">No signature, reservation, or receipt was created for this refusal.</p>
              <Link href="/app/catalog" className="btn btn-secondary" style={{ marginTop: 10 }}>
                Review another track
              </Link>
            </div>
          ) : (
            <>
              <div className="exclusions">
                <div className="h">What this doesn't cover</div>
                <ul>
                  {exclusions.map((exclusion, index) => (
                    <li key={index}>{exclusion}</li>
                  ))}
                </ul>
              </div>

              <div className="budget-after">
                <span>{isPending ? "Budget reserved" : "Budget after approval"}</span>
                <b>
                  {formatUsdc(isPending ? purchase.priceBaseUnits : afterApproval ?? "0")} of{" "}
                  {formatUsdc(budget?.budgetBaseUnits ?? "0")}
                </b>
              </div>

              {wallet && wallet.step !== "complete" ? (
                <div className="explain-panel" role="status">
                  <div className="h">Finish wallet setup</div>
                  <p>Grant needs an activated, trustline-enabled, funded wallet before it can sign this purchase.</p>
                  <Link href={`/app/onboarding/${wallet.step}`} className="btn btn-secondary" style={{ marginTop: 10 }}>
                    Continue setup
                  </Link>
                </div>
              ) : null}

              {walletReady && !canPay ? (
                <div className="explain-panel" role="status">
                  <div className="h">Insufficient testnet balance</div>
                  <p>
                    Your wallet holds {formatUsdcDecimal(wallet?.balance ?? "0")} USDC. This license costs{" "}
                    {formatUsdc(purchase.priceBaseUnits)} USDC. Fund the wallet before approving.
                  </p>
                  <Link href="/app/wallet" className="btn btn-secondary" style={{ marginTop: 10 }}>
                    Open wallet
                  </Link>
                </div>
              ) : null}

              {purchaseLimitReached ? (
                <div className="explain-panel" role="status">
                  <div className="h">Purchase limit reached</div>
                  <p>
                    This project has used {budget?.purchasesUsed} of {budget?.purchaseCountCap} purchases. Refused and
                    expired entries do not consume a slot.
                  </p>
                  <Link href="/app/purchases" className="btn btn-secondary" style={{ marginTop: 10 }}>
                    View ledger
                  </Link>
                </div>
              ) : null}

              {panel === "disabled" ? (
                <div className="explain-panel" role="status">
                  <div className="h">Payments are paused</div>
                  <p>This deployment has payments disabled. The review is complete and nothing was signed.</p>
                </div>
              ) : null}

              {panel === "expired" ? (
                <div className="explain-panel" role="status">
                  <div className="h">Quote expired</div>
                  <p>The five-minute quote window closed. Start a new review for a fresh price and approval.</p>
                  <Link href="/app/catalog" className="btn btn-secondary" style={{ marginTop: 10 }}>
                    Review another track
                  </Link>
                </div>
              ) : null}

              {isPending || panel === "pending" ? (
                <div className="explain-panel" role="status">
                  <div className="h">Payment pending</div>
                  <p>
                    The attempt may have been submitted. Grant will not sign again or start a second payment. Check the
                    same attempt for a confirmed result.
                  </p>
                  <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => void checkAgain()} disabled={reconciling}>
                    {reconciling ? "Checking…" : "Check again"}
                  </button>
                </div>
              ) : null}

              {status === "quoted" && panel === "none" && canPay && !purchaseLimitReached ? (
                <>
                  <p className="fine-note">
                    You approve these exact terms. Nothing is charged, signed, or reserved until you approve.
                  </p>
                  <button className="btn btn-primary btn-wide" style={{ marginTop: 14 }} onClick={() => void approveAndPay()} disabled={busy}>
                    <span>{busy ? "Approving and starting payment…" : `Approve & pay ${formatUsdc(purchase.priceBaseUnits)}`}</span>
                    {busy ? <Spinner /> : <span aria-hidden="true">→</span>}
                  </button>
                </>
              ) : null}

              {status === "approved" && canPay && panel === "none" ? (
                <>
                  <p className="fine-note">Approved. The exact terms are bound to this purchase. Payment has not started.</p>
                  <button className="btn btn-primary btn-wide" style={{ marginTop: 14 }} onClick={() => void payApproved()} disabled={busy}>
                    <span>{busy ? "Starting payment…" : `Pay ${formatUsdc(purchase.priceBaseUnits)}`}</span>
                    {busy ? <Spinner /> : <span aria-hidden="true">→</span>}
                  </button>
                </>
              ) : null}

              {actionError ? (
                <p className="error-text" role="alert" style={{ marginTop: 12 }}>
                  {actionError}
                </p>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {isSettled ? (
        <>
          <div style={{ marginTop: 16 }}>
            <ClearanceStrip segments={strip} />
            <Legend />
          </div>

          {license ? (
            <div className="license-id">
              <div className="micro" style={{ marginBottom: 5 }}>License ID</div>
              <div className="id">{license.licenseNumber}</div>
              <div className="sub">
                Issued {formatDate(license.startsAt)} · bound to purchase {purchase.id.slice(0, 12)}…
              </div>
            </div>
          ) : null}

          {view.combinedCoverage?.baseLicense && (purchase.kind === "addon" || view.combinedCoverage.addonLicenses.length > 0) ? (
            <div className="exclusions" style={{ marginTop: 16 }}>
              <div className="h">Combined coverage</div>
              <div className="kv-list" style={{ marginTop: 0 }}>
                <div className="kv">
                  <span className="k">Organic</span>
                  <span className="v">{platformsLabel(view.combinedCoverage.organicPlatforms)}</span>
                </div>
                <div className="kv">
                  <span className="k">Paid ads</span>
                  <span className="v">{platformsLabel(view.combinedCoverage.paidAdPlatforms)}</span>
                </div>
                <div className="kv">
                  <span className="k">Term</span>
                  <span className="v">
                    {formatDate(view.combinedCoverage.startsAt)} to {formatDate(view.combinedCoverage.endsAt)}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Total paid</span>
                  <span className="v">{formatUsdc(view.combinedCoverage.totalBaseUnits)} USDC</span>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="micro">Licenses in this family</div>
                {[view.combinedCoverage.baseLicense, ...view.combinedCoverage.addonLicenses].map(item => (
                  <div className="fine-note" key={item.licenseId} style={{ marginTop: 5 }}>
                    {item.kind === "base" ? "Base" : "Add-on"} {item.licenseNumber} · {formatUsdc(item.amountBaseUnits)} USDC · tx {shortHash(item.transactionHash)}
                  </div>
                ))}
              </div>
              <p className="fine-note">
                The add-on has its own receipt. The base license keeps its original term, territory, and client terms.
              </p>
              {purchase.kind === "addon" && purchase.parentPurchaseId ? (
                <Link href={`/app/purchase/${purchase.parentPurchaseId}`} className="review-link" style={{ display: "inline-block", marginTop: 6 }}>
                  View base license →
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="download-list">
            <button className="download-row" type="button" onClick={() => void download("pdf")} disabled={!pdfReady || downloadBusy === "pdf"}>
              <div>
                <div className="t">License PDF</div>
                <div className="k">{pdfReady ? "Signed terms · private R2" : "Preparing the PDF"}</div>
              </div>
              <span className="download-arrow" aria-hidden="true">{downloadBusy === "pdf" ? "…" : "↓"}</span>
            </button>
            <button className="download-row" type="button" onClick={() => void download("audio")} disabled={!audioReady || downloadBusy === "audio"}>
              <div>
                <div className="t">Audio · MP3</div>
                <div className="k">{audioReady ? "Cleared for this use · private R2" : "Preparing the audio"}</div>
              </div>
              <span className="download-arrow" aria-hidden="true">{downloadBusy === "audio" ? "…" : "↓"}</span>
            </button>
          </div>

          {!pdfReady || !audioReady ? (
            <div className="explain-panel" role="status">
              <div className="h">{deliveryError ? "Delivery needs a retry" : "Preparing deliverables"}</div>
              <p>
                {deliveryError
                  ? "The license is settled. The files can be generated again without another payment."
                  : "The license is settled. Grant is preparing the private PDF and audio."}
              </p>
              <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => void prepareDownloads()} disabled={deliveryBusy}>
                {deliveryBusy ? "Preparing…" : "Prepare downloads"}
              </button>
            </div>
          ) : null}

          <div className="kv-list">
            <div className="kv">
              <span className="k">Network</span>
              <span className="v">{purchase.network}</span>
            </div>
            <div className="kv">
              <span className="k">Transaction</span>
              <span className="v">{shortHash(receipt?.transactionHash)}</span>
            </div>
            <div className="kv">
              <span className="k">Ledger</span>
              <span className="v">{receipt?.ledger ?? "—"}</span>
            </div>
            <div className="kv">
              <span className="k">Amount</span>
              <span className="v">{formatUsdc(receipt?.amountBaseUnits ?? purchase.priceBaseUnits)} USDC</span>
            </div>
          </div>

          {purchase.kind === "base" && isSettled && addonAvailability?.eligible && !purchaseLimitReached ? (
            <div className="explain-panel" style={{ marginTop: 16 }}>
              <div className="h">Add paid ads</div>
              {addonAvailability.addons.filter(addon => addon.available).map(addon => (
                <div key={addon.offerId} style={{ marginTop: 8 }}>
                  <p>
                    Adds paid-ad use on {platformsLabel(addon.platforms)}. The add-on ends with the base license on{" "}
                    {formatDate(addon.endsAt)}. Base term, territory, and client terms stay unchanged.
                  </p>
                  <div className="kv-list">
                    <div className="kv">
                      <span className="k">Adds</span>
                      <span className="v">Paid ads · {platformsLabel(addon.platforms)}</span>
                    </div>
                    <div className="kv">
                      <span className="k">Ends</span>
                      <span className="v">{formatDate(addon.endsAt)}</span>
                    </div>
                    <div className="kv">
                      <span className="k">Original terms</span>
                      <span className="v">Unchanged</span>
                    </div>
                    <div className="kv">
                      <span className="k">Price</span>
                      <span className="v">{formatUsdc(addon.amountBaseUnits)} USDC</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 10 }}
                    type="button"
                    onClick={() => void reviewAddon(addon)}
                    disabled={addonBusy !== null}
                  >
                    {addonBusy === addon.offerId ? "Creating add-on quote…" : `Review add-on · ${formatUsdc(addon.amountBaseUnits)}`}
                  </button>
                </div>
              ))}
              {addonAvailability.addons.some(addon => !addon.available) ? (
                <p className="fine-note">
                  Some offers are unavailable for this base license.{" "}
                  {addonAvailability.addons.flatMap(addon => addon.reasons.map(reason => reason.message)).join(" ")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="exclusions" style={{ marginTop: 14 }}>
            <div className="h">Proof link</div>
            {shareUrl ? (
              <>
                <input className="input mono" readOnly value={shareUrl} aria-label="Public proof link" onFocus={event => event.target.select()} />
                <div className="row" style={{ marginTop: 8, gap: 8 }}>
                  <button className="btn btn-secondary" type="button" onClick={() => void copyProof()}>
                    Copy link
                  </button>
                  <span className="fine-note" style={{ margin: 0 }}>Public, revocable, no audio.</span>
                </div>
              </>
            ) : (
              <>
                <p className="fine-note" style={{ marginTop: 0 }}>
                  Public and revocable. Shows terms and chain reference only, never your client's name or audio.
                </p>
                <button className="btn btn-secondary" type="button" onClick={() => void createProof()} disabled={shareBusy}>
                  {shareBusy ? "Creating…" : "Create proof link"}
                </button>
              </>
            )}
            {actionError ? (
              <p className="error-text" role="alert" style={{ marginTop: 8 }}>
                {actionError}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="status-line">
        <span className="status-dot" />
        <span>Payment state is durable. Pending does not re-sign.</span>
      </div>
    </>
  );
}
