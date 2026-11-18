# Grant

Backend-first music licensing agent. This checkout is connected to the existing
`JemimahEkong/Grant` collaboration repository. No separate GitHub repository is created.

## Current checkpoint

- Next.js App Router and TypeScript backend with the complete Grant interface.
- DESIGN.md is the visual source of truth. The clearance strip appears on the landing, catalog, review, license, and proof.
- Better Auth with the Drizzle adapter on Neon. Email/password is enabled. OAuth is
  deferred.
- Per-user Stellar testnet wallets with AES-256-GCM encrypted secrets, a gated four-step onboarding flow, a real testnet faucet, and on-chain balances. Registration is public and there is no spending allowlist.
- Authenticated projects, quotes, approvals, payment orchestration, purchase status, and
  bounded reconciliation.
- Durable Neon persistence with Drizzle migrations for licensing records and auth records.
- Cloudflare R2 private storage using the S3 SDK. Downloads are short-lived presigned GET
  URLs issued only after an entitlement check. No public object URLs.
- Next.js x402 seller routes deployed on Vercel. A real 0.01 USDC settlement was confirmed
  through the Vercel seller route.
- Approved payment path proven with a real 1.00 USDC production testnet settlement, a
  finalized receipt, a license, and bounded reconciliation. A repeat pay call returned
  ALREADY_SETTLED with no second signature.
- Each user signs with their own encrypted wallet. The old operator buyer signer and allowlist
  are retired. `PAYMENTS_ENABLED=true` is set in Production only, and durable per-owner rate
  limits protect quote, approve, pay, reconcile, delivery, share, wallet, and faucet.
- PDF license generation and private R2 upload. Audio delivery through a private artifact.
  Share/proof links with revocation.
- Production app deployed at https://grant-roan.vercel.app.

## Screens

- `/` landing
- `/signin` sign in and public registration
- `/app` home with project switcher, on-chain wallet balance, project budget, recent purchases, and wallet strip
- `/app/onboarding/wallet`, `/activate`, `/trustline`, `/fund` first-run wallet setup
- `/app/wallet` address, QR, live balance, refresh, fund, transaction history, custody disclosure
- `/app/new` brief editor with authoritative chips and a generated sentence
- `/app/catalog` three fixture tracks with coverage strips
- `/app/purchase/[id]` review, approval, pending, refused, and settled license states
- `/app/purchases` durable ledger
- `/app/profile` account, wallet row, projects, and share-link revocation
- `/proof/[token]` public, redacted, revocable proof

## Public endpoints

- `GET /api/health`
- `GET /api/catalog`
- `POST /api/license/matches`
- `GET` and `POST /api/auth/[...all]` (Better Auth)
- `GET /api/me` (session required)
- `POST /api/projects` (session and same-origin required)
- `GET /api/projects/[projectId]` (session and ownership required)
- `POST /api/projects/[projectId]/quotes` (session, ownership, and same-origin required)
- `POST /api/purchases/[purchaseId]/approve` (session, ownership, and same-origin required)
- `POST /api/purchases/[purchaseId]/pay` (session, ownership, and same-origin required)
- `GET /api/purchases/[purchaseId]` (session and ownership required)
- `POST /api/purchases/[purchaseId]/reconcile` (session, ownership, and same-origin required)
- `POST /api/purchases/[purchaseId]/delivery/retry` (session, ownership, and same-origin
  required)
- `GET /api/purchases/[purchaseId]/download?asset=audio|pdf` (session, ownership, and
  entitlement required)
- `POST` and `DELETE /api/purchases/[purchaseId]/share` (session, ownership, and same-origin
  required)
- `GET /proof/[token]` (public, redacted, revocable proof view)
- `GET` and `POST /api/wallet` (session required)
- `POST /api/wallet/activate`, `/trustline`, `/faucet`, `/refresh`
- `GET /api/wallet/transactions`
- `GET /api/x402/license` (purchase-scoped x402 seller route)
- `GET /api/x402/spike` (testnet protocol spike)

## Local development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the values you actually hold. `DATABASE_URL`
points at the Grant main branch. `DATABASE_URL_TEST` points at the separate Neon `test`
branch. Never commit either value.

Auth values:

```text
BETTER_AUTH_SECRET
BETTER_AUTH_URL
APP_ORIGIN
```

Wallet and faucet values:

```text
WALLET_ENCRYPTION_KEY
FAUCET_TREASURY_SECRET
FAUCET_GRANT_BASE_UNITS
FAUCET_DAILY_CAP_BASE_UNITS
WALLET_MIN_XLM
```

`WALLET_ENCRYPTION_KEY` is a 32-byte base64 key. It encrypts each wallet secret with a
per-row IV using AES-256-GCM. `FAUCET_TREASURY_SECRET` signs faucet grants. Both are
Production-only secrets and must never be committed or logged.

Private storage values:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

The bucket must remain private. Run `npm run r2:check` to verify connectivity.

Payment values:

```text
X402_SELLER_PUBLIC
X402_FACILITATOR_URL
X402_ATTEMPT_SECRET
X402_SELLER_BASE_URL
PAYMENTS_ENABLED    (exactly "true" to enable pay)
```

