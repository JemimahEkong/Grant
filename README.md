# Grant

Backend-first music licensing agent. This checkout is connected to the existing
`JemimahEkong/Grant` collaboration repository. No separate GitHub repository is created.

## Current checkpoint

- Next.js App Router and TypeScript backend, no designed interface.
- Better Auth with the Drizzle adapter on Neon. Email/password is enabled. Google OAuth is
  wired but requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Server-side demo allowlist, session helper, and same-origin checks on mutating routes.
- Authenticated project creation and owner-scoped project reads. Owner IDs come only from
  the verified session.
- Durable Neon persistence with Drizzle migrations for licensing records and auth records.
- Cloudflare R2 private storage adapter using the S3 SDK. Downloads are short-lived presigned
  GET URLs issued only after an entitlement check. No public object URLs are used.
- Confirmed G0 Stellar testnet x402 settlements. Evidence is in
  [agent-state/g0-evidence.md](agent-state/g0-evidence.md). Payments remain disabled in the
  product.
- Production skeleton deployed at https://grant-roan.vercel.app.

## Public endpoints

- `GET /api/health`
- `GET /api/catalog`
- `POST /api/license/matches`
- `GET` and `POST /api/auth/[...all]` (Better Auth)
- `GET /api/me` (session required)
- `POST /api/projects` (session and same-origin required)
- `GET /api/projects/[projectId]` (session and ownership required)
- `GET /api/purchases/[purchaseId]/download?asset=audio|pdf` (session, ownership, and
  entitlement required)

## Local development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the values you actually hold. `DATABASE_URL`
points at the Grant main branch. `DATABASE_URL_TEST` points at the separate Neon `test`
branch. Never commit either value.

Required for auth:

```text
BETTER_AUTH_SECRET
BETTER_AUTH_URL
APP_ORIGIN
DEMO_ALLOWLIST_EMAILS
```

`DEMO_ALLOWLIST_EMAILS` is a comma-separated list. An empty list fails closed, so nobody can
sign up or use a session. Sign-up is rejected for emails outside the list, and every
authenticated request rechecks the list.

Google OAuth needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Without both values the
provider is not registered. Email/password still works.

Required for private downloads:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

The bucket must remain private. Run `npm run r2:check` to verify connectivity. It prints
missing variable names, never values. With no R2 credentials, the download route fails
closed with `STORAGE_NOT_CONFIGURED`.

## Database workflow

Generate reviewed SQL after schema changes, then apply it with the migration runner.

```sh
npm run db:generate
npm run db:migrate
npm run db:migrate:test
npm run db:seed
npm run db:seed:test
```

Never run `drizzle-kit push`. Migration `0000` contains the licensing tables. Migration
`0001` contains the Better Auth tables: `user`, `session`, `account`, and `verification`.
Both migrations are applied to the main and test branches.

The migration runner uses the Neon HTTP driver. Application transactions use the Neon
serverless WebSocket pool so project and purchase rows can be locked during reservations.

## Verification

```sh
npm test
npm run test:db
npm run typecheck
npm run lint
npm run build
npm run r2:check
```

`npm test` runs 55 tests in 6 files. The persistence and auth suites run when
`DATABASE_URL_TEST` is present and skip otherwise. Do not point integration tests at the
main branch.

Production smoke checks passed for:

- Health and database configuration.
- Email/password sign-up and sign-in through Better Auth.
- Session lookup through `GET /api/me`.
- Authenticated project creation and owner-scoped project read.
- Unauthenticated project creation returning `401`.
- Cross-origin project creation returning `403`.

## G0 testnet evidence

Two real settlements were confirmed on `stellar:testnet`:

- `8a7770520e5e575d37bbaa4274fdc9b17b826161d7c872253e1208fbafa8d144`, ledger `5782531`,
  0.01 testnet USDC.
- `e1dcd2ef7754ea822078d2aa8c8c49535f20b5a1f890d5f093117a36cc23a160`, ledger `5782541`,
  1.00 testnet USDC.

The buyer and seller balances changed by the settled amount, and Horizon reported both
transactions successful. The local seller route granted no license or audio. The G0 scripts
bind to localhost and must not be deployed with signer secrets.

## Safety boundaries

- Payments and payment signing are disabled in the product.
- The G0 spike is local-only protocol evidence. It is not a purchase path.
- Settlement persistence is a primitive for a future verified payment adapter. It does not
  prove an on-chain transfer by itself and is not exposed to clients.
- Fixture offers have no seller payee, so approval fails closed until a real testnet payee is
  configured.
- Private audio and PDFs are served only through short-lived presigned GET URLs after session,
  ownership, purchase-state, license, and artifact checks.
- Catalog fixtures are metadata only. A match does not grant a license or verify music
  ownership.
- The UI is intentionally deferred until the founder supplies a design reference after the
  backend work is complete.

## Deployment

The linked Vercel project is `kaelah-s-projects/grant` (Next.js preset). Production is
https://grant-roan.vercel.app. Vercel environment variables are stored as sensitive values.
No R2 credentials or Google OAuth credentials are configured yet.

## Product documents

[Idea](projectidea.md), [requirements](PRD.md), [technical requirements](TRD.md),
[architecture](architecture.md), [delivery plan](projectplan.md), and
[messaging](messaging.md). Follow [AGENTS.md](AGENTS.md) and resume from `agent-state/`.
