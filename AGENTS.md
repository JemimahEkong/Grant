# CRITICAL RULES - MUST FOLLOW

- Auto-log meaningful rules to the project’s AGENTS.md.
- Auto-commit and push after every meaningful checkpoint.
- Auto-clean temporary files and build clutter.
- Keep the repository in a recoverable state.

## WRITING

- Never use em dashes. Use commas, periods, hyphens, or rewrite the sentence.
- Do not use the “It’s not X, it’s Y” correction pattern. State the correct point directly.
- Avoid choppy writing. Keep the flow natural.
- Avoid semicolons in casual replies. Use periods or normal conjunctions.
- Remove stock transitions like “however,” “furthermore,” “it’s worth noting,” and “in conclusion.”
- Use contractions in casual contexts. Say “don’t” instead of “do not.”
- Use simple words. Say “use” instead of “utilize,” “start” instead of “commence,” and “find out” instead of “ascertain.”
- Avoid mid-sentence ellipses unless you’re writing deliberate dialogue.
- Avoid parenthetical asides when the idea can fit naturally into the sentence.
- Use colons sparingly. Don’t label every paragraph or list.
- Remove chatbot filler like “Great question,” “I hope this helps,” “Let me know if,” “Here is a,” and “Let’s dive in.”
- Do not use emojis unless the user clearly wants that style. (This is specific to me, you can leave it if you like to use emojis tho)
- Do not use bold text for emphasis in normal prose.
- Challenge weak reasoning. Flag unsupported claims. Do not agree just to be polite.

## RESPONSES

- Keep responses concise and to the point unless the user asks otherwise.

## AGENT STATE

- Long-running project state lives in agent-state/:
  - project-state.md tracks what’s been built, the architecture, and important decisions.
  - memory.md tracks durable facts, conventions, and gotchas.
  - left-off.md tracks the current task, what’s done, what’s next, and known issues.
- At the start of every session, read all three files before doing anything else.
- Update them at every meaningful checkpoint: feature finished, decision made, bug found, direction changed.
- Keep them short. Bullets, not essays. left-off.md must always answer: what are we doing, what’s done, what’s next.
- When the session gets compacted or messy, a new session resumes from these files.

## CONTEXT MANAGEMENT

- When the active agent session approaches roughly 250,000 consumed context tokens, proactively compact or summarize the working context before continuing. Do this before context degradation becomes noticeable.
- Preserve the current objective, repository truth, completed checkpoints and commit hashes, architectural and product decisions, unresolved blockers, relevant environment variable names but never secret values, important implementation invariants, tests and verification state, and the exact next action.
- Do not over-compress implementation-critical details.
- After compaction, continue from the preserved state rather than re-auditing the entire repository.

## PLANNING MODE

- Always ask clarifying questions.
- Never assume the design, tech stack, or features.

## CHANGE / EDIT MODE

- After completing features, whether large or small, always run commands such as lint, type check, and next build to check code quality.

## DATABASE SCHEMA CHANGES

- Whenever you make changes to the database schema, ALWAYS run db:generate then db:migrate.
- NEVER run drizzle push.
- Apply migrations to the separate Neon `test` branch with db:migrate:test. Run database integration tests only against DATABASE_URL_TEST, never the main branch.
- Migration 0001 owns the Better Auth tables. Do not rename `user`, `session`, `account`, or `verification` without updating the Drizzle adapter config.

## TESTING

- Use any testing tools and libraries available to the project to test your changes.
- Never assume your changes work; always test.
- If the project does not have any testing tools, scripts, MCP tools, or similar resources available for testing, ask the user whether testing should be skipped.

## UI DESIGN

- Always follow or reference the UI design system when creating or reviewing components or pages.
- Design System: @DESIGN.md
- Use the exact tokens, Geist Sans/Mono, inline SVG icons, the 900px breakpoint, and the clearance strip. No gradients, glass, decorative shadows, icon libraries, or images.
- Registration is public. There is no spending allowlist. Spending is bounded by the user wallet balance, faucet caps, project budget, approval, reservation, rate limits, and settlement checks.
- Pending has exactly one action, Check again. Never add a retry that can sign again.

## AUTHENTICATION AND STORAGE

