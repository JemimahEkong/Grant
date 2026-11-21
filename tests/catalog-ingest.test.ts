import { afterEach, describe, expect, it, vi } from "vitest";
import { FreesoundApiError, normalizeFreesoundSound, searchFreesound } from "../lib/catalog/adapters/freesound";
import { cleanTitle, draftMetadata, isDurationAllowed, isMusicCandidate, licenseFactsFor, mapFreesoundLicense } from "../lib/catalog/license-policy";

describe("Freesound license mapping", () => {
  it("accepts CC0 and both CC-BY versions with their exact labels", () => {
    expect(mapFreesoundLicense("http://creativecommons.org/publicdomain/zero/1.0/")).toBe("cc0");
    expect(mapFreesoundLicense("Creative Commons 0")).toBe("cc0");
    expect(mapFreesoundLicense("http://creativecommons.org/licenses/by/4.0/")).toBe("cc-by-4.0");
    expect(mapFreesoundLicense("Attribution 3.0")).toBe("cc-by-3.0");
  });

  it("rejects NC, ND, SA, Sampling+, and unknown licenses", () => {
    expect(mapFreesoundLicense("http://creativecommons.org/licenses/by-nc/4.0/")).toBeNull();
    expect(mapFreesoundLicense("http://creativecommons.org/licenses/by-nd/4.0/")).toBeNull();
    expect(mapFreesoundLicense("http://creativecommons.org/licenses/by-sa/4.0/")).toBeNull();
    expect(mapFreesoundLicense("http://creativecommons.org/licenses/sampling+/1.0/")).toBeNull();
    expect(mapFreesoundLicense("All rights reserved")).toBeNull();
    expect(mapFreesoundLicense(null)).toBeNull();
  });

  it("does not default an unknown license to CC0", () => {
    expect(mapFreesoundLicense("")).toBeNull();
    expect(mapFreesoundLicense("custom")).toBeNull();
  });
});

describe("license facts and attribution", () => {
  it("labels CC0 as public domain without a credit requirement", () => {
    const facts = licenseFactsFor("cc0", { title: "Track", author: "Author", sourceUrl: "https://example.com" });
    expect(facts.attributionText).toBe("CC0 · public domain");
    expect(facts.attributionRequired).toBe(false);
    expect(facts.commercialUse).toBe(true);
    expect(facts.standaloneRedistribution).toBe(true);
  });

  it("builds the exact CC-BY credit line", () => {
    const facts = licenseFactsFor("cc-by-4.0", {
      title: "Track",
      author: "Author",
      sourceUrl: "https://example.com/source",
    });
    expect(facts.attributionRequired).toBe(true);
    expect(facts.attributionText).toBe('"Track" by Author, licensed CC BY 4.0, https://example.com/source');
    expect(facts.licenseUrl).toBe("https://creativecommons.org/licenses/by/4.0/");
  });
});

describe("catalog quality gates", () => {
  it("accepts 15 to 480 seconds and rejects outside the range", () => {
    expect(isDurationAllowed(15)).toBe(true);
    expect(isDurationAllowed(480)).toBe(true);
    expect(isDurationAllowed(14.9)).toBe(false);
    expect(isDurationAllowed(481)).toBe(false);
    expect(isDurationAllowed(Number.NaN)).toBe(false);
  });

  it("produces a draft with a fixed genre, two or more moods, and 1 to 5 energy", () => {
    const metadata = draftMetadata({
      title: "Warm Acoustic Guitar",
      tags: ["acoustic", "warm", "soft", "instrumental"],
    });
    expect(["acoustic", "ambient", "cinematic", "electronic"]).toContain(metadata.genre);
    expect(metadata.moods.length).toBeGreaterThanOrEqual(2);
    expect(metadata.moods.length).toBeLessThanOrEqual(4);
    expect(metadata.energy).toBeGreaterThanOrEqual(1);
    expect(metadata.energy).toBeLessThanOrEqual(5);
    expect(metadata.instrumental).toBe(true);
  });

  it("normalizes a Freesound result without inventing audio", () => {
    const candidate = normalizeFreesoundSound({
      id: 449812,
      name: "Plains",
      username: "tyballer92",
      license: "http://creativecommons.org/publicdomain/zero/1.0/",
      duration: 60.25,
      description: "Acoustic guitar",
      tags: ["acoustic", "warm"],
      previews: { "preview-hq-mp3": "https://cdn.example/preview.mp3" },
    });
    expect(candidate?.source).toBe("freesound");
    expect(candidate?.sourceId).toBe("449812");
    expect(candidate?.sourceAuthor).toBe("tyballer92");
    expect(candidate?.sourceUrl).toBe("https://freesound.org/people/tyballer92/sounds/449812/");
    expect(candidate?.audioUrl).toBe("https://cdn.example/preview.mp3");
  });

  it("returns null when there is no preview audio", () => {
    expect(
      normalizeFreesoundSound({
        id: 1,
        name: "No preview",
        username: "someone",
        license: "http://creativecommons.org/publicdomain/zero/1.0/",
        duration: 30,
      }),
    ).toBeNull();
  });
});

describe("Freesound API errors", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("surfaces a 403 status and API message without exposing the key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: "Invalid token" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const key = "test-secret-key";
    const error = await searchFreesound({ apiKey: key, query: "test" }).catch(caught => caught);
    expect(error).toBeInstanceOf(FreesoundApiError);
    expect(error).toMatchObject({ status: 403, apiMessage: "Invalid token" });
    expect(String(error.message)).not.toContain(key);
    expect(JSON.stringify(error.apiMessage)).not.toContain(key);
  });
});

describe("catalog title hygiene and music filter", () => {
  it("collapses whitespace, strips a trailing byline, and cuts at a word boundary", () => {
    expect(cleanTitle("  A   Long   Song by Alice  ", "Alice")).toBe("A Long Song");
    const long = cleanTitle(`${"word ".repeat(20)}by Bob`, "Bob");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith(" ")).toBe(false);
  });

  it("accepts a music-tagged track without forbidden subject matter", () => {
    expect(isMusicCandidate({ title: "Warm Guitar", tags: ["music", "acoustic", "warm"] })).toEqual({ ok: true });
  });

  it("rejects textures, field recordings, foley, drones, sample packs, SFX, and vocals", () => {
    for (const title of [
      "Rain texture",
      "Forest soundscape",
      "Field recording in Vienna",
      "Foley footsteps",
      "Dark drone",
      "Sample pack 01",
      "SFX whoosh",
      "Vocal sample",
      "A cappella stem",
    ]) {
      const result = isMusicCandidate({ title, tags: ["music"] });
      expect(result.ok).toBe(false);
    }
  });

  it("rejects a track with no music tag", () => {
    expect(isMusicCandidate({ title: "Untitled", tags: ["ambient", "loop"] })).toEqual({
      ok: false,
      reason: "missing_music_tag",
    });
  });
});
