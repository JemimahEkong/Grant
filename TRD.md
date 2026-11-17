# Grant — Technical Requirements Document

Version: 1.0 | Updated: 2026-11-17 | Status: proposed implementation contract
Product requirements: [PRD.md](PRD.md) | Components: [architecture.md](architecture.md)

## 1. Technical direction

Use a modular Next.js application, not microservices. Separate buyer-agent orchestration, seller licensing, payment settlement, and delivery in code even when deployed together. Build the deterministic, human-approved workflow first. No LLM is required to demonstrate the MVP agent.

The founder chose Next.js/TypeScript, Neon PostgreSQL, the existing JemimahEkong/Grant collaboration repository, and personal Vercel/Neon workspaces. Other entries below are implementation recommendations, subject to the initial integration spike and service setup. Build the backend before requesting the founder's UI design reference.

| Concern | Recommended default | Constraint |
| --- | --- | --- |
| Runtime | Node.js LTS; Node 24 is the current Stellar guide's tested baseline | Node runtime for signing, DB transactions, and PDF generation; not Edge |
| Application | Next.js App Router + TypeScript | UI, route handlers, server-only domain modules |
| Dependencies | npm with committed lockfile | Pin compatible versions after the spike; do not assume floating latest versions interoperate |
| Validation | Zod | Validate every request and external payment response |
| Database | Neon PostgreSQL + Drizzle migrations/queries | Use real DB transactions and row locking for reservations |
| Authentication | Provider not selected yet; allowlisted demo editor required | Verify server-side identity; membership checks on every private action before spending |
| Storage | Private object storage, provider deferred until delivery work | Issue short-lived downloads only after checking entitlement |
| PDFs | `pdf-lib` on the server | Store generated artifacts; no browser printing dependency |
| Payments | `@x402/core`, `@x402/stellar`, `@x402/fetch`, `@stellar/stellar-sdk` | Adapter boundary; exact compatible versions recorded at G0 |
| Testing | Vitest for rules/services; Playwright for critical journeys | Separate deterministic tests from live testnet evidence |
| Deployment | Personal Vercel workspace + Neon PostgreSQL | Confirm duration limits; persist progress and return resumable status |

The official quickstart uses Express. Do not install Express as a second production server merely to copy that example. Prove an SDK-compatible Next.js route adapter first. If the core SDK or maintained framework adapter cannot support the required settlement ordering, stop at G0 and document the issue rather than inventing protocol behavior.

## 2. Enforced invariants

1. No signing without authenticated ownership, compatible coverage, valid bound approval, and an atomic budget reservation.
2. No paid entitlement until verified successful settlement. Handler execution alone is not evidence of settlement.
3. No floating-point money; no unit conversion based on another network's USDC decimals.
4. No silent terms changes, cap increases, mainnet switching, or arbitrary seller/facilitator URLs from model/user text.
5. No fresh payment while a prior attempt may have settled. Network timeout is an unknown outcome, not a confirmed failure.
6. One purchase/request key maps to one immutable request fingerprint. One settled payment reference cannot unlock multiple purchases.
7. The buyer and simulated seller use distinct testnet accounts; neither account is a production/user custody wallet.
8. An artifact error never rolls back a confirmed payment record or permits repurchase to recover delivery.

## 3. Currency and network configuration

Use the following values as documentation-backed testnet configuration, rechecked during G0 against the selected SDK and facilitator `/supported` response:

| Field | Value |
| --- | --- |
| Network | `stellar:testnet` |
| Scheme | `exact` |
| Asset | Testnet USDC SEP-41 contract |
| Contract ID | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| Classic issuer | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| Decimals | **7**, as documented for this Stellar asset |
| 1 testnet USDC | `10000000` base units |
| Default purchase cap | `20000000` base units |
| Default project budget | `50000000` base units |

Store base units as PostgreSQL `bigint`; serialize them as decimal strings in JSON. Use integer/BigInt arithmetic in application code. Never use `parseFloat` to enforce limits. Network fees/reserves are XLM concerns, separate from the USDC license/project budget; document the chosen facilitator's sponsorship behavior instead of promising free operation.

