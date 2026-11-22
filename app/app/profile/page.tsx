"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMe, useProjects } from "../../../components/providers";
import { EmptyState, PageHeader, SecondaryButton, Row, GroupedList } from "../../../components/ui";
import {
  getWallet,
  getCatalog,
  getProject,
  getShareStatus,
  revokeShare,
  signOut,
} from "../../../lib/ui/actions";
import type { CatalogResponse, ProjectView, WalletView } from "../../../lib/ui/api";
import { formatUsdcDecimal, initials, shortAddress } from "../../../lib/ui/format";

type ExternalSeller = {
  url: string;
  healthy: boolean;
  service?: string;
  network?: string;
  offerCount?: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const { me } = useMe();
  const { projects, selectedProject, selectedProjectId, selectProjectId } = useProjects();
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [externalSellers, setExternalSellers] = useState<ExternalSeller[]>([]);
  const [view, setView] = useState<ProjectView | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [shareStatuses, setShareStatuses] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    getWallet()
      .then(result => {
        if (active) setWallet(result);
      })
      .catch(failure => {
        if (active) setError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/external-sellers", { cache: "no-store" })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error("External sellers unavailable"))))
      .then((body: { sellers?: ExternalSeller[] }) => {
        if (active) setExternalSellers(body.sellers ?? []);
      })
      .catch(() => {
        if (active) setExternalSellers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedProjectId) {
      setView(null);
      return;
    }
    Promise.all([getProject(selectedProjectId), getCatalog()])
      .then(async ([projectView, catalogResponse]) => {
        if (!active) return;
        setView(projectView);
        setCatalog(catalogResponse);
        const settled = projectView.purchases.filter(purchase =>
          ["settled", "issuing", "ready"].includes(purchase.status),
        );
        const statuses = await Promise.all(
          settled.map(async purchase => {
            try {
              const status = await getShareStatus(purchase.id);
              return [purchase.id, status.active] as const;
            } catch {
              return [purchase.id, false] as const;
            }
          }),
        );
        if (active) setShareStatuses(Object.fromEntries(statuses));
      })
      .catch(failure => {
        if (active) setError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const trackById = useMemo(() => new Map(catalog?.items.map(item => [item.trackId, item]) ?? []), [catalog]);

  async function revoke(purchaseId: string) {
    setBusyId(purchaseId);
    setError(null);
    try {
      await revokeShare(purchaseId);
      setShareStatuses(current => ({ ...current, [purchaseId]: false }));
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function logOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch (failure) {
      setError((failure as Error).message);
      setSigningOut(false);
    }
  }

  const settled = view?.purchases.filter(purchase => ["settled", "issuing", "ready"].includes(purchase.status)) ?? [];

  return (
    <>
      <PageHeader title="Profile" />
      <div className="profile-head">
        <div className="profile-avatar">{initials(me.user.name || me.user.email)}</div>
        <div>
          <div className="n">Hi, {me.user.name || "Grant user"}</div>
          <div className="e">{me.user.email}</div>
        </div>
      </div>

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <Link href="/app/new" className="profile-promo"><span className="micro">Made for your next cut</span><strong>Clear terms.<br />Confident exports.</strong><span className="promo-link">Create a brief <span aria-hidden="true">&#8599;</span></span></Link>

      <Link href="/app/wallet" className="wallet-card" style={{ display: "block" }}>
        <div className="row-between">
          <div className="k">Wallet · read-only</div>
          <span className="muted" style={{ fontSize: 13 }}>Open wallet ›</span>
        </div>
        <div className="ad" title={wallet?.address ?? undefined}>
          {wallet?.address ? shortAddress(wallet.address) : "not configured"}
        </div>
        <div className="bt">
          <div className="v">{wallet ? formatUsdcDecimal(wallet.balance) : "—"}</div>
          <div className="l">{wallet?.network ?? "stellar:testnet"} · testnet USDC</div>
        </div>
      </Link>


      <div className="section-label" style={{ marginTop: 20 }}>
        <span className="micro">Projects</span>
        <Link href="/app/new" className="muted" style={{ fontSize: 13 }}>
          New project
        </Link>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          title="No projects"
          description="A project holds one confirmed brief, a budget, and a purchase cap."
          action={
            <Link href="/app/new" className="btn btn-secondary">
              Create a project
            </Link>
          }
        />
      ) : (
        <GroupedList>
          {projects.map(project => (
            <button
              key={project.id}
              type="button"
              className="list-row"
              style={{ width: "100%", background: "transparent", border: 0, textAlign: "left" }}
              onClick={() => selectProjectId(project.id)}
            >
              <span>{project.publicDisplayLabel}</span>
              {project.id === selectedProjectId ? <span className="micro">Active</span> : <span className="m">Select ›</span>}
            </button>
          ))}
        </GroupedList>
      )}

      <div className="section-label" style={{ marginTop: 20 }}>
        <span className="micro">Share links</span>
        <span className="muted" style={{ fontSize: 13 }}>
          {settled.filter(purchase => shareStatuses[purchase.id]).length} live
        </span>
      </div>
      {settled.length === 0 ? (
        <p className="fine-note" style={{ margin: 0 }}>
          Share links appear after a settled license. They are public, revocable, and never expose audio.
        </p>
      ) : (
        <div>
          {settled.map(purchase => {
            const track = trackById.get(purchase.trackId);
            const live = shareStatuses[purchase.id];
            return (
              <Row key={purchase.id} className="list-row">
                <span>
                  {track?.title ?? purchase.trackId}
                  <span className="m" style={{ display: "block", marginTop: 2 }}>
                    {live ? "Live proof link" : "No active link"}
                  </span>
                </span>
                {live ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: 30, padding: "5px 10px", fontSize: 13 }}
                    disabled={busyId === purchase.id}
                    onClick={() => void revoke(purchase.id)}
                  >
                    {busyId === purchase.id ? "Revoking…" : "Revoke"}
                  </button>
                ) : (
                  <Link href={`/app/purchase/${purchase.id}`} className="muted" style={{ fontSize: 13 }}>
                    Open license
                  </Link>
                )}
              </Row>
            );
          })}
        </div>
      )}

      <div className="section-label" style={{ marginTop: 20 }}>
        <span className="micro">External sellers</span>
        <span className="muted" style={{ fontSize: 13 }}>
          Read only
        </span>
      </div>
      <GroupedList>
        {externalSellers.length === 0 ? (
          <Row className="list-row">
            <span>
              No external sellers configured
              <span className="m" style={{ display: "block", marginTop: 2 }}>
                Set EXTERNAL_SELLER_URLS to list them here.
              </span>
            </span>
          </Row>
        ) : (
          externalSellers.map(seller => (
            <Row key={seller.url} className="list-row">
              <span>
                {seller.url.replace(/^https?:\/\//, "")}
                <span className="m" style={{ display: "block", marginTop: 2 }}>
                  {seller.healthy
                    ? `${seller.service ?? "seller"} · ${seller.offerCount ?? 0} offers · ${seller.network ?? "stellar:testnet"}`
                    : "Health check failed"}
                </span>
              </span>
              <span className={seller.healthy ? "micro" : "muted"}>
                {seller.healthy ? "Online" : "Offline"}
              </span>
            </Row>
          ))
        )}
      </GroupedList>

      <div className="section-label" style={{ marginTop: 20 }}>
        <span className="micro">Sell music</span>
      </div>
      <Link href="/app/sellers/apply" className="list-row" style={{ width: "100%" }}>
        <span>
          Apply to sell music
          <span className="m" style={{ display: "block", marginTop: 2 }}>
            Manual review. No payout and no auto-approval.
          </span>
        </span>
        <span className="m">Submit ›</span>
      </Link>

      <div style={{ marginTop: 22 }}>
        <SecondaryButton className="btn-wide signout-button" type="button" onClick={() => void logOut()} disabled={signingOut}>
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
          <span aria-hidden="true">→</span>
        </SecondaryButton>
      </div>
      <p className="fine-note">
        {selectedProject ? `Showing share links for ${selectedProject.publicDisplayLabel}.` : "Select a project to see its share links."}
      </p>
    </>
  );
}
