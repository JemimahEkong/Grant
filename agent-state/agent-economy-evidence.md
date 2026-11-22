# Agent economy evidence

Deployed on 22 November 2026. Stellar testnet only. No real funds.

## Deployed seller

- URL: https://grant-seller.vercel.app
- Vercel project: `kaelah-s-projects/grant-seller` (`prj_QQMli7kWcz4bT38t5xAKdeC13DOg`)
- Payee: `GAONRKB5QBYD32SYJAG2EFFMFBNZOY73BHTNXLB2NVCXJALCTJTAXIFD`
- Payee is distinct from the first-party seller `GB53WOPIUPZTTTGPNDACTMZ3DJZ62HNRJP53ARI6EVSSBEWMLMF5SKBD` and the treasury `GBWSBWJGGL7EVHZPHQLOZTLOEDWZ2SQ4WCGX6YW5T4BXFQN74VMHLUMB`.
- Health: `{"status":"ok","service":"grant-market-seller","network":"stellar:testnet","payeeConfigured":true,"offerCount":3}`
- Project environment: `SELLER_PAYEE`, `SELLER_DATABASE_URL`, `SELLER_DOWNLOAD_SECRET`, `SELLER_FACILITATOR_URL`, `SELLER_PUBLIC_URL`. No treasury secret and no first-party seller secret is present.

## Terms travel in the challenge

Request:

```bash
curl -sS -D - https://grant-seller.vercel.app/api/offers/morning-edit/license
```

Status: `402 Payment Required`.

Body:

```json
{
  "error": "Payment required",
  "extensions": {
    "io.grant.terms": {
      "platforms": ["tiktok", "youtube"],
      "termDays": 90,
      "territory": { "worldwide": true, "countries": [] },
      "paidAds": true,
      "clientDelivery": true,
      "reposting": false,
      "futureCampaigns": false,
      "licenseCode": "cc0",
      "attributionText": "CC0 · public domain",
      "previewAllowed": true
    }
  }
}
```

The base64 `payment-required` header decodes to x402 version 2 with one `accepts` entry: scheme `exact`, network `stellar:testnet`, amount `10000000`, the testnet USDC asset, payee `GAONRKB5QBYD32SYJAG2EFFMFBNZOY73BHTNXLB2NVCXJALCTJTAXIFD`, max timeout 60, `extra.offerId = morning-edit`, and the extension key `io.grant.terms`.

The agent reads the challenge, not the listing. The successful run recorded:

```json
{"decision":"challenge","seller":"https://grant-seller.vercel.app","offerId":"morning-edit","termsKey":"io.grant.terms","termsPresent":true,"status":402}
```

The run folder also contains `challenge.json` with the decoded `paymentRequired` object. The agent compares the challenge terms with the listing terms and refuses `TERMS_CHANGED` before signing if they differ. `tests/agent-market.test.ts` covers that path.

## fit.json: paid once

Command:

```bash
npm run agent:buy -- --brief scripts/agent/briefs/fit.json --budget 20000000 --max-price 10000000 --sellers https://grant-seller.vercel.app
```

Exit code: `0`.

Decision lines:

```json
{"decision":"discovered","seller":"https://grant-seller.vercel.app","offers":3}
{"decision":"refused","code":"PAID_ADS_NOT_OFFERED","offerId":"quiet-cut","message":"The brief asks for paid ads, and this track does not offer them."}
{"decision":"refused","code":"PLATFORM_NOT_COVERED","offerId":"studio-pulse","message":"The seller does not offer tiktok for this track."}
{"decision":"refused","code":"TERM_TOO_SHORT","offerId":"studio-pulse","message":"The seller offers 30 days, and the brief asks for 90."}
{"decision":"refused","code":"PAID_ADS_NOT_OFFERED","offerId":"studio-pulse","message":"The brief asks for paid ads, and this track does not offer them."}
{"decision":"refused","code":"TERRITORY_NOT_COVERED","offerId":"studio-pulse","message":"The seller does not cover worldwide."}
{"decision":"challenge","offerId":"morning-edit","termsKey":"io.grant.terms","termsPresent":true,"status":402}
{"decision":"bought","licenseId":"sl_f7c328aa794198b6","authorizationTransactionHash":"f7c328aa794198b607cf3208def7c0002ace98337b08780d5cb9e66f12268430","settlementTransactionHash":"94745d99cbf96c1ae77a851854a09455945ab22c8bbb6b6c0fb1cc683e86da07","ledger":5857655,"priceBaseUnits":"10000000"}
```

Summary:

```json
{"summary":"BOUGHT","title":"Morning Edit","price":"1.00 USDC","licenseId":"sl_f7c328aa794198b6","buyer":"3.0000000 -> 2.0000000","sellerBalance":"3.0000000 -> 4.0000000","run":"agent-runs/2026-11-22T01-45-06-869Z-0cb64afd"}
```

- Buyer balance: `3.0000000` before, `2.0000000` after.
- Seller balance: `3.0000000` before, `4.0000000` after.
- Authorization hash: `f7c328aa794198b607cf3208def7c0002ace98337b08780d5cb9e66f12268430`
- Settlement hash: `94745d99cbf96c1ae77a851854a09455945ab22c8bbb6b6c0fb1cc683e86da07`
- Audio download: the signed URL returned `audio.mp3`, 1,257,912 bytes. The full file was saved in the run folder. The URL is short-lived and is not repeated here.

## paid-ads-refusal.json: refused before signing

Command:

```bash
npm run agent:buy -- --brief scripts/agent/briefs/paid-ads-refusal.json --budget 20000000 --max-price 10000000 --sellers https://grant-seller.vercel.app
```

Exit code: `1`.

Decision lines include:

```json
{"decision":"refused","code":"PAID_ADS_NOT_OFFERED","offerId":"quiet-cut","message":"The brief asks for paid ads, and this track does not offer them."}
{"decision":"refused","code":"PAID_ADS_NOT_OFFERED","message":"The brief asks for paid ads, and this track does not offer them."}
{"summary":"REFUSED","code":"PAID_ADS_NOT_OFFERED","message":"The brief asks for paid ads, and this track does not offer them."}
```

- Buyer balance: `2.0000000` before, `2.0000000` after.
- Seller balance: `4.0000000` before, `4.0000000` after.
- No `challenge` decision, no payment header, no transaction hash, no `seller_licenses` row, and no payment attempt were created.

## max-price.json: refused on price

Command:

```bash
npm run agent:buy -- --brief scripts/agent/briefs/max-price.json --budget 20000000 --max-price 5000000 --sellers https://grant-seller.vercel.app
```

Exit code: `1`.

Summary:

```json
{"summary":"REFUSED","code":"PRICE_ABOVE_MAX","message":"The price 1.00 USDC is above the max price 0.50 USDC."}
```

- Buyer balance: `2.0000000` before, `2.0000000` after.
- Seller balance: `4.0000000` before, `4.0000000` after.
- No challenge, no signing, no payment, no license row.

## Replay safety

The same fit command was run again:

```json
{"decision":"refused","code":"ALREADY_BOUGHT","message":"This brief was already bought in agent-runs/2026-11-22T01-45-06-869Z-0cb64afd.","licenseId":"sl_f7c328aa794198b6","transactionHash":"94745d99cbf96c1ae77a851854a09455945ab22c8bbb6b6c0fb1cc683e86da07"}
{"summary":"ALREADY_BOUGHT","licenseId":"sl_f7c328aa794198b6","transactionHash":"94745d99cbf96c1ae77a851854a09455945ab22c8bbb6b6c0fb1cc683e86da07"}
```

Exit code: `0`. Balances stayed at buyer `2.0000000` and seller `4.0000000`. Only one payment exists: authorization `f7c328...8430`, settlement `94745d...da07`.

The seller also enforces one license per authorization transaction hash with a primary key and `on conflict (transaction_hash) do nothing`. `tests/agent-market.test.ts` inserts the same hash twice against the test database and asserts one row and the same license id.

## Tests

- `npm test`: 138 tests in 20 files pass. The previous 126 remain green.
- New tests cover seller payload to brief coverage, all eight coverage refusal codes, `PRICE_ABOVE_MAX`, `PRICE_ABOVE_BUDGET`, challenge terms differing from listing terms as `TERMS_CHANGED`, canonical key-order equality, and one-license-per-hash.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass for the main app.
- `npx tsc --noEmit` and `npm run build` pass in `seller/`.

## App integration

`/app/profile` now has a read-only External sellers row. The route `/api/external-sellers` reads `EXTERNAL_SELLER_URLS` and returns the seller health.

```json
{"sellers":[{"url":"https://grant-seller.vercel.app","healthy":true,"service":"grant-market-seller","network":"stellar:testnet","offerCount":3}]}
```

The first-party seller route now labels itself `sellerType: "first-party"`. No external purchase is imported into the main purchases ledger. That would require a new source column and migration, so it was skipped.

## Judge command

```bash
npm run agent:buy -- --brief scripts/agent/briefs/paid-ads-refusal.json --budget 20000000 --max-price 10000000 --sellers https://grant-seller.vercel.app
```

This refuses with `PAID_ADS_NOT_OFFERED` before any signing. It needs `AGENT_BUYER_SECRET` in `.env.local` for the agent runtime, but the refusal does not spend.
