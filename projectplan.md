# Grant — Project Plan

Version: 1.0 | Updated: 2026-11-17 | Team: two people
Status: documentation drafted; application, infrastructure, and testnet integration not started

## 1. Sources of truth

- [projectidea.md](projectidea.md): what Grant is and why it exists.
- [PRD.md](PRD.md): release scope, functional requirements, acceptance scenarios.
- [TRD.md](TRD.md): data, money, API, policy, and settlement contracts.
- [architecture.md](architecture.md): components, trust boundaries, durable flows.
- [messaging.md](messaging.md): positioning, draft copy, claims, skill options.

The earlier [MVP_PLAN.md](MVP_PLAN.md) is historical. Use this suite for implementation. Drafted documents do not mean their features, tests, accounts, or tracks already exist.

## 2. Roles and working rules

**Builder A:** leads backend/schema, coverage/policy, x402 settlement, and recovery.

**Builder B:** leads project/approval/delivery/proof UI, demo asset preparation, messaging, and submission assembly.

These are suggested workstreams, not assumptions about either person's experience. Swap them freely and pair on G0, approval/payment review, and the final demonstration.

- Start each session with one concrete vertical slice and its acceptance check.
- Agree on typed contracts before A and B work on connected screens/services.
- Use one repository. No microservices or speculative infrastructure.
- Keep changes small and review each other's policy and money-handling changes.
- Do not commit secrets, upload unauthorized audio, or use real funds.
- Label stubbed UI, mocked tests, seeded adjustments, and live testnet evidence distinctly.
- No scope addition without identifying which existing task/time it replaces.

## 3. Completed and outstanding foundations

- [x] Choose the product name Grant and the Next.js/TypeScript direction.
- [x] Draft the five requested planning documents and `messaging.md`.
- [x] Research messaging skill candidates; no skill installation performed.
- [ ] Review/correct the document assumptions as a team.
- [ ] Confirm the official submission date/timezone and apply the known submission format to a checklist.
- [ ] Supply or create three original/authorized tracks and record composition/master provenance.
- [ ] Provision source repository, deployment, database/auth/storage services.
- [ ] Select and prove the SDK/facilitator/runtime configuration.
- [ ] Fund distinct buyer/seller testnet accounts and establish required USDC trustlines.

## 4. Milestones and delivery gates

Dates assume a November 28, 2026 deadline carried forward from earlier discussion. It has not been independently verified. This gives approximately eleven build days starting November 17, with November 28 reserved for submission; rebase the plan if the official cutoff differs.

### G0 — Prove payment before product UI

**Target: Nov 17-18. Owners: pair; A leads. Dependencies: accounts, test funds, supported facilitator.**

- [ ] Bootstrap Next.js/TypeScript with Node runtime and pin compatible SDK versions.
- [ ] Follow current Stellar x402 guidance; verify `exact` + `stellar:testnet` via `/supported`.
- [ ] Record the chosen facilitator, actual testnet USDC contract/7-decimal units, network, SDK versions, and test setup without secrets.
- [ ] Prove a compatible Next.js seller route returning genuine x402 requirements and a buyer obtaining actual testnet settlement.
- [ ] Verify settlement ordering: no protected content/entitlement before confirmed payment.
- [ ] Identify SDK hooks/metadata for authorization digest, nonce/expiry, settlement reference, and uncertain-attempt recovery.
- [ ] Confirm how replaying the same authorization is handled; do not assume middleware makes application purchases idempotent.

**Exit:** a real transaction verified against expected amount/asset/payee plus a documented adapter/recovery approach. This is a protocol spike, not yet the full human-approved product. Do not expose an unguarded spike signer publicly. If blocked, stop UI integration and resolve the dependency; never substitute a fake receipt.

### G1 — One safe approved purchase

**Target: Nov 19-22. A: backend/policy; B: brief/review/approval/status screens. Depends on G0.**

- [ ] Add DB migrations, authentication/allowlist, ownership checks, and private storage setup.
- [ ] Seed the three authorized demo assets and immutable offers.
- [ ] Implement structured brief and coverage matching (FR-02–04).
- [ ] Build review UI showing exact coverage, exclusions, price, cap, budget, and demo labels (FR-05).
- [ ] Implement bound human approval and server-enforced atomic reservations (FR-06–07).
- [ ] Connect the buyer/seller adapter to `POST /api/license/track` through the approved execution path (FR-08).
- [ ] Persist attempts, request fingerprints, idempotency constraints, receipts, and immutable entitlement (FR-09).
- [ ] Display truthful pending/refused/settled states and machine-readable refusal receipts (FR-14).

**Exit:** authenticated owner completes one approved 1 testnet USDC purchase within default 5-project/2-purchase limits; no signing on rights or policy refusal. Refresh/retry returns the same purchase instead of charging again.

### G2 — Recovery, delivery, and proof

**Target: Nov 23-24. A: recovery/artifacts; B: delivery/proof/history. Depends on G1.**

- [ ] Test concurrent reservations and duplicate requests with same/different keys for the same logical intent.
- [ ] Inject interruption around signing, submission, settlement, and DB finalization. Reconcile the same attempt without a new charge.
- [ ] Protect audio delivery; generate/store the PDF from the purchased coverage snapshot (FR-10).
- [ ] Add retryable document generation after settled-payment failure.
- [ ] Build public-safe proof, explicit sharing, token revocation, and transaction lookup (FR-11).
- [ ] Add purchase/refusal/spending history with separate pending amounts and labeled demo adjustments (FR-13).
- [ ] Check keyboard access, error labels, loading states, private ownership boundaries, and no secret/token leakage.