Both classic buyer and seller accounts need the correct USDC trustline. The buyer needs testnet USDC, and classic accounts need reserves even if settlement fees are sponsored. Funding accounts or installing dependencies is not part of this documentation task.

Start with the official guide's facilitator candidate `https://www.x402.org/facilitator`, but require a runtime capability check for `exact` on `stellar:testnet`. If unavailable, assess the documented OpenZeppelin testnet facilitator at `https://channels.openzeppelin.com/x402/testnet`; it requires its own service setup/API key. No fallback is automatic. Select one allowlisted facilitator at G0 and record the successful configuration. Do not send signing secrets to either service.

## 4. Domain model

All tables use durable identifiers and UTC timestamps. Private records are scoped to the authenticated workspace/owner. Immutable snapshots are not rewritten when catalog offers change.

| Entity | Essential data and constraints |
| --- | --- |
| `projects` | Owner, client private name/public display label, confirmed brief, brief version, budget, purchase cap; limits nonnegative |
| `tracks` | Title, seller ID, private audio object key, duration, provenance record; exactly three initial demo assets |
| `offers` | Track/seller, immutable version, base/add-on kind, parent/base compatibility, coverage, money/network/payee, active/expiry; unique offer ID + version |
| `purchases` | Project/track/offer version, base/add-on kind, optional parent purchase, request and coverage snapshots, request hash, idempotency key, status, price; unique owner + key, plus guarded logical-intent identity |
| `approvals` | Purchase, approving human, canonical fingerprint, validity window, consumed attempt; cannot authorize another purchase/attempt |
| `reservations` | Purchase/attempt, project, amount, state; at most one active reservation per purchase |
| `payment_attempts` | Purchase, attempt ID, immutable requirements/auth digest, SDK nonce/expiry metadata when available, submission phase, provider reference/transaction hash, reconciliation state |
| `licenses` | Settled purchase, license number, coverage snapshot/hash, exact start/end, parent license for add-ons; unique purchase |
| `receipts` | Attempt, network, asset, payee, amount, transaction hash, verified settlement metadata; unique settlement reference, also deduplicate authorization digest |
| `artifacts` | License, PDF/audio object references, generation version/hash, state/error; unique artifact kind + license + generation version |
| `share_links` | License/project-safe view, hash of high-entropy token, creation/revocation time; raw token returned only on creation |
| `refusals` | Owner/project/purchase if any, reason code, safe explanation, timestamp; no invented payment reference |
| `budget_adjustments` | Explicit operator-created demo amount/reason; not a purchase or blockchain receipt |

Database constraints must prevent negative amounts, cross-project parent licenses, duplicate settled entitlement, and duplicate consumption of an approval. If the selected SDK supports batched transactions, define the settlement reference as transaction + verified transfer/authorization identity; otherwise gate MVP to one transfer per transaction. A transaction hash alone must not be ambiguously reused.

Define logical purchase intent from owner/project, track, offer/version, confirmed brief version, and parent purchase. A partial unique constraint/transactional lookup prevents a new key from bypassing an existing active or successful intent. Return that purchase rather than signing again. Failed/expired unsigned quotes can be superseded explicitly. Renewals are outside the MVP; do not infer that changing an idempotency key authorizes a repeat purchase.

### Coverage representation

- Platforms: canonical enum `instagram`, `facebook`, `tiktok`, `youtube`; request must be a subset of explicit permitted platforms for its use.
- Uses: `organic` and `paid_ad`, with per-use platform coverage where these differ.
- Territory: explicit worldwide flag or ISO country-code set. A finite country set cannot satisfy a worldwide request.
- Term: positive maximum days for a base offer; requested term cannot exceed it. Base license begins at settlement and records exact UTC expiry.
- Clip duration: requested seconds must not exceed the applicable limit or the asset's allowed usage.
- Separate booleans/structured rules for client delivery, reposting, and future campaigns. Unknown/null is not `true`.
- Authority: demo seller assertions for composition and master plus provenance reference; reject missing authority. Do not label this independent copyright verification.
- Add-on: restrict to original client/project/track and original term/territory; only explicitly offered additional platforms/uses. Record the delta and derived combined coverage; do not modify the base snapshot.

