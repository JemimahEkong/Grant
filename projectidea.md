# Grant — Project Idea

Version: 1.0 | Updated: 2026-11-17 | Status: pre-build, hackathon scope

## 1. The idea

Grant is a music-licensing agent for freelance video editors. It checks whether a seller's structured offer covers a client project, requests approval, pays through x402 on Stellar testnet, and delivers the audio, a project-specific license PDF, and a shareable coverage page.

**Working tagline:** Music permission your client can see.

The editor buys specified permission to use a track. Ownership stays with the rights holder. Grant does not acquire or transfer music ownership merely by processing a purchase.

## 2. The problem we are addressing

An editor may find a suitable track but still need to answer:

- Does this offer cover Instagram, TikTok, Facebook, or YouTube?
- Can the client run paid ads, or only publish an organic post?
- Who may use the track: the editor, the named client, or both?
- Which territories, term, reposts, and future campaigns are covered?
- What can the editor send the client to explain the purchase?
- What happens when the client asks to boost an existing video?

These are the team's problem hypotheses, not independently verified market findings. The original discovery attachments are not reproduced in this repository. Do not invent interview quotes, market-size numbers, customer traction, or time savings.

## 3. Who it serves

**Primary user:** a freelance editor delivering short-form client videos.

**Recipient:** the client or project reviewer who needs readable coverage information.

**Supply-side participant:** a rights holder authorized to offer the required composition and master permissions. Rights may be split between parties; a recording owner is not automatically authorized to license the composition.

For the hackathon, the seller is simulated. The two-person team supplies three original demo tracks it owns or obtains explicit authority to offer. Acquiring those assets is still a task, not a completed fact.

## 4. The core experience

1. The editor creates a project and confirms a structured brief: client, platforms, use, territory, term, and relevant reuse permissions.
2. Grant compares that brief with a small catalog of versioned offers. Missing or incompatible permissions produce a refusal, not a guess.
3. The editor reviews the proposed coverage, exclusions, exact testnet price, and budget impact.
4. The editor explicitly approves. Grant rechecks policy and executes the x402 payment flow on Stellar testnet.
5. After confirmed settlement, Grant delivers protected audio access, a PDF, and a shareable proof page containing coverage and the payment receipt.
6. A later paid-ad request can purchase an explicitly offered add-on for the same track and project, with fresh approval and a separate receipt.

## 5. Why build it this way?

| Product decision | Intended benefit |
| --- | --- |
| Structured offers rather than AI interpretation of legal prose | Make compatibility checks explainable and testable |
| Project-specific license, PDF, and coverage page | Give the editor something concrete to hand to a client |
| x402 per-request payment | Demonstrate a payment-enabled licensing API without a subscription |
| Approval plus project and purchase caps | Keep the agent's spending under human control |
| Linked paid-ad add-on | Handle a change in intended use without rewriting the original purchase |

These are design hypotheses. They are not claims that competitors lack these capabilities or that customers have already chosen Grant.

## 6. Demo truth table

| Element | Hackathon treatment |
| --- | --- |
| Catalog and seller | Simulated, clearly labeled |
| Music | Three original/authorized demo assets; ownership or permission recorded |
| Coverage decisions | Real deterministic checks against demo terms |
| Payment | Actual Stellar testnet settlement with a verifiable transaction |
| Funds | Testnet USDC, not real commercial purchases |
| License PDF and coverage page | Generated demo artifacts with coverage and provenance labels |
| Seller authority | Team-recorded demo provenance, not automated third-party verification |
| Legal clearance / platform acceptance | Not established by a receipt or guaranteed by Grant |

## 7. Scope and business model

The MVP includes matching, approval, capped purchases, audio/PDF delivery, shareable proof, paid-ad upgrades, spending history, and refusal receipts. It excludes real catalogs, mainnet, fiat, subscriptions, Content ID clearance, audio preview players, and seller onboarding.

Demo defaults are a **5 testnet USDC project budget**, **2 testnet USDC per-purchase cap**, **1 testnet USDC base license**, and **1 testnet USDC add-on**. These are configurable demo assumptions, not commercial prices or market validation.

A later business could charge a transaction/service fee or sell workflow software to rights holders. Pricing, seller acquisition, legal agreements, and commercial viability remain unvalidated. No fee is added to the hackathon purchase flow.

## 8. Build order and open questions

Prove one approved testnet purchase before expanding the interface. Then add delivery/proof, refusal/recovery scenarios, and the add-on flow. Keep the final two build days for reliability and submission material.

Before claiming a production product, resolve real seller authority, enforceable legal terms, catalog partnerships, custody/security design, support and refunds, distribution/platform requirements, and customer validation. The product name **Grant** is chosen; domain/trademark availability has not been checked.

## 9. Document map

- [PRD.md](PRD.md): users, scope, product requirements, acceptance criteria.
- [TRD.md](TRD.md): data, APIs, payment invariants, security, testing.
- [architecture.md](architecture.md): components, trust boundaries, and runtime flows.
- [projectplan.md](projectplan.md): two-person tasks, dependencies, and delivery gates.
- [messaging.md](messaging.md): positioning, copy, terminology, and claims policy.

This suite supersedes the historical [MVP_PLAN.md](MVP_PLAN.md). The documents describe planned behavior, not completed implementation.
