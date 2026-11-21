import { beforeEach, describe, expect, it } from "vitest";
import { clientIp, consumeIpRateLimit, resetIpRateLimit } from "../lib/http/ip-rate-limit";
import { etagMatches, parseByteRange } from "../lib/catalog/preview-range";

describe("preview byte ranges", () => {
  it("accepts closed, open, and suffix ranges", () => {
    expect(parseByteRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
    expect(parseByteRange("bytes=500-", 1000)).toEqual({ start: 500, end: 999 });
    expect(parseByteRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseByteRange("bytes=900-2000", 1000)).toEqual({ start: 900, end: 999 });
  });

  it("rejects malformed, multi-part, and out-of-bounds ranges", () => {
    expect(parseByteRange(null, 1000)).toBeNull();
    expect(parseByteRange("bytes=0-1,4-5", 1000)).toBe("invalid");
    expect(parseByteRange("bytes=1000-1200", 1000)).toBe("invalid");
    expect(parseByteRange("bytes=20-10", 1000)).toBe("invalid");
    expect(parseByteRange("items=0-10", 1000)).toBe("invalid");
    expect(parseByteRange("bytes=-0", 1000)).toBe("invalid");
  });

  it("matches strong and weak ETags", () => {
    expect(etagMatches('"abc"', '"abc"')).toBe(true);
    expect(etagMatches('W/"abc"', '"abc"')).toBe(true);
    expect(etagMatches('"other", "abc"', 'W/"abc"')).toBe(true);
    expect(etagMatches('"other"', '"abc"')).toBe(false);
    expect(etagMatches(null, '"abc"')).toBe(false);
  });
});

describe("preview IP limits", () => {
  beforeEach(() => resetIpRateLimit());

  it("allows 120 requests per minute and refuses the next one", () => {
    const now = 1_700_000_000_000;
    for (let index = 0; index < 120; index += 1) {
      expect(consumeIpRateLimit("203.0.113.10", now).allowed).toBe(true);
    }
    const refused = consumeIpRateLimit("203.0.113.10", now);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the window and reads the forwarded IP", () => {
    const now = 1_700_000_000_000;
    for (let index = 0; index < 120; index += 1) consumeIpRateLimit("203.0.113.10", now);
    expect(consumeIpRateLimit("203.0.113.10", now).allowed).toBe(false);
    expect(consumeIpRateLimit("203.0.113.10", now + 60_001).allowed).toBe(true);
    expect(clientIp(new Request("http://localhost", { headers: { "x-forwarded-for": "198.51.100.4, 10.0.0.1" } }))).toBe("198.51.100.4");
    expect(clientIp(new Request("http://localhost", { headers: { "x-real-ip": "198.51.100.5" } }))).toBe("198.51.100.5");
  });
});
