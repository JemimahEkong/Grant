# Grant — Architecture

Version: 1.0 | Updated: 2026-11-17 | Status: proposed, not implemented
Scope: [PRD.md](PRD.md) | Contracts: [TRD.md](TRD.md)

## 1. Architecture decision

Build one Next.js/TypeScript repository and deployment, with logically separate buyer, seller, payment, and delivery modules. Use managed PostgreSQL/auth/private storage. This is enough for a two-person hackathon team without introducing microservices, a custom chain contract, or a general-purpose agent platform.

The seller catalog is a mock business participant, not a mock blockchain payment service. Actual testnet settlement is external. A future independent seller could replace the in-process seller boundary, but catalog federation and onboarding are not MVP work.

## 2. Components and dependencies

| Component | Responsibility | Must not do |
| --- | --- | --- |
| Editor UI | Capture/confirm brief; show quote, approval, status, delivery, history | Sign with server keys, enforce policy only in browser, or assume timeout means failure |
| Session/ownership boundary | Verify editor identity and private project access | Let anonymous judges/public visitors spend the operator's wallet |
| Buyer orchestrator | Match offers, present the exact quote, gate signing, execute one approved attempt | Raise caps, select arbitrary external URLs, or create a replacement payment while pending |
| Coverage engine | Pure, deterministic comparison of confirmed brief and versioned offers | Interpret free-form legal prose as permission |
| Policy/ledger service | Bind approval, lock project, reserve budget, deduplicate purchase | Hold DB locks across network calls or count a pending payment as safely failed |
| Seller license service | Validate quote/request/attempt, invoke payment adapter, issue settled entitlement | Deliver protected assets before settlement or assert verified third-party ownership |
| x402/Stellar adapter | Encode/decode actual protocol requirements; sign, verify, settle, reconcile | Replace SDK rules with fabricated headers/receipts or switch networks automatically |
| Artifact service | Generate consistent PDF/proof data from immutable coverage; private download access | Mutate purchased terms or charge again after document failure |
| Proof renderer | Public-safe read-only coverage and transaction lookup via revocable token | Grant audio access or expose private project/customer data |
| PostgreSQL | Durable quotes, approvals, reservations, attempts, receipts, licenses | Treat application memory as the source of payment truth |
| Private object storage | Original audio and generated PDF objects | Expose whole buckets publicly |
| External facilitator + Stellar testnet | Verify/settle token transfers and expose settlement evidence | Serve as proof of music ownership or legal enforceability |

### Dependency direction

UI → authenticated route handlers → buyer/seller application services → coverage/policy/domain logic → DB/storage/payment adapters → external services.

Domain rules do not import React, Next.js route objects, or vendor HTTP clients. Both base purchases and add-ons use the same policy, settlement, and delivery code paths.

## 3. Deployment and trust boundaries

1. **Browser to Grant:** authenticated same-origin requests; CSRF/origin checks; owner-scoped records. Client-submitted prices, owners, approval flags, or payment success claims are not trusted.
2. **Buyer to simulated seller:** logical boundary in the same deployment, exposed through the core seller route. A server-issued scoped attempt credential plus canonical request fingerprint associates the paid retry with one approved purchase. Never put buyer signing keys in this credential.
3. **Grant to facilitator/RPC:** allowlisted endpoint/network/asset/payee; signed Soroban authorization and protocol payload only. Validate response and settlement details. Treat facilitator outage as a dependency failure, not permission to fabricate success.
4. **Grant to managed data services:** server-only Neon/database and storage credentials; verified-owner checks even where RLS may be bypassed. Public application configuration never authorizes private account access.
5. **Client reviewer to proof:** possession of an unguessable share token permits only a redacted view. It does not confer project ownership, purchase ability, or audio entitlement.

The founder selected a Next.js Node deployment in their personal Vercel workspace with Neon PostgreSQL in their personal Neon organization. Identity and private-storage providers remain unselected. Final setup and execution-duration suitability must be confirmed. No long-running in-memory process owns payment truth.

## 4. Purchase sequence

1. Editor signs in and confirms the project brief. Coverage engine filters the three demo offers and records reasons for non-matches.
2. UI calls `POST /api/license/track` with application idempotency key and immutable input. Seller service validates scope and returns an SDK-generated `402` quote/payment requirement plus safe coverage metadata.
3. Editor reviews the exact quote, exclusions, budget impact, and demo status, then approves through the authenticated approval endpoint.
4. Buyer `/pay` orchestration revalidates ownership, quote/approval, caps, and available budget. A short DB transaction locks the project/purchase, reserves budget, and claims one attempt.
5. Before signing, persist an attempt phase indicating a signature may be created. Invoke the SDK signer only for this approved attempt. The buyer retries the allowlisted seller route with payment payload and scoped attempt credential.
6. Seller verifies attempt/body binding and the SDK payment, then calls the facilitator to settle. A timeout after possible submission leaves the existing attempt pending.
7. One local DB transaction persists the verified receipt/license, marks the purchase settled, and converts reservation to settled spend exactly once. Artifact generation produces the PDF from the immutable license snapshot. Audio is unlocked through an entitlement-checked download endpoint.
8. When delivery is ready, return `200` with receipt/artifact metadata. If still processing or uncertain, return `202` with a durable status URL. A later refresh resumes the same purchase, not another payment.
9. Editor explicitly creates a share link for the client. The proof renderer reads the public-safe view and actual receipt; it never reads or discloses signing material.