## 5. API contracts

These are Grant application contracts, not a replacement x402 specification. Session authentication is required except for the read-only tokenized proof page. The internal buyer's paid retry uses a server-issued, short-lived attempt credential scoped to one immutable purchase; it never forwards arbitrary browser credentials to external sellers.

| Route | Purpose |
| --- | --- |
| `POST /api/projects` | Create a confirmed brief/project with configured demo limits |
| `GET /api/projects/[projectId]` | Load owned project, available budget, purchases, and refusals |
| `POST /api/projects/[projectId]/matches` | Validate brief and return compatible offers or specific mismatches |
| `POST /api/license/track` | Create/reuse quote or process the approved paid retry; core x402 seller endpoint |
| `POST /api/purchases/[purchaseId]/approve` | Explicit human approval bound to the current quote fingerprint |
| `POST /api/purchases/[purchaseId]/pay` | Authenticated buyer orchestration; reserve, sign once, and execute paid retry |
| `GET /api/purchases/[purchaseId]` | Durable status and safe receipt/delivery metadata |
| `POST /api/purchases/[purchaseId]/reconcile` | Rate-limited authenticated reconciliation; no new signature |
| `POST /api/purchases/[purchaseId]/delivery/retry` | Retry artifact work only after known settlement |
| `GET /api/purchases/[purchaseId]/download?asset=audio\|pdf` | Check owner/entitlement and issue a short-lived private download |
| `POST /api/purchases/[purchaseId]/share` | Create public-safe proof token |
| `DELETE /api/purchases/[purchaseId]/share` | Revoke current proof token |
| `GET /proof/[token]` | Render read-only, redacted coverage and receipt; no audio entitlement |

An upgrade uses the same purchase/approval/payment endpoints with a compatible add-on offer and `parentPurchaseId`; do not implement a second payment engine.

### Core purchase input

`Idempotency-Key` is an application-owned header, not an invented x402 header. Scope it to the authenticated owner; fingerprint the canonical body and project brief version.

```json
{
  "projectId": "project_demo",
  "trackId": "track_demo",
  "offerId": "offer_base",
  "offerVersion": 1,
  "kind": "base",
  "parentPurchaseId": null,
  "briefVersion": 1,
  "intendedUse": "organic",
  "platforms": ["instagram", "tiktok"],
  "territory": { "worldwide": true, "countries": [] },
  "termDays": 90,
  "clipDurationSeconds": 30,
  "clientDelivery": true,
  "reposting": false,
  "futureCampaigns": false
}
```

Resolve the client/licensee from the owned project's confirmed record; do not trust a caller-supplied owner ID or payment amount. The server prices the immutable offer. The initial quote can be obtained before approval, but payment cannot proceed before approval.

### Responses and failure semantics

- `402`: a compatible unpaid quote, using actual SDK x402 v2 requirements/headers plus safe Grant quote/coverage metadata. Quote creation itself does not reserve funds or authorize signing.
- `200`: original or newly completed purchase; audio/PDF/proof metadata and real settled receipt are available. Refresh signed download URLs rather than storing them as durable entitlements.
- `202`: work is pending, settlement is uncertain, or payment is confirmed but documents are still issuing. Include purchase ID, durable status, and a status URL; include a receipt only when settlement is known.
- `400`: malformed input; `401`: no valid identity; `403`: approval or ownership forbidden; `404`: absent/private-hidden resource.
- `409`: same key with different body, changed quote/approval, or an unresolved attempt that prevents a fresh purchase. Return safe existing-purchase context where authorized.
- `422`: rights/purchase-cap/project-budget refusal, with machine-readable reason and refusal receipt ID.
- `503`: dependency unavailable before any possible submission. After an authorization may exist or be submitted, persist pending state instead of reporting a safely retryable new payment.

Maintain a typed, privacy-safe error envelope: `code`, `message`, `purchaseId`/`refusalId` where applicable, and allowed next actions. Do not place keys or signed payloads in an error.