`X402_ATTEMPT_SECRET` must match between the pay route and the seller route.
`PAYMENTS_ENABLED=true` is set in Vercel Production only. The pay route returns
`503 PAYMENTS_DISABLED` unless the flag is exactly `true`. The pay route signs with the
owner's encrypted wallet, never a shared buyer secret.

## Database workflow

```sh
npm run db:generate
npm run db:migrate
npm run db:migrate:test
npm run db:seed
npm run db:seed:test
npm run db:seed:testnet
```

Never run `drizzle-kit push`. Migration `0000` contains the licensing tables. Migration
`0001` contains the Better Auth tables. `0002` adds rate limits. `0003` adds the track audio
hash. `0004` adds per-user wallets and faucet grants. All migrations are applied to the main
and test branches.

## Verification

```sh
npm test
npm run test:db
npm run typecheck
npm run lint
npm run build
npm run r2:check
```

`npm test` runs 67 tests in 10 files. The production UI was verified with Playwright:
landing, sign-in, home, brief, catalog, review, refused state, settled license with a
private R2 download, purchases, profile, proof, signed-out redirect, and mobile bottom nav.
A fresh production account also completed the four onboarding steps, received a 5 USDC
faucet grant, and bought a 1 USDC license from its own wallet. The persistence and auth
suites run when `DATABASE_URL_TEST` is present and skip otherwise. Do not point integration
tests at the main branch.

Production smoke checks passed for health, email/password auth, sessions, project creation,
owner-scoped reads, unauthenticated `401`, and cross-origin `403`.

## Evidence

- [G0 testnet settlement](agent-state/g0-evidence.md)
- [R2 private upload and presigned download](agent-state/r2-evidence.md)
- [Vercel x402 seller and approved payment path](agent-state/payment-evidence.md)
- [Production payment](agent-state/production-payment-evidence.md)
- [PDF, audio, and share/proof delivery](agent-state/delivery-evidence.md)
- [Per-user funding and purchase proof](agent-state/funding-evidence.md)

The payment evidence includes:

- Vercel seller route settlement: `b1e67dfcb0c4e8940609ec101d3b6755dd2dd50fa4c6d4f359cb119b7c1698bf`
- Local approved purchase settlement: `03619c78787f6c56dc1f94338907cdbcb6d560a2059e64564a1bf0f387fccfcf`
- Production purchase settlement: `7d289d0c3e30f75841159b1c4151ba5d3a6fc61309b867d7c2a751dfef8d31b2`
- Production license: `GRANT-2026-74E7341FC8`
- Repeat pay: `200 PURCHASE_ALREADY_SETTLED`, no second signature
- PDF artifact: `art_3f03bc8a237f0dd4c812726c`
- Audio artifact: `art_b1deeb1327e003781fb7135b`
- Share proof read: 200, then 404 after revocation
- New faucet-funded account: `GAPYFLWNKSGSQIOH2P6SRIIZ32GYVXIYRUQZ4G4OT7JMDSK2A5U5TMHD`
- Faucet transaction: `5a6672727f59d685cd97f4feb1a953e11142d50dc32ed11b9347117c4ec3f03f`
- Faucet-funded purchase: `90be474e0a4c1b0faa5fba821f4e21a37396b9cbdb5c788f21a99f3f497f7968`
- Faucet-funded license: `GRANT-2026-9A30B34453`

## Safety boundaries

- Registration is public. There is no spending allowlist. Spending is bounded by the user's
  on-chain balance, the faucet caps, and the existing project budget, approval, reservation,
  rate-limit, and settlement checks.
- Every user has their own Stellar testnet wallet. The secret is encrypted at rest with
  AES-256-GCM and a per-row IV. It is never returned, logged, or committed.
- Balance is always read from chain and cached for at most 30 seconds. A project budget is a
  spending cap, not the wallet balance.
- The faucet sends one 5 USDC grant per wallet under a hard daily treasury cap. If the
  treasury is empty, the UI shows the wallet address and manual funding instructions.
- Payments are enabled in Production behind the `PAYMENTS_ENABLED` flag, the user's wallet
  balance, and durable per-owner rate limits.
- The seller route settles payment through the facilitator. The buyer orchestrator verifies
  Horizon success, payer, network, and buyer/seller USDC deltas before finalizing.
- Reconciliation never signs again and never creates a new attempt.
- Private audio and PDFs are served only through short-lived presigned GET URLs after session,
  ownership, purchase-state, license, and artifact checks.
- Catalog fixtures are metadata only. A match does not grant a license or verify music
  ownership.
- The demo payment is testnet-only. It does not prove mainnet custody, copyright coverage, or
  production financial safety.
- The UI follows DESIGN.md and the five supplied visual references. The paid-ad add-on,
  broader hardening, and real authorized music remain.

## Deployment

The linked Vercel project is `kaelah-s-projects/grant` with the Next.js preset. Production is
https://grant-roan.vercel.app. The latest code deployment includes the Next.js x402 seller
routes and the authenticated purchase routes. Vercel environment variables are sensitive.
R2 credentials are configured for Production. OAuth is deferred.

## Product documents

[Design system](DESIGN.md), [idea](projectidea.md), [requirements](PRD.md),
[technical requirements](TRD.md), [architecture](architecture.md),
[delivery plan](projectplan.md), and [messaging](messaging.md). Follow
[AGENTS.md](AGENTS.md) and resume from `agent-state/`.
