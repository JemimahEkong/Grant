"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useProjects } from "../../../components/providers";
import { LazyMount } from "../../../components/lazy-mount";
import { TrackCard } from "../../../components/track-card";
import { EmptyState, PageHeader, Spinner, FilterChip } from "../../../components/ui";
import { createQuote, getCatalog } from "../../../lib/ui/actions";
import type { CatalogItem, CatalogResponse } from "../../../lib/ui/api";
import {
  activeFilterCount,
  availablePlatforms,
  discoverCatalog,
  filtersFromParams,
  moodOptions,
  pageFromParam,
  platformLabel,
  sortFromParam,
  type DiscoverySort,
  type DiscoveryUse,
} from "../../../lib/catalog/discovery";

const PAGE_SIZE = 24;
const filterKeys = ["q", "use", "platform", "term", "clip", "mood", "energy", "territory"];

function CatalogFallback() {
  return (
    <>
      <PageHeader title="Catalog" lede="Browse the catalog. Coverage varies per track. Review the edges before you approve." />
      <div className="stack">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogContent />
    </Suspense>
  );
}

function CatalogContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedProject, selectedProjectId } = useProjects();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCatalog()
      .then(response => {
        if (active) setCatalog(response);
      })
      .catch(failure => {
        if (active) setCatalogError((failure as Error).message);
      });
    return () => {
      active = false;
    };
  }, []);

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const filters = useMemo(
    () => filtersFromParams(params, selectedProject?.briefSnapshot),
    [params, selectedProject?.briefSnapshot],
  );
  const sort = sortFromParam(params.get("sort"));
  const requestedPage = pageFromParam(params.get("page"));
  const usingBrief = !filterKeys.some(key => params.has(key));
  const filtersActive = activeFilterCount(filters);

  const moods = useMemo(() => (catalog ? moodOptions(catalog.items) : []), [catalog]);
  const moodChoices = filters.mood !== "all" && !moods.includes(filters.mood) ? [filters.mood, ...moods] : moods;
  const items = useMemo(
    () => (catalog ? discoverCatalog(catalog.items, filters, sort) : []),
    [catalog, filters, sort],
  );
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function replaceParams(next: URLSearchParams) {
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setParam(key: string, value: string | number | undefined) {
    const next = new URLSearchParams(params);
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
    next.delete("page");
    replaceParams(next);
  }

  function setSort(value: DiscoverySort) {
    const next = new URLSearchParams(params);
    if (value === "relevance") next.delete("sort");
    else next.set("sort", value);
    next.delete("page");
    replaceParams(next);
  }

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    replaceParams(next);
  }

  function resetFilters() {
    replaceParams(new URLSearchParams());
  }

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

  const filterLabels = [
    filters.search ? `"${filters.search}"` : null,
    filters.use !== "all" ? (filters.use === "paid_ad" ? "paid ads" : "organic") : null,
    filters.platform !== "all" ? platformLabel(filters.platform) : null,
    filters.termDays ? `${filters.termDays}-day term` : null,
    filters.minClipSeconds ? `${filters.minClipSeconds}s clip` : null,
    filters.mood !== "all" ? `${filters.mood} mood` : null,
    filters.energy ? `energy ${filters.energy}+` : null,
    filters.territory !== "all" ? filters.territory.toUpperCase() : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <>
      <PageHeader title="Catalog" lede="Browse the catalog. Coverage varies per track. Review the edges before you approve." />
      <input
        className="input"
        type="search"
        aria-label="Search tracks by title, artist, genre, or mood"
        placeholder="Search title, artist, genre, or mood"
        value={filters.search}
        onChange={event => setParam("q", event.target.value)}
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
            onClick={() => setParam("use", option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>

      <div className="filter-grid" aria-label="Catalog filters">
        <label className="filter-field">
          <span>Platform</span>
          <select className="input" value={filters.platform} onChange={event => setParam("platform", event.target.value)}>
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
            onChange={event => setParam("term", event.target.value)}
          >
            <option value={0}>Any term</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>365 days</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Clip length</span>
          <select
            className="input"
            value={filters.minClipSeconds}
            onChange={event => setParam("clip", event.target.value)}
          >
            <option value={0}>Any clip</option>
            <option value={15}>Covers 15s</option>
            <option value={30}>Covers 30s</option>
            <option value={60}>Covers 60s</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Mood</span>
          <select className="input" value={filters.mood} onChange={event => setParam("mood", event.target.value)}>
            <option value="all">Any mood</option>
            {moodChoices.map(mood => (
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
            onChange={event => setParam("energy", event.target.value)}
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
            onChange={event => setParam("territory", event.target.value)}
          >
            <option value="all">Any territory</option>
            <option value="worldwide">Worldwide</option>
            <option value="us">Covers US</option>
            <option value="uk">Covers UK</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Sort</span>
          <select className="input" value={sort} onChange={event => setSort(event.target.value as DiscoverySort)}>
            <option value="relevance">Relevance</option>
            <option value="price">Price, low to high</option>
            <option value="duration">Shortest first</option>
          </select>
        </label>
      </div>

      <div className="catalog-count" aria-live="polite">
        <span>
          {!catalog
            ? "Loading tracks…"
            : `${items.length} ${items.length === 1 ? "track" : "tracks"}${
                filtersActive > 0 ? ` · ${filtersActive} ${filtersActive === 1 ? "filter" : "filters"}` : ""
              }${usingBrief ? " · defaults from your brief" : ""}${
                items.length > 0 ? ` · page ${page} of ${pageCount}` : ""
              }`}
        </span>
        {catalog && !usingBrief ? (
          <button className="link-button" type="button" onClick={resetFilters}>
            Reset filters
          </button>
        ) : null}
      </div>

      {quoteError ? (
        <div className="refused-panel" role="alert">
          <div className="h">Quote refused</div>
          <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5 }}>{quoteError}</p>
        </div>
      ) : null}

      {catalogError && !catalog ? (
        <EmptyState
          title="Catalog unavailable"
          description={`The catalog could not be loaded. ${catalogError}`}
          action={
            <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>
              Try again
            </button>
          }
        />
      ) : !catalog ? (
        <div className="stack">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No tracks match these filters"
          description={
            filterLabels.length
              ? `No track covers ${filterLabels.join(", ")}. Remove the narrowest filter, usually the platform or clip length.`
              : "No track matches the current brief. Try a wider term or a shorter clip."
          }
          action={
            <button className="btn btn-secondary" type="button" onClick={resetFilters}>
              Reset filters
            </button>
          }
        />
      ) : (
        <>
          {visible.map((item, index) => (
            <LazyMount key={item.trackId} priority={index < 2} placeholderHeight={210}>
              <TrackCard item={item} onReview={item => void review(item)} busy={busyId === item.trackId} />
            </LazyMount>
          ))}

          {pageCount > 1 ? (
            <nav className="pagination" aria-label="Catalog pages">
              <button className="btn btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </nav>
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
