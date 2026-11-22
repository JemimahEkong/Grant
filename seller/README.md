# Grant Market Seller

A standalone external seller for the Grant agent economy demo. It has its own package, Vercel project, payee, terms, database table, audio files, and download signing secret. It shares no runtime with the main Grant app.

## Deployed demo

- URL: https://grant-seller.vercel.app
- Vercel project: `kaelah-s-projects/grant-seller`
- Payee: `GAONRKB5QBYD32SYJAG2EFFMFBNZOY73BHTNXLB2NVCXJALCTJTAXIFD`

The payee is distinct from the Grant first-party seller and the treasury. The project has only `SELLER_PAYEE`, `SELLER_DATABASE_URL`, `SELLER_DOWNLOAD_SECRET`, `SELLER_FACILITATOR_URL`, and `SELLER_PUBLIC_URL` in Production.

## Endpoints

- `GET /api/offers` returns the machine-readable offers and full terms.
- `GET /api/offers/[id]/license` returns a `402` with x402 Stellar testnet requirements and the terms under `extensions["io.grant.terms"]`. A paid request returns the license, attribution, a short-lived signed audio URL, and a proof URL.
- `GET /api/health` returns service status.
- `GET /api/download?token=...` serves the licensed audio after a signed and unexpired token check.
- `GET /proof/[licenseId]` is the public proof page.

## Deploy

1. Create a Vercel project with this directory as the root.
2. Add the environment variables below to Production.
3. Deploy with `vercel deploy --prod`.
4. Read the deployment URL and set `SELLER_PUBLIC_URL` to that origin. Redeploy once so the license download and proof URLs use the public origin.

```text
SELLER_PAYEE=G...                 # public Stellar payee, separate from Grant's treasury and first-party seller
SELLER_PUBLIC_URL=https://...     # the deployed origin
SELLER_DATABASE_URL=postgres...   # Neon URL; the app creates the seller_licenses table on first use
SELLER_DOWNLOAD_SECRET=...        # random 32-byte secret for short-lived download tokens
SELLER_FACILITATOR_URL=https://www.x402.org/facilitator
```

The payee secret is not needed by this service. Only the public address is configured. The `seller_licenses` table is keyed by transaction hash so replaying the same payment returns the same license.

## Local

```bash
npm install
npm run dev
```

The service uses the audio files in `audio/`. The main app keeps its own copies. This seller is a separate fixture and does not claim legal authority over the recordings.
