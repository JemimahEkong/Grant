export type ByteRange = {
  start: number;
  end: number;
};

export function parseByteRange(header: string | null, size: number): ByteRange | "invalid" | null {
  if (!header) return null;
  if (!Number.isInteger(size) || size <= 0) return "invalid";

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return "invalid";

  const [, startText, endText] = match;
  if (!startText && !endText) return "invalid";

  if (!startText) {
    const suffix = Number(endText);
    if (!Number.isInteger(suffix) || suffix <= 0) return "invalid";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(startText);
  const requestedEnd = endText === "" ? size - 1 : Number(endText);
  if (!Number.isInteger(start) || !Number.isInteger(requestedEnd)) return "invalid";
  if (start < 0 || start >= size || requestedEnd < start) return "invalid";

  return { start, end: Math.min(requestedEnd, size - 1) };
}

export function etagMatches(ifNoneMatch: string | null, etag: string | null): boolean {
  if (!ifNoneMatch || !etag) return false;
  const normalize = (value: string) => value.trim().replace(/^W\//, "").replace(/^"|"$/g, "");
  const target = normalize(etag);
  return ifNoneMatch
    .split(",")
    .map(part => normalize(part))
    .some(part => part === target);
}
