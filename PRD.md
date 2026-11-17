# Grant — Product Requirements Document

Version: 1.0 | Updated: 2026-11-17 | Owner: two-person Grant team
Status: implementation baseline; no application features are built yet

## 1. Purpose

Enable a freelance editor to obtain project-specific demo music permission through an approved, capped Stellar testnet payment and give the client a readable record of coverage.

Grant purchases a license, not music ownership. Its matching checks structured seller terms; it does not interpret arbitrary legal documents or establish that a seller owns every required right.

## 2. Users and jobs

| Persona | Job | Successful outcome |
| --- | --- | --- |
| Editor, illustrated by the Ada persona | Obtain permission for a named client video | Compatible coverage, approved price, delivery, and an understandable record |
| Client/reviewer | Understand what the purchased permission covers | Open a shared page showing covered uses and exclusions |
| Demo operator | Run a credible and repeatable hackathon demonstration | Configure testnet accounts/assets and demonstrate purchase, refusals, and upgrade |

Ada is an illustrative persona, not a claimed interviewed customer. Seller onboarding is outside the MVP; one simulated seller and three tracks are seeded by the team.

## 3. Goals and non-goals

### Goals

- Complete the actual x402 → Stellar testnet settlement → license/delivery path.
- Make coverage checking, human approval, and budget policy visible.
- Deliver consistent PDF and shareable proof from the same purchase snapshot.
- Demonstrate a paid-ad add-on without losing the original terms or receipt.
- Fail closed, recover uncertain payments, and avoid duplicate purchases on retries.

### Non-goals

Real commercial catalogs, copyright clearance, rights-holder verification services, ownership transfer, Content ID guarantees, fiat/mainnet payments, subscriptions, a recommendation engine, an audio preview player, seller onboarding, and a production custody system.

## 4. Release assumptions

- Two people are building the product. Roles in [projectplan.md](projectplan.md) can be swapped.
- Next.js and TypeScript are the chosen application foundation.
- Three original/authorized demo tracks are required but have not been supplied yet.
- Default project budget: 5 testnet USDC. Default purchase cap: 2 testnet USDC.
- Default base/add-on prices: 1 testnet USDC each. Human approval is always required.
- Prices and limits are operator-configured demo defaults, not validated business pricing. No extra service fee is charged.
- The demo is restricted to authenticated, allowlisted editor identities. Shared proof is read-only.
- The previously discussed November 28 submission date is unverified; confirm the official cutoff and timezone.

## 5. Primary journey

**Project brief → compatible offer → coverage/price review → explicit approval → policy recheck → testnet payment → audio/PDF/proof → optional approved paid-ad add-on.**

A refusal explains what failed and whether the editor must change the brief, choose another offer, or ask the human owner to adjust a limit. Grant never changes a brief or raises a limit merely to make a purchase pass.

## 6. Functional requirements

P0 means the core purchase/reliability path. P1 is built after that path, but remains required for the requested final demo. Priority describes sequence, not permission to silently drop a feature.

| ID | Priority | Requirement | Acceptance criterion |
| --- | --- | --- | --- |
| FR-01 | P0 | Authenticated project workspace | Editor sees only their projects and authenticated purchase controls; another account cannot buy or download through guessed IDs |
| FR-02 | P0 | Confirmed structured brief | Capture client/project, platforms, organic/paid-ad use, territory, term, clip duration, client delivery, reposting, and future-campaign need; ambiguous required fields block checkout |
| FR-03 | P0 | Versioned catalog and seller terms | Each offer exposes explicit permissions, claimed composition/master authority, price, network, asset, payee, and expiry; unknown authority/permissions are not treated as granted |
| FR-04 | P0 | Explainable matching | All requested platforms and permissions must be covered; show specific mismatches; optional ranking only orders compatible offers deterministically |
| FR-05 | P0 | Coverage/quote review | Show exact scope, exclusions, price, remaining budget, purchase cap, and demo labeling before approval |
| FR-06 | P0 | Human approval | A deliberate action approves one unchanged, unexpired quote; changed project, price, terms, asset, network, or payee requires new approval |
| FR-07 | P0 | Purchase and project caps | Enforce limits server-side immediately before signing; reserve pending spend atomically so concurrent purchases cannot overspend |
| FR-08 | P0 | x402 settlement | Core endpoint is `POST /api/license/track`; compatible unpaid requests return the SDK's 402 requirements; verified settlement produces a purchase receipt, never a fabricated hash |
| FR-09 | P0 | Safe retry and uncertain-payment handling | Same key and request return the existing attempt/result; changed request with same key conflicts; ambiguous settlement stays pending and cannot trigger a fresh charge |
| FR-10 | P0 | Entitled audio and PDF delivery | Settled purchase unlocks protected audio and a project-specific PDF; artifact-generation failure offers recovery without another payment |
| FR-11 | P1 | Shareable proof page | An unguessable, revocable read-only link shows authorized display labels, coverage, exclusions, demo status, network, and actual receipt; private audio and contact data stay private |
| FR-12 | P1 | Paid-ad add-on | Only an offered add-on for the original track/project is available; fresh approval/payment links both receipts and preserves historical terms |
| FR-13 | P1 | Purchase and spending history | Show confirmed spend, pending reservations, explicit demo adjustments, available budget, licenses, and add-ons; failed attempts do not count as settled spend |
| FR-14 | P0 | Refusal receipts | Rights, budget/cap, approval, quote, and payment failures get readable reason codes and an appropriate next action; pre-sign refusals cause no payment |