The SDK/framework middleware's actual settlement timing must be verified at G0. If it runs a handler before settlement, that handler may prepare metadata but must not expose audio, signed downloads, PDFs, or paid entitlements until settlement is confirmed.

## 5. Durable state and failure ownership

| State | Meaning | Allowed next step |
| --- | --- | --- |
| `quoted` | Compatible immutable offer returned; no signing authorized | Approve or expire/refuse |
| `approved` | Human approved this exact fingerprint | Reserve after fresh server checks |
| `reserved` | Budget held and execution ownership claimed | Persist signing marker, then sign |
| `payment_pending` | Authorization may exist, request submitted, or outcome uncertain | Reconcile same attempt; never create a fresh payment |
| `settled` | Verified successful transfer recorded | Issue license/artifacts; no additional charge |
| `issuing` | Entitlement exists; PDF/storage work incomplete | Retry artifact generation only |
| `ready` | Audio/PDF/proof data available | Reuse receipt, refresh download, share, or request add-on |
| `refused` | A policy/rights check blocked before signing | Record reason; change request or seek human limit change |
| `failed_no_settlement` | Evidence establishes no payment occurred | Release reservation; a fresh attempt needs new approval/key |
| `expired` | Unsigned quote/approval expired | Quote and approve again |

Attempt subphases such as `signing_started` and `submitted` live in `payment_attempts`, with timestamps and available nonce/expiry/hash metadata. Transitions are conditional/atomic and audited with safe identifiers.

**Reservation rule:** unsigned abandoned reservations can be released safely once their execution lease expires. After signing may have occurred, an expired lease/quote is not enough. Retain the budget hold until settlement or authoritative non-settlement is established. A reconciler must acquire the same purchase execution lock so it cannot release a reservation while the active signer proceeds.

**Accounting rule:** available budget = configured project budget − confirmed purchase spend − explicit demo adjustments − active reservations. Finalization closes a reservation and records spend in one transaction; it does not subtract the same amount twice.

There is no atomic commit spanning Stellar and PostgreSQL. Recovery reads provider/ledger evidence and finalizes the existing attempt. If evidence is insufficient, the correct UI is pending/operator review, not a second signature.

## 6. Upgrade sequence

- Read the immutable base license; require it to be settled, unexpired, and owned by the editor's project.
- Select an explicitly compatible paid-ad add-on. Keep the same track, client/project, term end, and permitted territory.
- Present only the offered additional permissions and exact add-on price. Create a new purchase with a parent reference and fresh human approval.
- Reuse the existing reservation, payment, reconciliation, and artifact services.
- Store a separate add-on license/receipt; derive a combined view showing provenance for base and add-on rights. Never union unrelated licenses across clients, territories, or terms.
- The project's proof view shows the base and settled applicable add-ons; the original PDF remains unchanged. A combined updated PDF is a new artifact, not a rewrite of the original legal snapshot.

## 7. Planned repository layout

```text
app/
  projects/                         editor workspace and brief
  purchases/[purchaseId]/          review, approval, status, delivery
  proof/[token]/                    public-safe proof view
  api/                              thin authenticated handlers
lib/
  auth/                             identity and ownership checks
  licensing/                        schema, matching, snapshots, add-ons
  policy/                           approval, limits, reservations
  agent/                            deterministic buyer orchestration
  payments/                         SDK adapter, verification, reconciliation
  receipts/                         immutable receipt/proof view models
  documents/                        PDF generation and recovery
  storage/                          private object access
  db/                               schema, repositories, transaction helpers
demo/                               three-track catalog and labeled scenarios
drizzle/                            reviewed SQL migrations
tests/                              unit, integration, contract, journey checks
```

This is a plan, not a list of existing folders. Do not put secrets or unauthorized music in `public/` or fixture files. No specialized UI library or visual design system is selected by this architecture.

## 8. Reconciliation, observability, and artifacts

The MVP uses bounded owner/operator-triggered reconciliation and artifact retries. Add a scheduled sweeper only if the deployed environment needs one; a queue/worker platform is not required initially.

Record purchase/attempt IDs, phase changes, safe reason codes, expected/confirmed amounts, and actual transaction references. Mask secrets, signed payloads, proof tokens, and customer details. Provide a status screen capable of explaining “payment confirmed, document pending.”

Use versioned object keys and content hashes. Make artifact generation idempotent. Public proof is rendered from the same stored coverage that produced the PDF; a later catalog edit must not alter either purchase's historical terms.

## 9. Key decisions and explicit deferrals

- **One application, separate responsibilities:** faster for two people while retaining a visible buyer/seller boundary.
- **Deterministic licensing agent:** structured matching and approved tool execution demonstrate agentic payments without requiring an LLM. Natural-language assistance is optional, never authoritative.
- **No custom on-chain license token/contract:** payment receipt plus versioned application record is sufficient for the demo; it is not a copyright oracle or a notarized ownership proof.
- **Managed data/hosting:** Neon and Vercel are selected. Identity and private storage must be selected before authenticated purchase/delivery work.
- **Persistent state machine over auto-retry:** prioritize safe recovery across network/process failure.
- **Production work deferred:** multi-tenant seller onboarding, real ownership verification, production custody, contracts, refunds/disputes, arbitrary catalogs, and mainnet.

See [projectplan.md](projectplan.md) for integration gates and [TRD.md](TRD.md) for data/API/security constraints. Changes to payment boundaries require updating both documents.
