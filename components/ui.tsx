import Link from "next/link";
import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from "react";
import { CheckIcon, WaveIcon, HomeIcon, TracksIcon, PlusIcon, PurchasesIcon, ProfileIcon } from "./icons";
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
  return <Pill className={`chip chip-${tone}`}>{children}</Pill>;
}

export function StatusChip({ status }: { status: string }) {
  const meta = statusMeta(status);
  const tone = meta.chipClass.replace("chip-", "") as "settled" | "pending" | "refused" | "neutral";
  return <Chip tone={tone}>{meta.label}</Chip>;
}

export function Money({ value, unit = "USDC" }: { value: string; unit?: string }) {
  return (
    <span className="money">
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
  return <Card className={className}>{children}</Card>;
}

export function Card({ variant = "white", className = "", ...props }: HTMLAttributes<HTMLDivElement> & { variant?: "white" | "brand-deep" }) {
  return <div className={`panel card ${variant === "brand-deep" ? "card-deep" : ""} ${className}`} {...props} />;
}
export function GroupedList({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`grouped-list ${className}`} {...props} />;
}
export function Row({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`list-row ${className}`} {...props} />;
}
export function Pill({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`pill ${className}`} {...props} />;
}
export function FilterChip({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`filter ${className}`} {...props} />;
}
export function PrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn btn-primary ${className}`} {...props} />;
}
export function SecondaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn btn-secondary ${className}`} {...props} />;
}
export function Sheet({ className = "", children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`sheet ${className}`} {...props}><div className="sheet-grabber" aria-hidden="true" />{children}</section>;
}
export function TabBar({ pathname }: { pathname: string }) {
  const items = [
    { href: "/app", label: "Home", icon: HomeIcon },
    { href: "/app/catalog", label: "Tracks", icon: TracksIcon },
    { href: "/app/new", label: "New license", icon: PlusIcon },
    { href: "/app/purchases", label: "Purchases", icon: PurchasesIcon },
    { href: "/app/profile", label: "Profile", icon: ProfileIcon },
  ];
  return <nav className="tab-bar" aria-label="Primary"><div className="tab-brand"><Logo href="/app" /><TestnetBadge /></div>{items.map((item, index) => {
    const active = pathname === item.href || (index === 1 && pathname.startsWith("/app/purchase/"));
    const Icon = item.icon;
    return <Link key={item.href} href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className={`tab-link${active ? " on" : ""}${index === 2 ? " tab-centre" : ""}`}><span className="tab-icon"><Icon /></span><span>{item.label}</span></Link>;
  })}<p className="tab-foot">TESTNET USDC only. No real funds.<br />One approval per purchase.</p></nav>;
}
