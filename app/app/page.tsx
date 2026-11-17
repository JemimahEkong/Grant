"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProjects } from "../../components/providers";
import { EmptyState, PageHeader, StatusChip, WaveThumb } from "../../components/ui";
import { getAgentWallet, getCatalog, getProject } from "../../lib/ui/actions";
import type { AgentWallet, CatalogResponse, ProjectView } from "../../lib/ui/api";
import { budgetPercent, formatUsdc, formatUsdcDecimal, shortAddress } from "../../lib/ui/format";

export default function HomePage() {
  const { selectedProject, projects, selectedProjectId, selectProjectId } = useProjects();
  const [view, setView] = useState<ProjectView | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    if (!selectedProjectId) {
      setView(null);
      return;
    }
    Promise.all([getProject(selectedProjectId), getCatalog(), getAgentWallet()])
      .then(([projectView, catalogResponse, walletResponse]) => {
        if (!active) return;
        setView(projectView);
        setCatalog(catalogResponse);
        setWallet(walletResponse);
      })
      .catch(failure => {
        if (!active) return;
        setError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const trackById = useMemo(() => {
    const map = new Map(catalog?.items.map(item => [item.trackId, item]) ?? []);
    return map;
  }, [catalog]);

  if (projects.length === 0) {
    return (
      <>
        <PageHeader title="Your workspace" lede="Create a project brief first. Then Grant can check coverage and quote a license." />
        <EmptyState
          title="No project yet"
          description="A project holds one confirmed brief, a budget, and a purchase cap. It takes one screen."
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
    return <EmptyState title="Could not load the workspace" description={error} />;
  }

  if (!view || !selectedProject) {
    return (
      <div className="stack">
        <div className="skeleton" />
        <div className="skeleton" style={{ height: 140 }} />
      </div>
    );
  }

  const budget = view.budget;
  const spent = (BigInt(budget.confirmedSpendBaseUnits) + BigInt(budget.activeReservationsBaseUnits)).toString();
  const settledCount = view.purchases.filter(purchase => ["settled", "issuing", "ready"].includes(purchase.status)).length;
  const recent = view.purchases.slice(0, 3);
  const left = budget.availableBaseUnits;

  return (
    <>
      <div className="project-switcher">
        <div className="grow">
          <div className="micro" style={{ marginBottom: 4 }}>Project</div>
          <select
            aria-label="Select project"
            value={selectedProjectId ?? ""}
            onChange={event => selectProjectId(event.target.value)}
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.publicDisplayLabel}
              </option>
            ))}
          </select>
          <div className="muted" style={{ marginTop: 3, fontSize: 9.5 }}>
            {settledCount} settled {settledCount === 1 ? "purchase" : "purchases"} · {formatUsdc(selectedProject.purchaseCapBaseUnits)} USDC per-purchase cap
          </div>
        </div>
        <span className="chev" aria-hidden="true">›</span>
      </div>

      <section className="budget-hero" aria-labelledby="budget-heading">
        <div className="micro" id="budget-heading">Budget left</div>
        <div className="budget-number">
          <span className="big">{formatUsdc(left)}</span>
          <span className="of">/ {formatUsdc(budget.budgetBaseUnits)} USDC</span>
        </div>
        <div className="budget-bar" aria-hidden="true">
          <i style={{ width: `${budgetPercent(spent, budget.budgetBaseUnits)}%` }} />
        </div>
        <div className="budget-meta">
          <span>Spent {formatUsdc(budget.confirmedSpendBaseUnits)} · reserved {formatUsdc(budget.activeReservationsBaseUnits)}</span>
          <span>Testnet only</span>
        </div>
      </section>

      <Link href="/app/catalog" className="primary-action">
        <span>License a track</span>
        <small>from 1.00 USDC</small>
      </Link>

      <div className="section-label" style={{ marginTop: 22 }}>
        <span className="micro">Recent</span>
        <Link href="/app/purchases" className="muted" style={{ fontSize: 9.5 }}>
          All ›
        </Link>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          description="Review a track to see its exact coverage. A refusal is recorded before any money moves."
          action={
            <Link href="/app/catalog" className="btn btn-secondary">
              Browse the catalog
            </Link>
          }
        />
      ) : (
        <div className="recent-list">
          {recent.map(purchase => {
            const track = trackById.get(purchase.trackId);
            const refused = ["refused", "expired", "failed_no_settlement"].includes(purchase.status);
            return (
              <Link key={purchase.id} href={`/app/purchase/${purchase.id}`} className="purchase-row">
                <WaveThumb />
                <div className="purchase-main">
                  <div className="purchase-title">{track?.title ?? purchase.trackId}</div>
                  <div className="purchase-sub">
                    {purchase.requestSnapshot.clipDurationSeconds}s · {purchase.requestSnapshot.platforms.join(", ")} · {purchase.requestSnapshot.termDays} days
                  </div>
                </div>
                <div>
                  <div className="purchase-amount" style={{ color: refused ? "var(--dim)" : undefined }}>
                    {refused ? "—" : formatUsdc(purchase.priceBaseUnits)}
                  </div>
                  <StatusChip status={purchase.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="wallet-strip">
        <div>
          <div className="k">Agent wallet · read-only</div>
          <div className="a">{wallet?.address ? shortAddress(wallet.address) : "not configured"}</div>
        </div>
        <div>
          <div className="b">{wallet?.balance ? formatUsdcDecimal(wallet.balance) : "—"}</div>
          <div className="l">testnet USDC</div>
        </div>
      </div>
      <div className="status-line">
        <span className="status-dot" />
        <span>Settling on stellar:testnet · no real funds</span>
      </div>
    </>
  );
}
