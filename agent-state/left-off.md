# Left off

- Current task: R2 proof, Vercel x402 seller route, approved payment path, and bounded reconciliation are implemented and verified. Update state, commit, and push the checkpoint.
- Done: R2 credentials in Vercel Production, production redeploy, real private upload and presigned download with owner/unauthenticated/non-owner checks, Next.js x402 seller route on Vercel, real 0.01 USDC spike settlement, purchase-scoped seller route, authenticated quote/approve/pay/status/reconcile routes, real 1.00 USDC approved purchase settlement, receipt/license finalization, and reconciliation state tests.
- Verified: R2 local owner 200 with matching SHA-256, local unauthenticated 401, local non-owner 404, production owner 200, production unauthenticated 401. Vercel spike tx b1e67dfcb0c4e8940609ec101d3b6755dd2dd50fa4c6d4f359cb119b7c1698bf ledger 5783689. Approved purchase tx 03619c78787f6c56dc1f94338907cdbcb6d560a2059e64564a1bf0f387fccfcf ledger 5783809, license GRANT-2026-10014776FD.
- Reconciliation: settled purchase 200 ALREADY_SETTLED. Pending attempt without a transaction hash 202 OPERATOR_REVIEW_REQUIRED. No new attempt or signature.
- Tests: 60 tests in 7 files passed. Typecheck, lint, build, db checks, r2:check passed.
- Git: checkpoint a4db371 was pushed to origin/main. Production was redeployed from that tree as dpl_7UJPLWmczHc2vLrCYXcq77V1XuRj.
- Next: decide whether to deploy the testnet buyer signer to enable the pay route in production. Do not deploy it without explicit founder approval. Then add PDF generation/upload, authorized audio, share links, paid-ad add-ons, rate limiting, and Google OAuth credentials.
- Blockers: Google OAuth credentials absent, production buyer signer intentionally absent, no authorized audio, no generated PDFs, no share links, no paid-ad add-ons, no production rate limiter, no refunds/disputes.
- Warnings: npm audit reports dev-tool vulnerabilities in drizzle-kit/esbuild and vitest/picomatch. Fixing them requires breaking major-version changes, so they are deferred. Vitest config still emits a CommonJS/ESM native-loader warning.
- The UI remains deferred until the backend is complete and the founder supplies a design reference.
