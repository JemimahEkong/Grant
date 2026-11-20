# Catalog plan

How Grant goes from three placeholder tracks to a real library of 200, without signing a
single rights holder, without mainnet, and without lying about any license.

Status: specification. Nothing here is built yet.

---

## 1. Why this exists

Today the catalog is three CC0 files with fixture sellers. Every screen works, but the
inventory is a sample, so the product reads as a demo.

The fix is not a redesign. It is supply: real tracks, real license terms, real
attribution, and enough metadata that a shortlist can be built from a brief.

Three sources already publish tracks that permit commercial use. Ingesting them is legal,
free, and fast. What we cannot do is call a Pixabay track CC0, or hand a buyer a license
for terms the source never granted.

## 2. Scope

In:

- 150 to 250 tracks from Freesound, Free Music Archive, and Pixabay
- A normalized license record per track, not a label
- Metadata for discovery: duration, BPM, genre, moods, energy
- Attribution rendered in the UI, the PDF, and the proof page
- Browse, search, and filter by the dimensions a brief actually asks for
- A seller application that creates a listing for manual review

Out (explicitly):

- Mainnet payments
- Automated payouts to sellers
- Dispute or refund handling
- Uploading or analysing a buyer's video beyond reading its duration in the browser
- Any track whose license forbids commercial use

## 3. The license is the product, so store it properly

A track does not have "a license". It has terms, and those terms are what the strip
draws. Every track must resolve to this record:

| Field | Type | Why |
| --- | --- | --- |
| `source` | enum `freesound` `fma` `pixabay` `original` | provenance and re-sync |
| `sourceUrl` | text | the page a buyer can check |
| `sourceId` | text | idempotent re-ingest |
| `licenseCode` | enum `cc0` `cc-by-4.0` `cc-by-3.0` `pixabay` `grant-commercial` | what was actually granted |
| `licenseUrl` | text | link to the deed |
| `attributionRequired` | boolean | drives the credit line |
| `attributionText` | text | exact string to display |
| `commercialUse` | boolean | all ingested tracks must be true |
| `derivatives` | boolean | remix/edit permission |
| `standaloneRedistribution` | boolean | false for Pixabay |
| `platformsOrganic` | enum array | Instagram, TikTok, YouTube, Facebook, X |
| `platformsPaidAd` | enum array | empty if the license forbids advertising |
| `territory` | text | `worldwide` or a country list |
| `maxTermDays` | integer | term the buyer may be granted |
| `maxClipSeconds` | integer | how much of the track may be used |
| `clientDelivery` | boolean | can the file be handed to a client |
| `reposting` | boolean | can the client repost it |
| `futureCampaigns` | boolean | can it be reused later |
| `previewAllowed` | boolean | may we play it before purchase |

The first eleven fields are facts from the source. The last eight are our offering: what
Grant is willing to sell, which must never exceed what the source allows.

Rule: `offering ⊆ source grant`. A CC0 track can be offered with every box ticked. A
Pixabay track cannot offer `standaloneRedistribution`. A CC-BY track must carry credit.

## 4. What each source actually permits

| Source | License | Commercial | Attribution | Paid ads | Caveat |
| --- | --- | --- | --- | --- | --- |
| Freesound | CC0 | yes | no | yes | filter out Sampling+ and NC |
| Freesound | CC-BY 3.0/4.0 | yes | required | yes | credit must appear wherever it is used |
| Free Music Archive | CC-BY | yes | required | yes | exclude every NC and ND track |
| Free Music Archive | CC-BY-SA | yes | required | yes | share-alike is a trap for a paid license: exclude |
| Pixabay | Pixabay Content License | yes | no | yes | **not CC0**; no standalone redistribution; no reselling the file itself |

Two hard rules:

1. Nothing with `NC` (non-commercial) or `ND` (no derivatives) enters the catalog, ever.
2. Nothing is labelled CC0 unless the source literally says CC0. Pixabay is "Pixabay
   License" and must be displayed that way.

## 5. Metadata for discovery

A license tells you if you *may* use a track. It does not tell you if it *fits*. Store:

- `durationSeconds` (always)
- `bpm` (nullable, many are beatless)
- `key` (nullable)
- `genre` (one, from a fixed list)
- `moods` (2 to 4, from a fixed list: warm, tense, uplifting, minimal, driving, playful,
  cinematic, gritty)
- `energy` (1 to 5)
- `instrumental` (boolean)
- `peaks` (optional, a small array for the waveform in the player)

Moods and energy are the fields that make a shortlist feel intelligent. They are
judgement calls, so they get reviewed once and stay editable.

## 6. The ingest pipeline

One script, one adapter per source, one normalized output.

```
fetch listing page or API
  -> parse track, license, author, source URL
  -> reject on license rule (NC, ND, SA, unknown)
  -> download audio, hash it, upload to R2
  -> probe duration and format
  -> assign genre, moods, energy (draft)
  -> write track + license row, idempotent on (source, sourceId)
  -> render attribution string
```

Requirements:

- **Idempotent.** Re-running must not duplicate a track. Key on source and source id.
- **Resumable.** One bad file must not abort 200.
- **Auditable.** Write a JSON line per track: accepted, rejected, or failed, with reason.
- **No silent guesses.** If the license code is unknown, reject. Never default to CC0.

Adapters:

| Source | Access | Notes |
| --- | --- | --- |
| Freesound | API key, JSON | easiest; license field is explicit; start here |
| Free Music Archive | no usable API | per-track pages; slower, parse carefully, exclude NC/ND/SA |
| Pixabay | no public API for audio | manual curated import of a known good set; label the license correctly |

Practical order: Freesound first to prove the pipeline, FMA second for breadth, Pixabay
last because it is the most manual and the most mislabelled.

## 7. Quality gates

A track is rejected if:

- the license is NC, ND, SA, or unknown
- audio is under 15 seconds or over 8 minutes
- the file is corrupt, silent, or mono-clipped to the point of unusable
- the attribution text is missing for a CC-BY track
- it duplicates another track by audio hash
- the source page is gone

A track is held for review if:

- genre or mood is uncertain
- energy disagrees with the duration and BPM badly
- the source is Pixabay and the track looks like a re-upload of someone else's work

## 8. Attribution

Three places, all generated from one string:

1. **Track page and review screen** — small line under the title: `CC BY 4.0 · Author Name`
2. **License PDF** — a "Music credit" block with the exact text the buyer must publish
3. **Proof page** — the same line, so a client can verify the credit

For CC0 the line reads `CC0 · public domain`. For CC-BY it is
`"Track Title" by Author, licensed CC BY 4.0, source link`. The PDF must tell the buyer
where to put it, in plain words: "Add this to your video description."

## 9. Discovery

Filters that mirror the brief, not the file:

- Use: organic or paid ads (paid ads hides tracks without that permission)
- Platform: multi-select
- Term: 30 days, 90 days, 1 year
- Territory: worldwide or a country
- Clip length: track must be at least this long
- Mood and energy
- Sort by price, relevance, or duration

Search covers title, author, genre, and moods. No AI ranking in v1; a deterministic
filter with visible reasons is more honest and far cheaper to explain.

## 10. Migration of what exists

The three current fixtures become the first three catalog rows with
`licenseCode: cc0` and `source: freesound`, keeping their existing offer ids so no
purchase record breaks.

Do not delete them. Old licenses must keep resolving to the terms they were sold under.

## 11. Acceptance for "catalog v1"

- [ ] 150 or more tracks visible in the app, all with a license code and source link
- [ ] zero tracks with an NC, ND, SA, or unknown license
- [ ] every CC-BY track renders its credit in the UI, the PDF, and the proof page
- [ ] re-running the ingest creates no duplicates
- [ ] a brief for paid ads hides every track that forbids advertising
- [ ] a 20-second brief returns only tracks long enough
- [ ] the refusal path still works with the larger catalog
- [ ] one purchase completes against a newly ingested track, end to end
- [ ] a single JSON report lists accepted, rejected, and failed tracks with reasons

## 12. What this does not fix

It does not make Grant a licensor with legal standing, it does not pay sellers, and it
does not make the money real. It makes the library real, which is the part a creator
notices first.
