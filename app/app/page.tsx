"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useProjects } from "../../components/providers";
import { EmptyState, StatusChip, WaveThumb } from "../../components/ui";
import { getCatalog, getProject, getWallet } from "../../lib/ui/actions";
import type { CatalogResponse, ProjectView, WalletView } from "../../lib/ui/api";
import { budgetPercent, effectivePurchaseStatus, formatUsdc, formatUsdcDecimal, shortAddress } from "../../lib/ui/format";

export default function HomePage() {
  const router = useRouter();
  const { selectedProject, projects, selectedProjectId, selectProjectId, loading: projectsLoading } = useProjects();
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [view, setView] = useState<ProjectView | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getWallet()
      .then(result => {
        if (!active) return;
        setWallet(result);
        if (result.step !== "complete") router.replace(`/app/onboarding/${result.step}`);
      })
      .catch(failure => {
        if (active) setError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;
    if (!selectedProjectId) {
      setView(null);
      setProjectLoading(false);
      return;
    }
    setProjectLoading(true);
    Promise.all([getProject(selectedProjectId), getCatalog()])
      .then(([projectView, catalogResponse]) => {
        if (!active) return;
        setView(projectView);
        setCatalog(catalogResponse);
      })
      .catch(failure => {
        if (active) setError((failure as Error).message);
      })
      .finally(() => {
        if (active) setProjectLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const trackById = useMemo(() => new Map(catalog?.items.map(item => [item.trackId, item]) ?? []), [catalog]);

  if (error) return <EmptyState title="Could not load the workspace" description={error} />;
  if (!wallet || wallet.step !== "complete") {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" />
      </div>
    );
  }

  const budget = view?.budget;
  const spent = budget
    ? (BigInt(budget.confirmedSpendBaseUnits) + BigInt(budget.activeReservationsBaseUnits)).toString()
    : "0";
  const recent = view?.purchases.slice(0, 3) ?? [];

  return (
    <>
      {projectsLoading ? (
        <div className="skeleton" style={{ height: 62 }} />
      ) : projects.length > 0 && selectedProject ? (
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
              {projectLoading || !budget
                ? "Loading purchases…"
                : `${budget.purchasesUsed} of ${budget.purchaseCountCap} purchases used · ${formatUsdc(selectedProject.purchaseCapBaseUnits)} USDC per-purchase cap`}
            </div>
          </div>
          <span className="chev" aria-hidden="true">›</span>
        </div>
      ) : (
        <div className="project-switcher">
          <div>
            <div className="micro" style={{ marginBottom: 4 }}>Project</div>
            <div style={{ fontSize: 12.5, fontWeight: 560 }}>No project yet</div>
            <div className="muted" style={{ marginTop: 3, fontSize: 9.5 }}>Create a brief to start the clearance flow.</div>
          </div>
          <Link href="/app/new" className="review-link">Create →</Link>
        </div>
      )}

      <section className="budget-hero" aria-labelledby="wallet-heading">
        <div className="row-between">
          <div className="micro" id="wallet-heading">Wallet balance</div>
          <Link href="/app/wallet" className="muted" style={{ fontSize: 9.5 }}>Manage wallet ›</Link>
        </div>
        <div className="budget-number">
          <span className="big">{formatUsdcDecimal(wallet.balance)}</span>
          <span className="of">testnet USDC</span>
        </div>
        <div className="wallet-strip" style={{ marginTop: 14 }}>
          <div>
            <div className="k">On-chain · {wallet.network}</div>
            <div className="a">{shortAddress(wallet.address)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="b">{formatUsdcDecimal(wallet.balance)}</div>
            <div className="l">read from chain</div>
          </div>
        </div>
      </section>

      {projectLoading ? (
        <div className="stack" style={{ marginTop: 20 }}>
          <div className="skeleton" style={{ height: 90 }} />
          <div className="skeleton" style={{ height: 62 }} />
        </div>
      ) : view && budget ? (
        <section style={{ marginTop: 20 }} aria-labelledby="budget-heading">
          <div className="micro" id="budget-heading">Project budget left</div>
          <div className="budget-number" style={{ marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{formatUsdc(budget.availableBaseUnits)}</span>
            <span className="of">/ {formatUsdc(budget.budgetBaseUnits)} USDC</span>
          </div>
          <div className="budget-bar" aria-hidden="true">
            <i style={{ width: `${budgetPercent(spent, budget.budgetBaseUnits)}%` }} />
          </div>
          <div className="budget-meta">
            <span>Spent {formatUsdc(budget.confirmedSpendBaseUnits)} · reserved {formatUsdc(budget.activeReservationsBaseUnits)}</span>
            <span>Cap, not balance</span>
          </div>
        </section>
      ) : (
        <div className="explain-panel" style={{ marginTop: 20 }}>
          <div className="h">No project yet</div>
          <p>A project adds a spending cap, a purchase cap, and a confirmed brief. The wallet balance stays yours.</p>
          <Link href="/app/new" className="btn btn-secondary" style={{ marginTop: 10 }}>Create a project</Link>
        </div>
      )}

      {selectedProject ? (
        <Link href="/app/catalog" className="primary-action">
          <span>License a track</span>
          <small>from 1.00 USDC</small>
        </Link>
      ) : null}

      <div className="section-label" style={{ marginTop: 22 }}>
        <span className="micro">Recent</span>
        {selectedProject ? (
          <Link href="/app/purchases" className="muted" style={{ fontSize: 9.5 }}>All ›</Link>
        ) : null}
      </div>

      {projectLoading ? (
        <div className="stack">
          <div className="skeleton" style={{ height: 62 }} />
          <div className="skeleton" style={{ height: 62 }} />
        </div>
      ) : !view || recent.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          description="Review a track to see its exact coverage. A refusal is recorded before any money moves."
          action={
            <Link href={selectedProject ? "/app/catalog" : "/app/new"} className="btn btn-secondary">
              {selectedProject ? "Browse the catalog" : "Create a project"}
            </Link>
          }
        />
      ) : (
        <div className="recent-list">
          {recent.map(purchase => {
            const track = trackById.get(purchase.trackId);
            const status = effectivePurchaseStatus(purchase);
            const refused = ["refused", "expired", "failed_no_settlement"].includes(status);
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
                  <StatusChip status={status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="status-line">
        <span className="status-dot" />
        <span>Balance read from stellar:testnet · no real funds</span>
      </div>
    </>
  );
}
