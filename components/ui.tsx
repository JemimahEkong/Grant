import Link from "next/link";
import type { ReactNode } from "react";
import { CheckIcon, WaveIcon } from "./icons";
import { statusMeta } from "../lib/ui/format";
import type { StripSegment } from "../lib/ui/strip";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Grant home">
      Grant<span>.</span>
    </Link>
  );
}

export function TestnetBadge() {
  return <span className="testnet-badge">TESTNET</span>;
}

export function ClearanceStrip({ segments, tall = false }: { segments: StripSegment[]; tall?: boolean }) {
  return (
    <div className={`clearance-strip${tall ? " tall" : ""}`} role="img" aria-label={segments.map(segment => `${segment.label}: ${segment.covered ? "covered" : "excluded"}`).join(", ")}>
      {segments.map((segment, index) => (
        <div key={`${segment.label}-${index}`} className={`clearance-seg ${segment.covered ? "covered" : "excluded"}`}>
          <span>{segment.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend">
      <span className="legend-item">
        <span className="legend-swatch" style={{ background: "var(--covered)" }} />
        Covered
      </span>
      <span className="legend-item">
        <span className="legend-swatch" style={{ background: "var(--accent)" }} />
        Not covered
      </span>
    </div>
  );
}

export function Chip({ tone, children }: { tone: "settled" | "pending" | "refused" | "neutral"; children: ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function StatusChip({ status }: { status: string }) {
  const meta = statusMeta(status);
  const tone = meta.chipClass.replace("chip-", "") as "settled" | "pending" | "refused" | "neutral";
  return <Chip tone={tone}>{meta.label}</Chip>;
}

export function Money({ value, unit = "USDC" }: { value: string; unit?: string }) {
  return (
    <span className="mono">
      {value} <span className="dim" style={{ fontSize: "0.7em" }}>{unit}</span>
    </span>
  );
}

export function WaveThumb() {
  return (
    <div className="thumb">
      <WaveIcon />
    </div>
  );
}

export function PageHeader({ title, lede, right }: { title: string; lede?: string; right?: ReactNode }) {
  return (
    <div className="row-between" style={{ alignItems: "flex-start", marginBottom: 14 }}>
      <div>
        <h1 className="page-title">{title}</h1>
        {lede ? <p className="page-lede">{lede}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="h">{title}</div>
      <p className="d">{description}</p>
      {action}
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-label="Loading" />;
}

export function Tick() {
  return (
    <span className="tick" aria-hidden="true">
      <CheckIcon className="nav-icon" />
    </span>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`panel ${className}`}>{children}</div>;
}
