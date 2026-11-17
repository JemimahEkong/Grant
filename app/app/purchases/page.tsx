"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProjects } from "../../../components/providers";
import { EmptyState, PageHeader, StatusChip } from "../../../components/ui";
import { getCatalog, getProject } from "../../../lib/ui/actions";
import type { CatalogResponse, ProjectView } from "../../../lib/ui/api";
import { formatDate, formatUsdc, statusMeta } from "../../../lib/ui/format";

type Filter = "all" | "settled" | "pending" | "refused";

export default function PurchasesPage() {
  const { selectedProject, selectedProjectId } = useProjects();
  const [view, setView] = useState<ProjectView | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!selectedProjectId) {
      setView(null);
      return;
    }
    Promise.all([getProject(selectedProjectId), getCatalog()])
      .then(([projectView, catalogResponse]) => {
        if (!active) return;
        setView(projectView);
        setCatalog(catalogResponse);
      })
      .catch(failure => {
        if (active) setError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const trackById = useMemo(() => new Map(catalog?.items.map(item => [item.trackId, item]) ?? []), [catalog]);
  const refusalByPurchase = useMemo(() => {
    const map = new Map<string, string>();
    view?.refusals.forEach(refusal => {
      if (refusal.purchaseId) map.set(refusal.purchaseId, refusal.safeExplanation);
    });
    return map;
  }, [view]);

  const purchases = view
    ? view.purchases.filter(purchase => {
        if (filter === "settled") return ["settled", "issuing", "ready"].includes(purchase.status);
        if (filter === "pending") return ["approved", "reserved", "payment_pending"].includes(purchase.status);
        if (filter === "refused") return ["refused", "expired", "failed_no_settlement"].includes(purchase.status);
        return true;
      })
    : [];

  if (!selectedProject) {
    return (
      <>
        <PageHeader title="Purchases" lede="Every settled, pending, and refused purchase lives here." />
        <EmptyState
          title="No project selected"
          description="Create a brief and Grant will keep a durable ledger of every purchase and refusal."
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
      <PageHeader title="Purchases" lede="A durable ledger. Pending stays pending until the chain is checked." />
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      {view ? (
        <>
          <div className="summary-card">
            <div>
              <div className="k">Spent this project</div>
              <div className="v">
                {formatUsdc(view.budget.confirmedSpendBaseUnits)}{" "}
                <span className="dim" style={{ fontSize: 9 }}>/ {formatUsdc(view.budget.budgetBaseUnits)}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="k">Left</div>
              <div className="v" style={{ color: "var(--text)" }}>{formatUsdc(view.budget.availableBaseUnits)}</div>
            </div>
          </div>

          <div className="filters" role="group" aria-label="Filter purchases">
            {[
              { value: "all", label: "All" },
              { value: "settled", label: "Settled" },
              { value: "pending", label: "Pending" },
              { value: "refused", label: "Refused" },
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

          {purchases.length === 0 ? (
            <EmptyState
              title={filter === "all" ? "No purchases yet" : "Nothing in this filter"}
              description={
                filter === "all"
                  ? "Review a track to create a quote. Refusals are recorded before any money moves."
                  : "Clear the filter to see the rest of the ledger."
              }
              action={
                filter === "all" ? (
                  <Link href="/app/catalog" className="btn btn-secondary">
                    Browse the catalog
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div>
              {purchases.map(purchase => {
                const track = trackById.get(purchase.trackId);
                const refused = ["refused", "expired", "failed_no_settlement"].includes(purchase.status);
                const meta = statusMeta(purchase.status);
                const reason = refusalByPurchase.get(purchase.id);
                return (
                  <Link key={purchase.id} href={`/app/purchase/${purchase.id}`} className="ledger-row">
                    <div className="ledger-main">
                      <div className="ledger-title">{track?.title ?? purchase.trackId}</div>
                      <div className="ledger-sub">
                        {formatDate(purchase.createdAt)} · {reason ?? `${purchase.requestSnapshot.platforms.join(", ")} · ${purchase.requestSnapshot.termDays} days`}
                      </div>
                    </div>
                    <div>
                      <div className="ledger-amount" style={{ color: meta.chipClass === "chip-pending" ? "var(--accent)" : refused ? "var(--dim)" : undefined }}>
                        {refused ? "—" : formatUsdc(purchase.priceBaseUnits)}
                      </div>
                      <StatusChip status={purchase.status} />
                    </div>
                    <span className="chev" aria-hidden="true">›</span>
                  </Link>
                );
              })}
            </div>
          )}
          <p className="fine-note">Pending stays pending until the chain is checked. Nothing retries itself.</p>
        </>
      ) : (
        <div className="stack">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}
    </>
  );
}