**Exit:** AC-01–07, AC-09, and AC-10 have recorded results; proof and PDF agree, real receipts can be looked up, uncertain outcomes stay pending, and document recovery never repays.

### G3 — Paid-ad add-on

**Target: Nov 25. Owners: pair. Depends on G1 and G2.**

- [ ] Add parent-purchase validation and an explicitly offered paid-ad delta (FR-12).
- [ ] Reuse approval, budget, signing, settlement, and recovery services.
- [ ] Preserve original terms/receipt and co-terminate add-on with the original license.
- [ ] Show combined coverage with two receipts; generate any combined PDF as a new artifact.
- [ ] Test unavailable upgrade, wrong client/project/track, expired base, budget refusal, and duplicate add-on attempt.

**Exit:** AC-08 passes with actual testnet payment. No duplicated payment engine or rewritten original license.

### G4 — Feature freeze, evidence, and submission

**Target: Nov 26-27. Owners: both; split QA and video/docs. Depends on G3.**

- [ ] Run targeted unit/DB/adapter tests, then the critical browser journeys and production build/type checks.
- [ ] Rehearse successful purchase, rights mismatch, cap refusal, budget refusal, and paid-ad upgrade.
- [ ] Record actual testnet evidence and known limitations; distinguish mocked failure tests from live settlement tests.
- [ ] Prepare README with setup, architecture, test commands, demo boundaries, wallet/funding requirements, and limitations.
- [ ] Record the demo video and assemble artifacts using the submission format the founder already knows.
- [ ] Verify every submitted URL, permission, repository requirement, and recording duration against that format.
- [ ] Have both teammates explain the approval/cap model and what the payment receipt does not prove.

**Exit:** all PRD acceptance scenarios have recorded pass/fail evidence; unresolved safety failures block a “working flow” claim. No new features after freeze.

### G5 — Submit

**Target: Nov 28 only if that is the verified deadline. Owners: both.**

- [ ] Submit before the official cutoff with upload/network buffer.
- [ ] Reopen submitted links and check reviewer access without exposing signing controls.
- [ ] Save confirmation and the exact submitted version/artifact references.

## 5. Proposed demo fixtures

Names and terms below are illustrative seed specifications, not existing assets or legally reviewed licenses.

| Track | Base coverage | Price | Add-on |
| --- | --- | --- | --- |
| Morning Edit | Organic/paid-ad use on all four supported platforms; worldwide; up to 90 days and 60 seconds; client delivery/reposting allowed; future campaigns excluded | 1 testnet USDC | None needed for the initial paid-ad brief |
| Quiet Cut | Organic Instagram/TikTok; worldwide; up to 90 days and 60 seconds; client delivery allowed; reposting/future campaigns excluded | 1 testnet USDC | 1 testnet USDC for paid ads on the same platforms, client/project, territory, and original term |
| Studio Pulse | Organic YouTube; Nigeria only; up to 30 days and 30 seconds; client delivery allowed; reposting/future campaigns excluded | 1 testnet USDC | Not offered |

Use independent demo projects:

- **Happy path:** 5 USDC budget / 2 USDC cap, compatible brief.
- **Rights refusal:** incompatible paid TikTok request against Studio Pulse; no signing.
- **Cap refusal:** explicitly operator-configured 0.5 USDC cap against a 1 USDC offer. Grant does not lower or raise caps itself.
- **Budget refusal:** default 5 USDC limit with an explicit labeled 4.5 USDC demo budget adjustment, leaving 0.5. This adjustment is not a blockchain purchase and has no fabricated transaction hash.
- **Upgrade:** Quiet Cut organic purchase, then its compatible paid-ad add-on, each with approval and its own actual receipt.

## 6. Acceptance evidence

For each AC-01–10, record scenario, environment, test time, expected/observed result, test command or manual steps, and actual transaction reference where relevant. Record failures as failures. Never include keys, signed payloads, private customer records, or raw proof tokens in committed evidence.

No tests have run and no acceptance scenario has passed yet; this is the plan for collecting evidence during implementation.

## 7. Risks and scope discipline

| Risk | Response |
| --- | --- |
| No authorized tracks | Make original material or obtain explicit composition/master permission before catalog publication |
| Facilitator/faucet unavailable | Check early; document approved alternatives; no silent provider/network substitution |
| SDK/framework mismatch or unrecoverable settlement | G0 blocker; resolve the adapter before relying on it |
| Duplicate-charge/budget race | DB constraints, one execution owner, atomic reservations, pending reconciliation; no blind retry |
| Two-person time pressure | Keep three tracks, ordinary forms, deterministic matching, and managed services |
| Delivery failure | Retain settled entitlement; retry artifacts without another charge |
| Misleading legal/payment claims | Use demo labels and the claims policy in messaging.md |
| Wrong deadline/timezone | Verify official cutoff before scheduling submission |

Reduce decorative UI, optional natural-language parsing, ranking, or additional catalog work first. Do not silently remove requested proof or upgrades. Approvals, caps, settlement verification, and safe retry are not optional shortcuts. If a required milestone cannot be met, report the actual incomplete scope and agree on a change.

## 8. Next implementation action

Begin G0: scaffold the repository and prove one Stellar x402 payment in the chosen Next.js runtime, alongside confirming track provenance and the official cutoff. The current request produces documentation only; it does not provision accounts, install skills, or begin signing/payment execution.
