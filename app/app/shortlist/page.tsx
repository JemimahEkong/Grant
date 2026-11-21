"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useProjects } from "../../../components/providers";
import { EmptyState, PageHeader, Spinner } from "../../../components/ui";
import { TrackCard } from "../../../components/track-card";
import { rankShortlist } from "../../../lib/catalog/shortlist";
import { createQuote, getCatalog, getProject } from "../../../lib/ui/actions";
import type { CatalogItem, CatalogResponse, ProjectView } from "../../../lib/ui/api";
import { formatUsdc } from "../../../lib/ui/format";

export default function ShortlistPage() {
  const router = useRouter();
  const { selectedProject, selectedProjectId } = useProjects();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [projectView, setProjectView] = useState<ProjectView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) return;
    let active = true;
    Promise.all([getCatalog(), getProject(selectedProjectId)])
      .then(([catalogResponse, projectResponse]) => {
        if (!active) return;
        setCatalog(catalogResponse);
        setProjectView(projectResponse);
      })
      .catch(failure => {
        if (active) setError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const brief = selectedProject?.briefSnapshot;
  const available = projectView ? BigInt(projectView.budget.availableBaseUnits) : 0n;
  const result = useMemo(
    () => (catalog && brief ? rankShortlist(catalog.items, brief, available) : null),
    [available, brief, catalog],
  );

  async function review(item: CatalogItem) {
    if (!selectedProjectId) return;
    setQuoteError(null);
    setBusyId(item.trackId);
    try {
      const outcome = await createQuote(selectedProjectId, {
        trackId: item.trackId,
        offerId: item.offerId,
        offerVersion: item.offerVersion,
        kind: "base",
        idempotencyKey: crypto.randomUUID(),
      });
      if (outcome.purchase) {
        router.push(`/app/purchase/${outcome.purchase.id}`);
      } else {
        setQuoteError(outcome.reasons?.[0]?.message ?? "The quote was refused before a purchase record was created.");
      }
    } catch (failure) {
      setQuoteError((failure as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (!selectedProject) {
    return (
      <>
        <PageHeader title="Shortlist" lede="Eight tracks ranked against your brief, with a reason you can check." />
        <EmptyState
          title="Create a brief first"
          description="The shortlist is ranked from a real brief. A project gives the ranking something to compare."
          action={
            <Link href="/app/new" className="btn btn-primary">
              Create a project
            </Link>
          }
        />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Shortlist" lede="Eight tracks ranked against your brief, with a reason you can check." />
        <EmptyState
          title="Shortlist unavailable"
          description={error}
          action={
            <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>
              Try again
            </button>
          }
        />
      </>
    );
  }

  if (!catalog || !projectView || !result) {
    return (
      <>
        <PageHeader title="Shortlist" lede="Eight tracks ranked against your brief, with a reason you can check." />
        <div className="stack">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </>
    );
  }

  const budget = projectView.budget;
  const atPurchaseLimit = budget.purchasesUsed >= budget.purchaseCountCap;

  return (
    <>
      <PageHeader
        title="Shortlist"
        lede={`${result.entries.length} tracks for this brief, ranked by license fit and the terms you asked for. Every reason comes from the offer.`}
      />

      <div className="shortlist-budget">
        <span>{formatUsdc(available)} USDC left in this project</span>
        <span>
          {budget.purchasesUsed} of {budget.purchaseCountCap} purchases used
        </span>
      </div>

      {atPurchaseLimit ? (
        <div className="explain-panel" role="status">
          <div className="h">Purchase limit reached</div>
          <p>This project has used all of its purchase slots. Review will fail closed. Create a new brief to buy again.</p>
        </div>
      ) : null}

      {quoteError ? (
        <div className="refused-panel" role="alert">
          <div className="h">Quote refused</div>
          <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5 }}>{quoteError}</p>
        </div>
      ) : null}

      {result.entries.length === 0 ? (
        <EmptyState
          title="No track covers this brief"
          description={
            result.diagnosis
              ? `${result.diagnosis.message} ${result.diagnosis.relaxation}`
              : "No track matches this brief. Widen one requirement and try again."
          }
          action={
            <Link href="/app/new" className="btn btn-secondary">
              Adjust the brief
            </Link>
          }
        />
      ) : (
        <>
          <div className="shortlist-cards">
            {result.entries.map(entry => (
              <TrackCard
                key={entry.item.trackId}
                item={entry.item}
                reason={entry.reason}
                onReview={item => void review(item)}
                busy={busyId === entry.item.trackId}
              />
            ))}
          </div>

          {result.matchingCount > result.entries.length ? (
            <div className="shortlist-more">
              <Link href="/app/catalog" className="btn btn-secondary">
                Show all {result.matchingCount} matching tracks
              </Link>
            </div>
          ) : null}
        </>
      )}

      <p className="fine-note">
        Reviewing a track creates a quote. It does not reserve budget, sign, or charge. The shortlist is a ranking, not
        a license.
      </p>

      {busyId ? (
        <div className="status-line" aria-live="polite">
          <Spinner /> <span>Creating the exact quote</span>
        </div>
      ) : null}
    </>
  );
}