Use the same persisted/public purchase-state vocabulary as the state table in [architecture.md](architecture.md): `quoted`, `approved`, `reserved`, `payment_pending`, `settled`, `issuing`, `ready`, `refused`, `failed_no_settlement`, and `expired`. Keep provider-specific subphases in the attempt record rather than inventing conflicting UI states.

## 6. Approval, reservation, and payment execution

1. Normalize/validate the brief and offer. Create or reuse a purchase quote using the request key and canonical fingerprint. Proposed quote TTL is five minutes; approval expires no later than the quote.
2. The authenticated human approves the coverage snapshot and exact payment requirements. Fingerprint includes owner/project/client, request, offer version, network, asset, payee, amount, and expiry.
3. The `/pay` handler starts a DB transaction, locks the project and purchase, validates approval and current policy, and claims one attempt. Compute available budget as limit minus settled purchase amounts, explicit demo adjustments, and active reservations. Insert the reservation and consume approval for this attempt atomically.
4. Persist a `signing_started` marker before invoking the signer. Revalidate the request/offer/requirements allowlist. One request handler owns execution; competing handlers return its persisted status.
5. Create a bounded Soroban authorization using the SDK and make the paid retry against the allowlisted seller endpoint. Do not use an automatically paying fetch wrapper before this approval/reservation gate.
6. The seller verifies the attempt credential, canonical body, quote, and SDK payload, then verifies and settles through the selected facilitator. The adapter must not expose delivery bytes before settlement success.
7. In one local DB finalization transaction, record the verified receipt and immutable license, mark the purchase settled, and convert its reservation to confirmed spend without double counting. Generate/upload PDF, make owner-only proof available, and mark ready. Public sharing is a separate explicit action. Artifact work is idempotent and separately retryable.

Do not hold a SQL transaction open across a network call. There is no distributed transaction between PostgreSQL and Stellar; durable attempt states plus reconciliation bridge that boundary.

**Important binding limit:** Stellar x402 authorizations bind the asset transfer's payer, payee, amount, nonce, and validity, not all of Grant's legal/project fields. Grant enforces project/terms binding with the stored approval fingerprint, authenticated attempt context, and request/receipt associations. Do not claim that the payment notarizes or cryptographically proves copyright coverage.

### Retry and reconciliation rules

- Same key/body returns the existing quote/status/result; same key with a different body returns `409`.
- Before signing, a definitively canceled/expired attempt may release its reservation.
- Once signing may have occurred, neither quote expiry nor a timeout proves non-settlement. Keep reservation and block new signing until reconciliation determines the outcome.
- Persist authorization digest, nonce/expiry metadata, known transaction identifiers, and submission phase where supported. Treat a crash after `signing_started` as ambiguous even if no hash was recorded.
- Query the facilitator/ledger using the stored identifiers and validated transfer details. If success is found, finalize the existing receipt and entitlement, not a new purchase.
- If absence cannot be safely established, keep pending for operator review. Never infer failure merely from “transaction not found yet.”
- No automatic new authorization or blind settlement retry. Retry the same authorization only if the spike proves the SDK/facilitator replay behavior safe; otherwise reconcile without resubmitting.
- An expiring authorization cannot be replaced until the earlier outcome is accounted for. A new approved attempt after proven non-settlement requires a fresh key/approval and supersedes the old one explicitly.

At G0, demonstrate how attempt identifiers and settlement results can be recovered from the chosen SDK/hooks. At G2, test interruption windows around signing, settlement, and DB finalization. If reliable recovery cannot be established, it remains a blocker, not an accepted duplicate-charge risk.

## 7. Security, privacy, and operations

