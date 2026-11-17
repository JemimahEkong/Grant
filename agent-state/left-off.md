# Left off

- Current task: production payments, buyer ceiling, rate limits, PDF, audio, and share/proof links are implemented and verified. Update state, commit, and push the checkpoint.
- Done: buyer wallet capped at 6.0000000 USDC, PAYMENTS_ENABLED Production-only, X402_BUYER_SECRET Production-only, durable rate limits, one real 1.00 USDC production purchase with no second signature, idempotent PDF generation/upload, private audio artifact and download, share link creation/revocation, and redacted proof view.
- Verified: 66 tests in 9 files passed. Typecheck, lint, build, db checks, r2:check passed. Production purchase tx 7d289d0c3e30f75841159b1c4151ba5d3a6fc61309b867d7c2a751dfef8d31b2 ledger 5784141, license GRANT-2026-74E7341FC8. Repeat pay 200 PURCHASE_ALREADY_SETTLED, one attempt before and after.
- PDF: art_3f03bc8a237f0dd4c812726c, 2435 bytes, 1 page, SHA-256 f6bc8536329b90eb6d6d35bd83d033f8189b561f31417c5940c3bed8e01c122b.
- Audio: art_b1deeb1327e003781fb7135b, 176444 bytes, SHA-256 b1deeb1327e003781fb7135b879b9da7301e6a66e667c12b25b3cfbf5fc4d7bd. Synthetic placeholder only.
- Share: creation 201, proof 200, revoke 1, proof after revoke 404.
- Git: checkpoint 81fa80b was pushed to origin/main. Production was redeployed as dpl_8BN81a9J5rhjex9oFkczodvKgBNA. Health reports purchasesEnabled true.
- Next: paid-ad add-on, then hardening. Start the UI as soon as the founder sends the design reference, without waiting for those.
- Blockers: paid-ad add-on not implemented, real authorized music absent, broader hardening and refunds/disputes absent, mainnet unsupported.
- Warnings: npm audit reports dev-tool vulnerabilities in drizzle-kit/esbuild and vitest/picomatch. Fixing them requires breaking major-version changes, so they are deferred. Vitest config still emits a CommonJS/ESM native-loader warning.
