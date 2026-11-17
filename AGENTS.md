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
- Registration is public. The demo allowlist gates spending only. Non-allowlisted owners can review and be refused. The pay route returns 403 DEMO_ACCOUNT_REQUIRED and the review screen renders an explanatory panel.
- Pending has exactly one action, Check again. Never add a retry that can sign again.

## AUTHENTICATION AND STORAGE

- Use Better Auth with the Drizzle adapter on the existing Neon database. Email/password is the current scope. OAuth is deferred.
- Enforce the demo allowlist server-side. Reject sign-up and existing sessions outside the allowlist. An empty allowlist fails closed.
- Derive the owner ID only from the verified session. Never accept an owner, user, or price value from the client.
- Require a same-origin Origin check on every mutating custom route.
- Use Cloudflare R2 with a private bucket. Issue short-lived presigned GET URLs only after session, ownership, purchase-state, license, and artifact checks.
- Never use public object URLs or public bucket access for licensed audio or generated PDFs.
- Use the Node runtime for Better Auth and R2 routes.
- The testnet buyer signer is approved for Vercel Production only. Never set X402_BUYER_SECRET in Preview or Development. Keep the buyer wallet funded to the approved hard ceiling, currently 6 USDC.
- The pay route must return 503 unless PAYMENTS_ENABLED is exactly "true". Keep durable per-owner rate limits on quote, approve, pay, reconcile, delivery, and share before enabling payments.
- The seller route must derive price, asset, and payee from the immutable purchase, never from client-supplied values. Bind it with a short-lived server-signed attempt token.
- Reconciliation must never create a new attempt or signature. It may only verify and finalize the existing attempt.
- Share tokens are high-entropy and stored only as hashes. Never expose a raw token after creation. Proof views must exclude private client names, owner emails, object keys, and audio entitlement.

## GRANT PROJECT WORKFLOW

- Build the backend first. Start the interface as soon as the founder sends a design reference. Do not wait for paid-ad add-ons, hardening, or share-link polish.
- Use the existing collaboration repository at https://github.com/JemimahEkong/Grant. Do not create a replacement GitHub repository.
- Use the founder's personal Vercel and Neon workspaces for Grant resources. Do not modify unrelated projects.
- Keep payments disabled until server-side human approval, persistent budget reservations, verified settlement, and safe reconciliation are implemented.
- Fixture catalog matching is a demonstration of term checks. It does not grant a license or verify music ownership.
- Do not expose owner-scoped persistence routes until session authentication is selected and enforced.
- Payment execution stays disabled. Persisting verified settlement evidence is not permission to enable checkout.
- Approvals fail closed when a seller payee is missing or is not a valid Stellar public key.
- G0 buyer/seller scripts are local-only. Never deploy buyer signer secrets, and keep the seller bound to localhost.
- A real testnet settlement proves the protocol only. It does not prove a product purchase, license, or music ownership.
- The approved payment evidence is in agent-state/payment-evidence.md. The Vercel seller route and the local buyer orchestration were both exercised with real testnet settlements.
