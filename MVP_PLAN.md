# Grant: Historical MVP Outline

Historical planning context, superseded on 2026-11-17 by [projectidea.md](projectidea.md),
[PRD.md](PRD.md), [TRD.md](TRD.md), [architecture.md](architecture.md),
[projectplan.md](projectplan.md), and [messaging.md](messaging.md).
Use the new documents for implementation; the original outline is retained below.

Updated November 17, 2026. Two-person team. Framework: Next.js.
Status: product/build plan only; application implementation has not started.

## Product promise

An editor submits a brief. The agent checks structured coverage, requests human
approval, pays through x402 on Stellar testnet, and delivers audio, a PDF license,
and shareable proof. Lead with licensing and proof, not music search.

## Rights holders and demo boundary

Rights holders own or control the permissions offered. Composition and sound
recording/master rights can be separate; permission for one does not cover both.
Without real partners, simulate one seller with three original team-owned demo
tracks. Alternatively use material with explicit permissions for the intended
use and distribution; royalty-free does not automatically permit sublicensing.
Original synthesized loops are an option, not existing supplied assets.

Simulate the catalog, not payment settlement. Use actual testnet transactions,
not fabricated hashes. Label licenses and proof as demo/testnet artifacts.
Payment does not establish ownership, legal clearance, or Content ID coverage.

## Included features

1. Structured versioned offers: seller/track, claimed composition/master authority,
   platforms, organic/paid-ad use, term/start rule, territory, client/project,
   editor-to-client permission, reposting, future campaigns, duration limits,
   price, network, asset, payee, expiry. Confirm ambiguous brief details;
   server rules reject unknown or incompatible rights. AI cannot invent permission.
2. Core endpoint: POST /api/license/track. Check rights/policy, return x402 payment
   requirements, then verify settlement before issuing audio, PDF, proof, receipt.
   Follow the selected SDK contract; do not invent headers or assume EVM examples.
3. Guardrails: 5 testnet USDC project budget; proposed 2 testnet USDC purchase cap;
   explicit approval per purchase/upgrade. Proposed prices: 1 base + 1 upgrade.
   Bind approval to project, coverage, offer version, price, network, asset, payee,
   and expiry. Changes need reapproval; the agent cannot raise its caps.
4. Persistent idempotency and atomic budget reservations. Count pending plus
   settled spend. Retries return the original purchase; reconcile uncertain
   settlement before allowing another charge. Keep signing keys server-only.
5. PDF and shareable proof from one immutable coverage snapshot: track, demo
   seller, license/version, client/project, permissions/exclusions, term, territory,
   price, timestamp, network, transaction hash/lookup. Include demo disclaimers.
   Use unguessable share tokens, omit private data, protect audio separately.
6. Paid-ad add-on for the same track/project: require an offered upgrade, new
   approval, policy checks, and another x402 payment. Preserve original terms;
   link both receipts and show combined coverage, never silently expand rights.
7. Spending history and refusal receipts: rights mismatch, unknown coverage,
   cap/budget exceeded, missing approval, expired quote, unverified payment.

## Minimal stack and first milestone

Next.js App Router + TypeScript for UI and API in one repository. PostgreSQL for
offers/projects/approvals/reservations/purchases/receipts. Server-generated PDFs
and object storage for audio/PDFs; hosting vendor TBD. Shared matching/policy
logic. Optional AI brief parsing comes after deterministic rules work.

First prove one x402 testnet payment. Confirm current SDKs, facilitator endpoint
and availability, actual testnet USDC asset, funding/trustline requirements,
verification/settlement contract, and transaction lookup. No mainnet/real funds.

## Two-person schedule

November 28, 2026 is the earlier planning assumption, not a newly verified
organizer deadline. Confirm the cutoff/timezone. Swap roles to fit your skills.

- Nov 17-19: payment spike, schema/catalog, one purchase. A leads protocol;
  B prepares demo tracks, coverage fixtures, screen outline. Pair on the spike.
- Nov 20-22: matching, refusals, approval, caps, idempotency. A leads policy;
  B leads brief, offer, approval, and history screens.
- Nov 23-24: audio delivery, PDF, proof page. A connects entitlements/receipts;
  B leads proof layout/copy and scenario checks.
- Nov 25: pair on the paid-ad upgrade using existing payment/policy modules.
- Nov 26-27: feature freeze, tests/fixes, demo video, README, submission material.
- Nov 28: submit with upload buffer before the verified cutoff; both check links.

## Acceptance/demo

Show an approved purchase with real testnet receipt, audio/PDF/proof, and updated
budget; rights mismatch; purchase-cap refusal; project-budget refusal; safe
retries/concurrent requests; and a paid-ad upgrade with both receipts. Refusals
must not charge. Reject altered/expired approvals and wrong network/asset/payee/
amount. Label any seeded prior spend. Both teammates explain real versus mock.

## Excluded

Real catalogs/partners, commercial-song clearance, Content ID guarantees,
fiat/mainnet, subscriptions, recommendation engines, audio preview players,
mobile apps, seller onboarding. Build purchase first, proof next, upgrade last.

## Primary references checked

- https://developers.stellar.org/docs/build/agentic-payments/x402
- https://nextjs.org/docs/app/getting-started/route-handlers
- https://www.copyright.gov/register/pa-sr.html
