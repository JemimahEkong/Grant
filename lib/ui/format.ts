const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatUsdc(value: string | number | bigint | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "0.00";
  const base = typeof value === "bigint" ? value : BigInt(String(value));
  const whole = base / 10_000_000n;
  const fraction = (base % 10_000_000n).toString().padStart(7, "0");
  return `${whole}.${fraction.slice(0, decimals)}`;
}

export function usdcAmountToBaseUnits(value: string | null | undefined): bigint {
  if (!value) return 0n;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole || "0") * 10_000_000n + BigInt((fraction + "0000000").slice(0, 7));
}

export function formatUsdcDecimal(value: string | null | undefined, decimals = 2): string {
  if (!value) return "0.00";
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${(fraction + "00").slice(0, decimals)}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(date)} ${date.toISOString().slice(11, 16)} UTC`;
}

export function shortAddress(value: string | null | undefined, head = 6, tail = 5): string {
  if (!value) return "not configured";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function shortHash(value: string | null | undefined, head = 10, tail = 6): string {
  if (!value) return "—";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function formatTerm(days: number): string {
  return days === 365 ? "1 year" : `${days} days`;
}

const countryNames: Record<string, string> = {
  NG: "Nigeria",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
};

export function formatTerritory(territory: { worldwide: boolean; countries: string[] }): string {
  if (territory.worldwide) return "Worldwide";
  if (territory.countries.length === 0) return "No territory";
  if (territory.countries.length <= 2) return territory.countries.map(code => countryNames[code] ?? code).join(", ");
  return `${territory.countries.length} countries`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "G").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export type StatusMeta = { label: string; chipClass: string };

export function effectivePurchaseStatus(purchase: { status: string; quoteExpiresAt: string }): string {
  if ((purchase.status === "quoted" || purchase.status === "approved") && new Date(purchase.quoteExpiresAt) <= new Date()) {
    return "expired";
  }
  return purchase.status;
}

export function statusMeta(status: string): StatusMeta {
  switch (status) {
    case "settled":
    case "issuing":
    case "ready":
      return { label: "Settled", chipClass: "chip-settled" };
    case "reserved":
    case "payment_pending":
      return { label: "Pending", chipClass: "chip-pending" };
    case "approved":
      return { label: "Approved", chipClass: "chip-pending" };
    case "quoted":
      return { label: "Quoted", chipClass: "chip-neutral" };
    case "refused":
    case "expired":
    case "failed_no_settlement":
      return { label: "Refused", chipClass: "chip-refused" };
    default:
      return { label: status.replaceAll("_", " "), chipClass: "chip-neutral" };
  }
}

export function budgetPercent(spentBaseUnits: string, budgetBaseUnits: string): number {
  const budget = BigInt(budgetBaseUnits);
  if (budget <= 0n) return 100;
  const spent = BigInt(spentBaseUnits);
  const percent = Number((spent * 100n) / budget);
  return Math.max(0, Math.min(100, percent));
}

export function subtractBaseUnits(left: string, right: string): string {
  const result = BigInt(left) - BigInt(right);
  return (result > 0n ? result : 0n).toString();
}
