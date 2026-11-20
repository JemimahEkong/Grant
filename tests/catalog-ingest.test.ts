import { describe, expect, it } from "vitest";
import { normalizeFreesoundSound } from "../lib/catalog/adapters/freesound";
import { draftMetadata, isDurationAllowed, licenseFactsFor, mapFreesoundLicense } from "../lib/catalog/license-policy";

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
