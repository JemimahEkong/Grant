# Grant

Backend-first music licensing agent. This checkout is connected to the existing
`JemimahEkong/Grant` collaboration repository. No separate GitHub repository is created.

## Current checkpoint

- Next.js App Router and TypeScript backend, no designed interface.
- Better Auth with the Drizzle adapter on Neon. Email/password is enabled. Google OAuth is
  wired but requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Server-side demo allowlist, session helper, and same-origin checks on mutating routes.
- Authenticated projects, quotes, approvals, payment orchestration, purchase status, and
  bounded reconciliation.
- Durable Neon persistence with Drizzle migrations for licensing records and auth records.
- Cloudflare R2 private storage using the S3 SDK. Downloads are short-lived presigned GET
  URLs issued only after an entitlement check. No public object URLs.
- Next.js x402 seller routes deployed on Vercel. A real 0.01 USDC settlement was confirmed
  through the Vercel seller route.
- Approved payment path proven with a real 1.00 USDC testnet settlement, a finalized receipt,
  a license, and bounded reconciliation. The buyer signer remains local-only.
- Production skeleton deployed at https://grant-roan.vercel.app.

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
- `GET /api/purchases/[purchaseId]/download?asset=audio|pdf` (session, ownership, and
  entitlement required)
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
DEMO_ALLOWLIST_EMAILS
```

`DEMO_ALLOWLIST_EMAILS` is a comma-separated list. An empty list fails closed. Sign-up is
rejected for emails outside the list, and every authenticated request rechecks the list.

Google OAuth needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Without both values the
provider is not registered.

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
X402_BUYER_SECRET   (local testnet only)
```

`X402_ATTEMPT_SECRET` must match between the pay route and the seller route. The deployed pay
route returns `503 PAYMENT_EXECUTION_NOT_CONFIGURED` because `X402_BUYER_SECRET` is
intentionally absent in production. The testnet buyer signer remains local-only.

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
`0001` contains the Better Auth tables. Both migrations are applied to the main and test
branches.

## Verification

```sh
npm test
npm run test:db
npm run typecheck
npm run lint
npm run build
npm run r2:check
```

`npm test` runs 60 tests in 7 files. The persistence and auth suites run when
`DATABASE_URL_TEST` is present and skip otherwise. Do not point integration tests at the
main branch.

Production smoke checks passed for health, email/password auth, sessions, project creation,
owner-scoped reads, unauthenticated `401`, and cross-origin `403`.

## Evidence

- [G0 testnet settlement](agent-state/g0-evidence.md)
- [R2 private upload and presigned download](agent-state/r2-evidence.md)
- [Vercel x402 seller and approved payment path](agent-state/payment-evidence.md)

The approved payment evidence includes:

- Vercel seller route settlement: `b1e67dfcb0c4e8940609ec101d3b6755dd2dd50fa4c6d4f359cb119b7c1698bf`
- Approved purchase settlement: `03619c78787f6c56dc1f94338907cdbcb6d560a2059e64564a1bf0f387fccfcf`
- License: `GRANT-2026-10014776FD`
- Settled reconcile: `200 ALREADY_SETTLED`
- Pending reconcile: `202 OPERATOR_REVIEW_REQUIRED`, no new signature or attempt

## Safety boundaries

- Payments are disabled in production until the testnet buyer signer is explicitly approved
  for deployment. The approved path was proven locally against the deployed seller.
- The seller route settles payment through the facilitator. The buyer orchestrator verifies
  Horizon success, payer, network, and buyer/seller USDC deltas before finalizing.
- Reconciliation never signs again and never creates a new attempt.
- Private audio and PDFs are served only through short-lived presigned GET URLs after session,
  ownership, purchase-state, license, and artifact checks.
- Catalog fixtures are metadata only. A match does not grant a license or verify music
  ownership.
- The demo payment is testnet-only. It does not prove mainnet custody, copyright coverage, or
  production financial safety.
- The UI is intentionally deferred until the founder supplies a design reference after the
  backend work is complete.

## Deployment

The linked Vercel project is `kaelah-s-projects/grant` with the Next.js preset. Production is
https://grant-roan.vercel.app. The latest code deployment includes the Next.js x402 seller
routes and the authenticated purchase routes. Vercel environment variables are sensitive.
R2 credentials are configured for Production. Google OAuth credentials are still absent.

## Product documents

[Idea](projectidea.md), [requirements](PRD.md), [technical requirements](TRD.md),
[architecture](architecture.md), [delivery plan](projectplan.md), and
[messaging](messaging.md). Follow [AGENTS.md](AGENTS.md) and resume from `agent-state/`.