## 7. Coverage rules

- A request is compatible only if every requested dimension is explicitly satisfied.
- Paid advertising and organic posting are distinct uses. Platform support alone does not imply paid-ad permission.
- Require authority for both the composition and recording in the demo offer. The record is a seller assertion supported by team-held provenance, not Grant's automated ownership verification.
- Territories and terms must fit the offer. For MVP base purchases, the licensed term starts at confirmed settlement; compute and store the exact UTC end time.
- Editor-to-client use, reposting, and future campaigns are separate permissions.
- Paid-ad add-ons apply only to the original licensee/client/project and permitted platforms/territories. They end with the original base license and do not extend its term.
- Unavailable upgrades produce a refusal. A new campaign outside the original scope requires another offered license, not a silent extension.

## 8. Required surfaces and states

| Surface | Minimum information and actions |
| --- | --- |
| Project/brief | Client display label, confirmed scope, budget and cap |
| Offer/review | Compatible offers, reasons/exclusions, exact quote, approval action |
| Purchase status | Awaiting approval, approved, processing, pending reconciliation, paid/issuing, ready, refused, or failed |
| Delivery/proof | Audio/PDF access, coverage, transaction lookup, create/revoke share link |
| Add-on review | Original coverage, proposed additional rights, price, fresh approval |
| History | Settled and pending amounts, refusals, receipts, linked add-ons |

Forms and approval controls must work by keyboard, have visible focus and associated labels, and explain errors in text rather than color alone. Do not expose raw protocol exceptions to end users.

## 9. Non-functional expectations

- No signing key, service credential, or signed authorization payload in browser code, public pages, analytics, or logs.
- All financial and permission decisions are enforced on the server, not just in UI or model prompts.
- Durable purchase/payment records survive refreshes and server restarts.
- Shared proof is excluded from indexing and caching where sensitive; revoking a link prevents future access through it, but cannot recall a previously downloaded PDF.
- Display a pending state during external delays. Never label a timeout as proof that payment failed.
- A failed PDF upload cannot erase a settled payment or cause repurchase.
- Product performance targets are tested targets, not achieved claims: local matching p95 under 1 second for three tracks; cached/local project reads p95 under 2 seconds in the test environment. External settlement/faucet timings are not promised.

## 10. Release acceptance scenarios

| ID | Scenario | Pass condition |
| --- | --- | --- |
| AC-01 | Approved compatible purchase | Actual testnet settlement; protected audio; PDF; proof; consistent coverage and amount |
| AC-02 | Rights mismatch | Specific refusal before signing; no charge or paid license |
| AC-03 | Purchase-cap exceeded | Low-cap demo project refuses 1 USDC offer; cap remains unchanged |
| AC-04 | Insufficient project budget | Explicit demo budget adjustment leaves less than price; no payment; adjustment is labeled, not presented as a transaction |
| AC-05 | Retry, replay, concurrent purchase | Reused payment/purchase identifiers cannot create duplicate entitlement/charge; competing reservations respect available budget |
| AC-06 | Timeout or process interruption | State survives restart; unresolved authorization cannot be replaced automatically; reconciliation finds/reuses settlement |
| AC-07 | Delivery failure after payment | Original receipt remains; regeneration retries artifacts only |
| AC-08 | Paid-ad add-on | Fresh approval/payment; same track/project; original preserved; combined scope plus both receipts visible |
| AC-09 | Authorization and privacy | Unauthorized purchase/download blocked; only public-safe proof data shared; revoked token rejected |
| AC-10 | Altered quote/payment or expired approval | Price, scope, network, asset, payee, and expiry checks reject mutation |

Record actual results in the build/test evidence. This document does not claim the scenarios have passed.

## 11. Risks and release blockers

Missing track authority, unavailable facilitator/faucet, unsupported Next.js x402 integration, unresolved settlement idempotency, and insecure public signing are blockers. Do not replace a blocked live payment path with a fake receipt and present it as working.

If time slips, reduce decoration, ranking, optional natural-language parsing, and catalog size beyond the three required tracks. Seek explicit scope agreement before removing proof, upgrades, approvals, or payment safety.

## 12. References and ownership

[projectidea.md](projectidea.md) explains the concept; [TRD.md](TRD.md) defines enforceable contracts; [architecture.md](architecture.md) defines component boundaries; [projectplan.md](projectplan.md) tracks execution; [messaging.md](messaging.md) controls product claims. Product scope changes update this PRD first, then the affected documents.
