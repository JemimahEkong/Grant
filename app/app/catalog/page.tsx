"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useProjects } from "../../../components/providers";
import { ClearanceStrip, EmptyState, PageHeader, Spinner } from "../../../components/ui";
import { createQuote, getCatalog } from "../../../lib/ui/actions";
import type { CatalogItem, CatalogResponse } from "../../../lib/ui/api";
import { formatDuration, formatUsdc } from "../../../lib/ui/format";
import { buildCatalogStrip, coverageSummary } from "../../../lib/ui/strip";

type Filter = "all" | "organic" | "paid_ad" | "short";

export default function CatalogPage() {
  const router = useRouter();
  const { selectedProject, selectedProjectId } = useProjects();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCatalog()
      .then(response => {
        if (active) setCatalog(response);
      })
      .catch(failure => {
        if (active) setError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => {
    if (!catalog) return [];
    return catalog.items.filter(item => {
      if (filter === "organic") return (item.platformsByUse.organic ?? []).length > 0;
      if (filter === "paid_ad") return (item.platformsByUse.paid_ad ?? []).length > 0;
      if (filter === "short") return item.maximumTermDays <= 90;
      return true;
    });
  }, [catalog, filter]);

  async function review(item: CatalogItem) {
    if (!selectedProjectId) return;
    setError(null);
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
        setError(outcome.reasons?.[0]?.message ?? "The quote was refused before a purchase record was created.");
      }
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (!selectedProject) {
    return (
      <>
        <PageHeader title="Catalog" lede="Three demo tracks with CC0 audio. Coverage varies per track. That is the point." />
        <EmptyState
          title="Create a brief first"
          description="The catalog checks every track against your confirmed brief. A project gives the quote something real to compare."
          action={
            <Link href="/app/new" className="btn btn-primary">
              Create a project
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Catalog" lede="Three demo tracks with CC0 audio. Coverage varies per track. Review the edges before you approve." />
      <div className="filters" role="group" aria-label="Filter tracks">
        {[
          { value: "all", label: "All" },
          { value: "organic", label: "Organic" },
          { value: "paid_ad", label: "Paid ads" },
          { value: "short", label: "≤ 90 days" },
        ].map(option => (
          <button
            key={option.value}
            type="button"
            className={`filter${filter === option.value ? " on" : ""}`}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value as Filter)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="refused-panel" role="alert">
          <div className="h">Quote refused</div>
          <p style={{ margin: "6px 0 0", fontSize: 10.5, lineHeight: 1.5 }}>{error}</p>
        </div>
      ) : null}

      {!catalog ? (
        <div className="stack">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No tracks match this filter" description="Clear the filter. The demo catalog has three tracks with different coverage." />
      ) : (
        items.map(item => (
          <article className="track-card" key={item.trackId}>
            <div className="track-card-head">
              <div>
                <div className="nm">{item.title}</div>
                <div className="track-meta">
                  {item.sellerName} · {formatDuration(item.durationSeconds)} · {item.bpm ? `${item.bpm} BPM` : "beatless"}
                </div>
                {item.sourceLabel ? <div className="track-meta" style={{ marginTop: 3 }}>{item.sourceLabel}</div> : null}
              </div>
              <div className="pr">{formatUsdc(item.amountBaseUnits)}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <ClearanceStrip segments={buildCatalogStrip(item)} />
            </div>
            <div className="track-foot">
              <span>{coverageSummary(item)}</span>
              <button className="review-link" type="button" onClick={() => void review(item)} disabled={busyId === item.trackId}>
                {busyId === item.trackId ? "Quoting…" : "Review →"}
              </button>
            </div>
          </article>
        ))
      )}
      <p className="fine-note">
        {catalog && catalog.items.length > 0 && catalog.items.every(item => !item.payeeConfigured)
          ? "Seller payee is not configured in this environment. Review works, but approval will fail closed."
          : "Reviewing a track creates a quote. It does not reserve budget, sign, or charge."}
      </p>
      {busyId ? (
        <div className="status-line" aria-live="polite">
          <Spinner /> <span>Creating the exact quote</span>
        </div>
      ) : null}
    </>
  );
}
