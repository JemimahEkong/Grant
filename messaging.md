# Grant — Messaging and Voice

Document version: v1 | Updated: 2026-11-17
Status: founder-brief draft; planned-product copy, not evidence of shipped features

## 1. Working context

Drafting diagnosis: an established founder brief with agreed positioning, but no existing marketing page or verified customer language. Preserve the licensing-agent direction and explain it plainly. All example editor/client lines below are illustrative, not interview quotes.

**Name:** Grant. Domain and trademark availability have not been checked.

**Category:** music-licensing agent for freelance video editors.

**Core promise:** Check a track's offered permissions, approve the purchase, and give the client a readable record of coverage.

**Primary audience:** freelance editors making client videos for social platforms.

**Secondary audience:** the client reviewing coverage. For judges/builders, explain the x402 and Stellar payment path after the user benefit.

**Pricing context:** demo-only 1 testnet USDC base license and 1 testnet USDC add-on. Commercial pricing and any future service fee are undecided.

## 2. Positioning

For freelance video editors delivering client work, Grant is a music-licensing agent that matches project requirements with structured seller offers, requests approval before payment, and assembles the license and receipt into shareable proof.

The working alternative is the editor checking seller terms and maintaining separate project, payment, and licensing records. Named competitor comparisons have not been researched; do not claim Grant is the first, only, cheapest, or fastest option.

The intended change is from an unclear handoff to a project-specific record of what was purchased. Whether this improves real workflows still needs customer testing.

## 3. Message hierarchy

| Order | Message | Concrete demonstration |
| --- | --- | --- |
| 1 | Give your client a clear record of music permission | Open the coverage page and license PDF |
| 2 | Check the offer against the actual project | Show platforms, paid-ad use, territory, term, and reuse permissions |
| 3 | Keep control of the purchase | Show exact price, approval, purchase cap, and remaining project budget |
| 4 | Handle the request to run an ad | Buy an available paid-ad add-on and show linked receipts |
| 5 | Make the payment traceable | Open the actual Stellar testnet transaction |

The prototype must earn these messages through a working demo. As of this document's date, none of these flows is implemented.

## 4. Copy candidates

### Preferred tagline

**Music permission your client can see.**

Why: it emphasizes the client handoff and a tangible coverage record. Keep a nearby explanation that Grant checks offered terms, not independently verified ownership.

Alternatives:

- **Check the use. Share the license.** Emphasizes the editor's workflow; less specific about client value.
- **A clear license for your client video.** More literal; useful when introducing the product to a new audience.

### Hero draft

**Headline:** Give your client a clear record of music permission.

**Subhead:** Grant checks a track's offered license against your project, asks before paying, and puts the coverage and receipt in one shareable page.

**Primary CTA:** Try the licensing demo

**Secondary CTA:** View sample coverage

**Adjacent disclosure:** Hackathon prototype using demo-owned tracks and Stellar testnet USDC. The receipt records payment; it does not independently verify music ownership.

These are planned CTA labels. Activate them only when their destination works. Before a working prototype, use “See the Grant concept” linked to a real concept page rather than implying purchases are available.

### Short product description

Grant helps freelance video editors check offered music permissions, approve a project-specific purchase, and share the license and payment receipt with their client.

### Hackathon pitch draft

An editor finds a track for a client video, then needs to check whether the offer covers the platforms, paid ads, and client use. Grant turns that brief into a structured check. The editor reviews the scope and price, approves a capped testnet purchase, and receives audio, a license PDF, and shareable coverage. If the client later wants a paid ad, Grant can buy an offered add-on with fresh approval. The demo uses three original tracks, a simulated seller, and real Stellar testnet settlement through x402.

Use future tense or “our planned demo” until that end-to-end path actually runs. The pitch describes the target experience, not completed work.

## 5. Voice

| Attribute | Means | Avoid | Example |
| --- | --- | --- | --- |
| Clear | Name the permission, price, and next action | Legal or blockchain jargon as the headline | “This offer covers organic Instagram posts.” |
| Careful | State what the offer and receipt establish | Blanket safety or ownership claims | “Paid advertising is excluded.” |
| Calm | Explain a refusal without blame | Alarming or dismissive errors | “This purchase exceeds the project's remaining budget.” |
| Practical | Help the editor complete a client handoff | Abstract claims about transformation | “Copy coverage link.” |

Use “you” for the editor and “your client” for the recipient. Errors should identify the failed check and available next action. Technical details belong in expandable receipt information and developer material.

## 6. Interface language

