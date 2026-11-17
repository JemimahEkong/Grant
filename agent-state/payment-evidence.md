# x402 and approved payment evidence

Status: confirmed with real Stellar testnet settlements.

## Next.js seller route on Vercel

- Route: `GET https://grant-roan.vercel.app/api/x402/spike`
- Framework: Next.js route handler using `withX402` and `ExactStellarScheme`
- Network: `stellar:testnet`
- Facilitator: `https://www.x402.org/facilitator`
- Asset: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
- Price: 0.01 testnet USDC
- Transaction: `b1e67dfcb0c4e8940609ec101d3b6755dd2dd50fa4c6d4f359cb119b7c1698bf`
- Ledger: `5783689`
- Horizon: successful
- Buyer balance: `18.9900000` to `18.9800000` USDC
- Seller balance: `1.0100000` to `1.0200000` USDC
- This route grants no license, audio, or PDF.

## Approved payment path

- Seller route: deployed Next.js route `GET /api/x402/license`
- Buyer orchestration: local authenticated pay route, because the testnet signer is not deployed
- Network: `stellar:testnet`
- Asset: testnet USDC contract
- Amount: 1.00 USDC
- Transaction: `03619c78787f6c56dc1f94338907cdbcb6d560a2059e64564a1bf0f387fccfcf`
- Ledger: `5783809`
- Horizon: successful
- Buyer balance: `18.9800000` to `17.9800000` USDC
- Seller balance: `1.0200000` to `2.0200000` USDC
- Purchase: `pur_f70c723d832543598a1671252f71cd98`
- Project: `prj_34f5415eb1754f98b46f02dd64561d2f`
- License: `GRANT-2026-10014776FD`
- License ends: `2027-02-15T19:11:31.000Z`

The pay route performed all of these steps:

1. Verified the authenticated owner and approved purchase.
2. Reserved budget and claimed one attempt.
3. Persisted the signing marker before invoking the signer.
4. Created a purchase-scoped, short-lived attempt token.
5. Requested a genuine 402 from the Vercel seller route.
6. Signed one testnet payment and persisted its authorization digest.
7. Submitted the paid retry.
8. Verified the settlement response, Horizon success, payer, network, and buyer/seller USDC deltas.
9. Finalized the receipt, license, purchase, and reservation exactly once.

## Bounded reconciliation

- Settled purchase reconcile: `200 ALREADY_SETTLED`
- Pending attempt without a transaction hash: `202 OPERATOR_REVIEW_REQUIRED`
- The pending case did not create a new attempt, reservation, approval, or signature.
- The reconcile route accepts only a reserved or payment-pending purchase and one existing attempt. It never signs again.

## Deployment boundary

The pay route is deployed but returns `503 PAYMENT_EXECUTION_NOT_CONFIGURED` in production because `X402_BUYER_SECRET` is intentionally absent. The testnet buyer signer remains local-only. The seller route is deployed and was exercised by the local buyer orchestration.

Evidence JSON: `agent-state/x402-vercel-evidence.json` and `agent-state/approved-payment-evidence.json`.