- Authenticate using verified server-side identity from the provider selected before purchase work; check ownership on every private record. Add origin/CSRF protections to mutating session routes. Explicitly allowlist demo users; public visitors cannot spend the operator's wallet.
- Scope private Neon records and storage objects by verified owner. Consider database RLS as defense in depth, but do not assume it replaces service ownership checks. Use a least-privilege database role where practical.
- Private audio/PDF buckets only. Proof pages expose opted-in client display labels, coverage, demo seller identity, and receipt metadata, not private names/emails/notes or raw object keys. Wallet addresses/transactions are publicly observable on-chain; disclose this limitation.
- Generate at least 256-bit random share tokens; store hashes and support revocation. Use `noindex`/`no-store`, avoid third-party analytics on token pages, and redact tokens from access/error logs.
- No `NEXT_PUBLIC_` prefix on signing, database, service-role, internal-attempt, or facilitator secrets. Ignore `.env*` secrets in source control; provide an example containing names/placeholders only.
- Allowlist `stellar:testnet`, asset contract, seller payee, facilitator host, and seller origin. Reject redirects or external URLs that would escape the allowlist. Never accept arbitrary asset/download paths from a model.
- Rate-limit quote, approval, pay, share, and reconciliation routes. Log safe purchase/attempt IDs and phases, not private briefs, signed authorizations, or secret-bearing HTTP bodies/headers.
- Node request timeouts must leave recoverable DB state. Use a bounded operator-triggered reconcile/artifact endpoint for the MVP; add a small scheduled sweeper only if needed, not a separate queue platform.
- No real money, automatic refunds, or claims of production custody security. Before commercial release, commission appropriate security/legal review and design refunds/disputes and ownership verification.

## 8. Configuration inventory

Planned values, not existing credentials: `DATABASE_URL` for Neon, identity-provider configuration after selection, private-storage credentials after selection, buyer testnet signing secret, seller public payee, selected facilitator URL and optional API key, internal attempt-signing secret, canonical application origin, testnet RPC URL, and demo budget/cap/quote settings.

Validate startup configuration; fail closed if mainnet, missing identity protection, wrong asset, or absent signing requirements are selected. Request user-only credentials through the host's secure secret mechanism during setup, never in chat or committed files.

## 9. Verification plan

| Level | Required checks |
| --- | --- |
| Unit | Platform/use/territory/term/client/repost/campaign matching; unknown authority; integer money; fingerprints; combined add-on coverage |
| DB integration | Atomic reservations under concurrency; uniqueness/replay; ownership scoping; one-time approval; settled-to-delivery recovery |
| Adapter contract | Real 402 schema; no signature without approval; amount/asset/payee/network mutation; settlement ordering; signature/replay behavior |
| Failure injection | Timeout before/after signing; after settlement before DB commit; PDF/storage failure; process restart and reconciliation |
| Browser journey | Brief → review → approval → pending → delivery/proof; refusals; add-on; unauthorized download; revoked proof token |
| Live testnet | Funded distinct accounts, real facilitator, verified transfer/receipt, actual protected delivery, no repeated charge on retry |

Use mocks only for deterministic/failure-injection tests and label them. Live acceptance evidence includes timestamp, versions/config identifiers (never secrets), real transaction hashes, observed transfer details, and scenario result. Do not invent passing test results in documentation.

## 10. Primary references and unresolved decisions

Checked on 2026-11-17:

- [Stellar x402 overview](https://developers.stellar.org/docs/build/agentic-payments/x402).
- [Stellar x402 quickstart](https://developers.stellar.org/docs/build/agentic-payments/x402/quickstart-guide.md).
- [Stellar seller/agent guide](https://developers.stellar.org/docs/build/agentic-payments/x402/seller-and-agent-guide.md): tested examples cite Node 24 and `@x402/*` 2.30.0; these are source baselines, not packages installed here.
- [Stellar exact-scheme specification](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_stellar.md).
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers).

G0 must decide exact SDK versions, Next.js adapter/settlement hooks, facilitator, recoverable attempt metadata, and deployed execution limits. Service accounts, funding, demo asset provenance, and official submission time also remain open. Do not treat these as configured merely because they appear in this TRD.

## 11. First implementation checkpoint

The first backend slice provides `GET /api/health`, `GET /api/catalog`, and `POST /api/license/matches`. Matching is public, stateless, and limited to explicitly labeled fixture terms. It stores no client/project data and has no signing or purchase capability. This helper route precedes the authenticated project-specific matching route in section 5.

The budget module currently provides validated integer arithmetic only. Database locking, reservations, session ownership, payment execution, and real asset delivery remain separate work. Do not expose the core payment endpoint or treat G0 as passed until an actual testnet settlement is verified.