| Situation | Draft copy |
| --- | --- |
| Missing brief information | “Confirm the territory and license term before continuing.” |
| Compatible demo offer | “This offer matches the project details you confirmed.” |
| Approval button | “Approve 1 testnet USDC purchase” |
| Rights mismatch | “This offer excludes paid advertising on TikTok. Choose another offer or review an available add-on.” |
| Purchase cap | “This costs 1 testnet USDC. This project's purchase cap is 0.5. Grant has not requested payment.” |
| Project budget | “This costs 1 testnet USDC. Available project budget is 0.5. Grant has not requested payment.” |
| Settlement uncertain | “Payment status is still being checked. Do not start another purchase.” |
| Settled, document pending | “Payment confirmed. Your license document is still being prepared.” |
| Delivery recovery | “Retry document delivery. Your confirmed purchase will not be charged again.” |
| Upgrade review | “Add paid-ad permission for this track and project. Review the added coverage before approving.” |
| Shared page | “Coverage record for this project. Demo license; payment recorded on Stellar testnet.” |

Render amounts and platforms from validated state, not hard-coded example strings. “Grant has not requested payment” is valid only for pre-sign refusals; never use it for a timeout after submission.

## 7. Claims and terminology policy

| Use | Avoid | Reason / evidence required |
| --- | --- | --- |
| “License” / “permission for these uses” | “Own the song” | Ownership transfer is not offered |
| “Checks the seller's structured terms” | “AI clears the copyright” | No legal review or independent authority verification |
| “Coverage record and payment receipt” | “Blockchain guarantees your music rights” | Payment cannot establish seller authority |
| “Participating / demo-owned tracks” | “License any song” | No real commercial catalog or partnerships |
| “Requires your approval” | “Automatically buys anything you need” | Human approval is mandatory |
| “Available paid-ad add-on” | “Upgrade any track” | A seller must explicitly offer the additional permission |
| “Stellar testnet USDC” | Unqualified real-money revenue claims | Demo purchases use test funds |

Do not publish testimonials, saved-time percentages, market-size numbers, “copyright-safe,” “Content ID cleared,” “legally guaranteed,” or unsupported competitor claims. Quantitative claims need recorded test/customer evidence. Real seller-authority statements need documented authorization and appropriate legal review. Platform acceptance requires evidence from the relevant platform; it is not unlocked by a transaction hash alone.

## 8. Objections and boundaries

- **Do I own the music?** No. The rights holder retains ownership; the license describes permitted uses.
- **Will this license a famous song?** The prototype supports only the three demo tracks, not a commercial catalog.
- **Does the receipt prevent copyright claims?** It records payment and links to the stated terms. It does not guarantee clearance or prevent platform claims.
- **Can the agent spend more on its own?** It cannot raise limits or bypass required approval.
- **What if payment times out?** Grant holds the attempt for reconciliation rather than assuming it is safe to charge again.
- **What is simulated?** The seller/catalog and demo licensing terms. The target payment demonstration uses actual Stellar testnet settlement.

Poor-fit users include people seeking arbitrary commercial songs, ownership transfers, a legal clearance opinion, or guaranteed platform/Content ID outcomes.

## 9. Validation still needed

Customer vocabulary, the most painful licensing step, demand for shareable proof, willingness to pay, seller acquisition, and the Grant name's availability remain unvalidated. Current measured adoption, revenue, and conversion results: none recorded. Primary future demo action: complete one approved purchase and open its coverage record.

Do not convert illustrative scenario dialogue such as “Can we run this as an ad?” into a claimed customer quote.

## 10. Skills that fit this work

Discovery method: checked the skills.sh directory, searched `npx skills find "product messaging"`, read the source skill instructions, and checked repository reputation on 2026-11-17. Counts are point-in-time directory/API observations, not quality guarantees. Both are third-party community skills, not OpenAI or Stellar endorsements.

| Skill | Why it fits | Observed directory installs | Source |
| --- | --- | --- | --- |
| `product-marketing` | Audience, positioning, objections, proof boundaries, and consistent product context | Approximately 98.8K | [Directory](https://skills.sh/coreyhaines31/marketingskills/product-marketing) · [Instructions](https://github.com/coreyhaines31/marketingskills/blob/main/skills/product-marketing/SKILL.md) |
| `copywriting` | Headlines, CTA labels, useful UI language, and supportable claims | Approximately 258.3K | [Directory](https://skills.sh/coreyhaines31/marketingskills/copywriting) · [Instructions](https://github.com/coreyhaines31/marketingskills/blob/main/skills/copywriting/SKILL.md) |

The source repository `coreyhaines31/marketingskills` had approximately 61K GitHub stars at inspection. Guidance from both informed this draft. **Neither skill was installed.** Installation, if later requested:

```sh
npx skills add coreyhaines31/marketingskills@product-marketing
npx skills add coreyhaines31/marketingskills@copywriting
```

The product-marketing skill normally uses `.agents/product-marketing.md`. This user-requested `messaging.md` is currently the canonical messaging artifact. If adopting that workflow later, add a small context file pointing here rather than creating competing copies of approved messaging.

## Learnings

No customer tests or campaign results recorded yet. Do not present drafting preferences as measured wins.

## Changelog

- v1 (2026-11-17): Initial founder-brief draft for Grant, with demo-safe claims, copy candidates, and verified skill options.

Related: [projectidea.md](projectidea.md), [PRD.md](PRD.md), and [projectplan.md](projectplan.md).
