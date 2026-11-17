# Production payment evidence

Status: one real 1.00 USDC purchase completed on production with no second signature.

## Buyer ceiling

- Address: `GAIPPBOFGQGABZ2SQ53QUIE5T24BZYCAS2ARMENZZAM7F65B3AIZWYQP`
- Balance before purchase: `6.0000000` USDC
- Balance after purchase: `5.0000000` USDC
- Balance after repeated pay call: `5.0000000` USDC
- The buyer secret was never printed or committed.

## Purchase

- Route: `POST https://grant-roan.vercel.app/api/purchases/pur_4547cd9755e74c77bcaf7d28e30f1c00/pay`
- Seller route: `https://grant-roan.vercel.app/api/x402/license`
- Transaction: `7d289d0c3e30f75841159b1c4151ba5d3a6fc61309b867d7c2a751dfef8d31b2`
- Ledger: `5784141`
- Amount: 1.00 testnet USDC
- Network: `stellar:testnet`
- License: `GRANT-2026-74E7341FC8`
- Purchase: `pur_4547cd9755e74c77bcaf7d28e30f1c00`
- Project: `prj_d29067c15b4b4dc691e93f47533f2e8d`
- Reservation: `res_d73d79aa4d5847c19971f95ee296deb7`, state `settled`
- Receipt: `rcp_4d682301f04c4126921785e420ba5795`
- Verification source: `horizon+balance_delta`

## Repeat call

- Second pay call: `200 PURCHASE_ALREADY_SETTLED`
- Attempt count before repeat: 1
- Attempt count after repeat: 1
- Buyer balance after repeat: 5.0000000 USDC
- No second signature and no second charge.

## Controls active

- `PAYMENTS_ENABLED=true` in Vercel Production only. The pay route returns 503 unless the value is exactly `true`.
- `X402_BUYER_SECRET` is set in Vercel Production only, never Preview or Development.
- Durable per-owner rate limits are active for quote, approve, pay, reconcile, delivery, and share.
- The buyer wallet balance is the hard ceiling for any logic bug.

Evidence JSON: `agent-state/production-payment-evidence.json`.
