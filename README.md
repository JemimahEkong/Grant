# Grant

Backend-first music licensing agent. This checkout is connected to the existing
`JemimahEkong/Grant` collaboration repository. No separate GitHub repository is created.

## Current checkpoint

- Next.js App Router and TypeScript API foundation, with no designed interface.
- Durable Neon persistence with Drizzle migrations for projects, tracks, versioned offers,
  purchases, approvals, reservations, payment attempts, licenses, receipts, artifacts,
  share links, refusals, and budget adjustments.
- Server-only licensing services for confirmed projects, idempotent quotes, bound human
  approval, atomic budget reservations, unsigned reservation release, signing markers, and
  verified settlement persistence.
- Three illustrative catalog offers and deterministic project-use matching.
- Seven-decimal integer budget arithmetic and focused API, rule, and database tests.
- Payment execution, purchases over HTTP, license delivery, and the designed UI are disabled.
- Catalog terms are fixtures. Original tracks and authority evidence are still needed.

The database layer is complete enough for the licensing workflow. Authenticated HTTP routes
remain blocked until an identity provider is selected and session ownership is enforced.

## Local development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the database URLs. `DATABASE_URL` points at
the Grant main branch. `DATABASE_URL_TEST` points at the separate Neon `test` branch used by
integration tests. Never commit either value.

The root URL returns backend status JSON. Available public endpoints:

- `GET /api/health`
- `GET /api/catalog`
- `POST /api/license/matches`

Example match request:

```json
{
  "intendedUse": "paid_ad",
  "platforms": ["instagram", "tiktok"],
  "territory": { "worldwide": true, "countries": [] },
  "termDays": 90,
  "clipDurationSeconds": 30,
  "clientDelivery": true,
  "reposting": false,
  "futureCampaigns": false
}
```

Send `Content-Type: application/json`. Unknown fields, missing permissions, malformed
JSON, and requests over 16 KiB are rejected. This public, stateless fixture matcher does
not persist client details, approve spending, or grant a license.

## Database workflow

Generate reviewed SQL after schema changes, then apply it with the migration runner.

```sh
npm run db:generate
npm run db:migrate
npm run db:migrate:test
```

Never run `drizzle-kit push`. Apply the same migrations to both the main and test branches.
Seed the three illustrative tracks and offers with:

```sh
npm run db:seed
npm run db:seed:test
```

Check connectivity without changing schema or data:

```sh
npm run db:check
npm run db:check:test
```

The migration runner uses the Neon HTTP driver. Application transactions use the Neon
serverless WebSocket pool so project and purchase rows can be locked during reservations.

## Verification

```sh
npm test
npm run test:db
npm run typecheck
npm run lint
npm run build
```

`npm test` always runs unit and route tests. The persistence suite runs when
`DATABASE_URL_TEST` is present and skips otherwise. It uses a unique test owner and removes
its rows after the run. Do not point integration tests at the main branch.

The verified workflow covers project creation, idempotent quote reuse, rights refusals,
bound approval, missing-payee refusal, atomic reservation, concurrent reservation
serialization, purchase-cap and budget refusals, unsigned release, the signing marker,
verified settlement persistence, receipt/license idempotency, and owner scoping.

## Safety boundaries

- Purchases and payment signing are disabled.
- Settlement finalization is a persistence primitive for a future verified payment adapter.
  It does not prove that a transfer occurred and must not be exposed to clients.
- Fixture offers have no seller payee, so approval fails closed until a real testnet payee is
  configured. A demo fixture match does not grant a license or verify music ownership.
- Wallet addresses and transactions are public on-chain. Receipts are payment evidence, not
  copyright verification.
- No owner-scoped HTTP endpoints exist yet. Session authentication must be selected and
  enforced before adding them.

Cloud resources use the founder's personal Vercel and Neon workspaces. Never commit
credentials or `.env` files.

## Product documents

[Idea](projectidea.md), [requirements](PRD.md), [technical requirements](TRD.md),
[architecture](architecture.md), [delivery plan](projectplan.md), and
[messaging](messaging.md). Follow [AGENTS.md](AGENTS.md) and resume from `agent-state/`.

The UI is intentionally deferred until the founder supplies a design reference after the
backend work is complete.