- Use Better Auth with the Drizzle adapter on the existing Neon database. Email/password is the current scope. OAuth is deferred.
- Derive the owner ID only from the verified session. Never accept an owner, user, or price value from the client.
- Every user gets their own Stellar testnet account. Encrypt the secret with AES-256-GCM using WALLET_ENCRYPTION_KEY and a per-row IV. Never log, return, or commit a wallet secret.
- Balance is read from chain and cached for at most 30 seconds. Never store a balance column or treat a project budget as the balance.
- The pay route signs with the owner's encrypted wallet. Do not reintroduce a shared buyer signer or X402_BUYER_SECRET.
- The onboarding gate is a four-step sequence: generate wallet, activate account, add USDC trustline, fund. `/app` must redirect into it until complete.
- Require a same-origin Origin check on every mutating custom route.
- Use Cloudflare R2 with a private bucket. Issue short-lived presigned GET URLs only after session, ownership, purchase-state, license, and artifact checks.
- Never use public object URLs or public bucket access for licensed audio or generated PDFs.
- Use the Node runtime for Better Auth, wallet, faucet, and R2 routes.
- The faucet sends one 2.00 USDC grant per wallet under a hard 40.00 USDC daily treasury cap. Keep FAUCET_TREASURY_SECRET and WALLET_ENCRYPTION_KEY in Production only. When the treasury is empty, show the user address and manual funding instructions. Keep the treasury above the daily cap and verify capacity with fresh accounts before changing the defaults.
- The pay route must return 503 unless PAYMENTS_ENABLED is exactly "true". Keep durable per-owner rate limits on quote, approve, pay, reconcile, delivery, share, wallet, and faucet.
- The seller route must derive price, asset, and payee from the immutable purchase, never from client-supplied values. Bind it with a short-lived server-signed attempt token.
- Reconciliation must never create a new attempt or signature. It may only verify and finalize the existing attempt.
- Share tokens are high-entropy and stored only as hashes. Never expose a raw token after creation. Proof views must exclude private client names, owner emails, object keys, and audio entitlement.

## GRANT PROJECT WORKFLOW

- Build the backend first. Start the interface as soon as the founder sends a design reference. Do not wait for hardening or share-link polish.
- Use the existing collaboration repository at https://github.com/JemimahEkong/Grant. Do not create a replacement GitHub repository.
- Use the founder's personal Vercel and Neon workspaces for Grant resources. Do not modify unrelated projects.
- Keep payments behind the PAYMENTS_ENABLED flag, user wallet balance, server-side approval, persistent budget reservations, verified settlement, and reconciliation.
- Fixture catalog matching is a demonstration of term checks. It does not grant a license or verify music ownership. Demo audio is CC0 with provenance in demo/audio/PROVENANCE.md. Seller identities and offer terms remain fixtures.
- Do not expose owner-scoped persistence routes until session authentication is selected and enforced.
- Do not bypass approval, reservations, settlement verification, or reconciliation when changing payment code.
- Approvals fail closed when a seller payee is missing or is not a valid Stellar public key.
- G0 buyer/seller scripts are local-only. Keep the seller bound to localhost. The faucet treasury secret is a separate Production-only operational secret.
- The product seller payee must be a dedicated account, never the faucet treasury. Approval and the seller route fail closed if any active offer pays the treasury. Use `npm run seller:create` and `npm run db:seed:testnet` when rotating the seller. The seller secret is local-only and is not deployed.
- `npm run demo:reset` creates a new clean demo account, wallet, and project. It must not delete settled purchase evidence or other projects.
- Migration 0004 owns per-user wallets and faucet grants. Migration 0005 owns purchase_count_cap. Do not add a balance column.
- The per-project purchase-count cap is enforced in the same transaction as budget reservation. Refused and expired entries do not consume a slot.
- Paid-ad add-ons require an owned, settled base purchase, the same seller, a parent offer match, and a server-derived delta. Never accept the delta, parent, or price from the client. The add-on gets its own receipt and license and keeps the base term.
- A real testnet settlement proves the protocol only. It does not prove a product purchase, license, or music ownership.
- The approved payment evidence is in agent-state/payment-evidence.md. The Vercel seller route and the local buyer orchestration were both exercised with real testnet settlements.

- DESIGN.md v2 supersedes dark v1 styling. Use iOS light tokens, lemon fills, sans tabular money, shared primitives in components/ui.tsx, and the documented contrast clarifications. Visual work must preserve all workflow handlers.
