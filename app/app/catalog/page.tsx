"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useProjects } from "../../../components/providers";
import { ClearanceStrip, EmptyState, PageHeader, Spinner, FilterChip, Card, LicenseCredit } from "../../../components/ui";
import { createQuote, getCatalog } from "../../../lib/ui/actions";
import type { CatalogItem, CatalogResponse } from "../../../lib/ui/api";
import { formatDuration, formatUsdc } from "../../../lib/ui/format";
import { buildCatalogStrip, coverageSummary } from "../../../lib/ui/strip";
import {
  activeFilterCount,
  availablePlatforms,
  discoverCatalog,
  emptyFilters,
  filtersFromBrief,
  moodOptions,
  platformLabel,
  type DiscoveryFilters,
  type DiscoverySort,
  type DiscoveryTerritory,
  type DiscoveryUse,
} from "../../../lib/catalog/discovery";
import type { Platform } from "../../../lib/licensing/schema";

const PAGE_SIZE = 24;

export default function CatalogPage() {
  const router = useRouter();
  const { selectedProject, selectedProjectId } = useProjects();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>(emptyFilters);
  const [sort, setSort] = useState<DiscoverySort>("relevance");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [usingBrief, setUsingBrief] = useState(false);
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

  const briefHash = selectedProject?.briefHash ?? null;
  useEffect(() => {
    if (!selectedProject) {
      setFilters(emptyFilters);
      setUsingBrief(false);
      return;
    }
    setFilters(filtersFromBrief(selectedProject.briefSnapshot));
    setUsingBrief(true);
    setShown(PAGE_SIZE);
  }, [selectedProject?.id, briefHash, selectedProject]);

  const moods = useMemo(() => (catalog ? moodOptions(catalog.items) : []), [catalog]);
  const items = useMemo(
    () => (catalog ? discoverCatalog(catalog.items, filters, sort) : []),
    [catalog, filters, sort],
  );
  const visible = items.slice(0, shown);
  const filtersActive = activeFilterCount(filters);

  function updateFilters(patch: Partial<DiscoveryFilters>) {
    setFilters(current => ({ ...current, ...patch }));
    setShown(PAGE_SIZE);
    setUsingBrief(false);
  }

  function resetFilters() {
    if (selectedProject) {
      setFilters(filtersFromBrief(selectedProject.briefSnapshot));
      setUsingBrief(true);
    } else {
      setFilters(emptyFilters);
      setUsingBrief(false);
    }
    setSort("relevance");
    setShown(PAGE_SIZE);
  }

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
        <PageHeader title="Catalog" lede="Browse the catalog. Coverage varies per track. That is the point." />
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
      <PageHeader title="Catalog" lede="Browse the catalog. Coverage varies per track. Review the edges before you approve." />
      <input
        className="input"
        type="search"
        aria-label="Search tracks by title, artist, genre, or mood"
        placeholder="Search title, artist, genre, or mood"
        value={filters.search}
        onChange={event => updateFilters({ search: event.target.value })}
      />

      <div className="filters" role="group" aria-label="Filter by use">
        {([
          { value: "all", label: "All uses" },
          { value: "organic", label: "Organic" },
          { value: "paid_ad", label: "Paid ads" },
        ] as Array<{ value: DiscoveryUse; label: string }>).map(option => (
          <FilterChip
            key={option.value}
            type="button"
            className={`filter${filters.use === option.value ? " on" : ""}`}
            aria-pressed={filters.use === option.value}
            onClick={() => updateFilters({ use: option.value })}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>

      <div className="filter-grid" aria-label="Catalog filters">
        <label className="filter-field">
          <span>Platform</span>
          <select
            className="input"
            value={filters.platform}
            onChange={event => updateFilters({ platform: event.target.value as Platform | "all" })}
          >
            <option value="all">Any platform</option>
            {availablePlatforms().map(platform => (
              <option key={platform} value={platform}>
                {platformLabel(platform)}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Term</span>
          <select
            className="input"
            value={filters.termDays}
            onChange={event => updateFilters({ termDays: Number(event.target.value) as DiscoveryFilters["termDays"] })}
          >
            <option value={0}>Any term</option>
            <option value={90}>Covers 90 days</option>
            <option value={180}>Covers 180 days</option>
            <option value={365}>Covers 365 days</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Clip length</span>
          <select
            className="input"
            value={filters.minClipSeconds}
            onChange={event =>
              updateFilters({ minClipSeconds: Number(event.target.value) as DiscoveryFilters["minClipSeconds"] })
            }
          >
            <option value={0}>Any clip</option>
            <option value={15}>Covers 15s</option>
            <option value={30}>Covers 30s</option>
            <option value={60}>Covers 60s</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Mood</span>
          <select
            className="input"
            value={filters.mood}
            onChange={event => updateFilters({ mood: event.target.value })}
          >
            <option value="all">Any mood</option>
            {moods.map(mood => (
              <option key={mood} value={mood}>
                {mood}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Energy</span>
          <select
            className="input"
            value={filters.energy}
            onChange={event => updateFilters({ energy: Number(event.target.value) as DiscoveryFilters["energy"] })}
          >
            <option value={0}>Any energy</option>
            <option value={1}>1 or more</option>
            <option value={2}>2 or more</option>
            <option value={3}>3 or more</option>
            <option value={4}>4 or more</option>
            <option value={5}>5</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Territory</span>
          <select
            className="input"
            value={filters.territory}
            onChange={event => updateFilters({ territory: event.target.value as DiscoveryTerritory })}
          >
            <option value="all">Any territory</option>
            <option value="worldwide">Worldwide</option>
            <option value="us">Covers US</option>
            <option value="uk">Covers UK</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Sort</span>
          <select
            className="input"
            value={sort}
            onChange={event => {
              setSort(event.target.value as DiscoverySort);
              setShown(PAGE_SIZE);
            }}
          >
            <option value="relevance">Relevance</option>
            <option value="price">Price, low to high</option>
            <option value="duration">Shortest first</option>
          </select>
        </label>
      </div>

      <div className="catalog-count" aria-live="polite">
        <span>
          {items.length} {items.length === 1 ? "track" : "tracks"}
          {filtersActive > 0 ? ` · ${filtersActive} ${filtersActive === 1 ? "filter" : "filters"}` : ""}
          {usingBrief ? " · defaults from your brief" : ""}
        </span>
        {filtersActive > 0 || !usingBrief ? (
          <button className="link-button" type="button" onClick={resetFilters}>
            Reset filters
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="refused-panel" role="alert">
          <div className="h">Quote refused</div>
          <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5 }}>{error}</p>
        </div>
      ) : null}

      {!catalog ? (
        <div className="stack">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No tracks match these filters"
          description="No track covers every selected term. Remove the narrowest filter, usually the platform or clip length."
          action={
            <button className="btn btn-secondary" type="button" onClick={resetFilters}>
              Reset filters
            </button>
          }
        />
      ) : (
        <>
          {visible.map(item => (
            <Card className="track-card" key={item.trackId}>
              <div className="track-card-head">
                <div>
                  <div className="nm">{item.title}</div>
                  <div className="track-meta">
                    {item.sourceAuthor ?? item.sellerName} · {formatDuration(item.durationSeconds)} ·{" "}
                    {item.bpm ? `${item.bpm} BPM` : "beatless"}
                  </div>
                  <LicenseCredit
                    licenseCode={item.licenseCode}
                    attributionText={item.attributionText}
                    sourceUrl={item.sourceUrl}
                  />
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
            </Card>
          ))}
          {visible.length < items.length ? (
            <button className="btn btn-secondary show-more" type="button" onClick={() => setShown(count => count + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, items.length - visible.length)} more of {items.length}
            </button>
          ) : null}
        </>
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
