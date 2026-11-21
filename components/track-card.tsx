"use client";

import { Card, ClearanceStrip, LicenseCredit } from "./ui";
import { PreviewPlayer } from "./preview";
import type { CatalogItem } from "../lib/ui/api";
import { formatDuration, formatUsdc } from "../lib/ui/format";
import { buildCatalogStrip, coverageSummary } from "../lib/ui/strip";

export function TrackCard({
  item,
  reason,
  onReview,
  busy = false,
}: {
  item: CatalogItem;
  reason?: string;
  onReview?: (item: CatalogItem) => void;
  busy?: boolean;
}) {
  return (
    <Card className="track-card">
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
      <PreviewPlayer trackId={item.trackId} title={item.title} compact />
      <div style={{ marginTop: 10 }}>
        <ClearanceStrip segments={buildCatalogStrip(item)} />
      </div>
      <div className="track-foot">
        <span>{reason ?? coverageSummary(item)}</span>
        {onReview ? (
          <button className="review-link" type="button" onClick={() => onReview(item)} disabled={busy}>
            {busy ? "Quoting…" : "Review →"}
          </button>
        ) : null}
      </div>
    </Card>
  );
}
