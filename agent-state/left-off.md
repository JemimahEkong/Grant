# Left off

- Current task: the complete UI is built, deployed, and verified on production. Update state, commit, and push the checkpoint.
- Done: DESIGN.md and tokens, responsive shell, public registration with spending-only allowlist, landing, sign-in, home, brief, catalog, review/refused/pending/license states, purchases, profile, public proof, and a real non-allowlisted gate panel. Production payments, PDF/audio delivery, and share/proof links remain verified.
- Verified: 66 tests in 9 files passed. Typecheck, lint, build, db checks, r2:check passed. Playwright passed all production routes, signed-out redirect, settled license download to private R2, and mobile bottom nav with no horizontal overflow. Production purchase tx 7d289d0c3e30f75841159b1c4151ba5d3a6fc61309b867d7c2a751dfef8d31b2 ledger 5784141, license GRANT-2026-74E7341FC8.
- PDF: art_3f03bc8a237f0dd4c812726c, 2435 bytes, 1 page, SHA-256 f6bc8536329b90eb6d6d35bd83d033f8189b561f31417c5940c3bed8e01c122b.
- Audio: art_b1deeb1327e003781fb7135b, 176444 bytes, SHA-256 b1deeb1327e003781fb7135b879b9da7301e6a66e667c12b25b3cfbf5fc4d7bd. Synthetic placeholder only.
- Share: creation 201, proof 200, revoke 1, proof after revoke 404.
- Git: checkpoint 81fa80b was pushed to origin/main. UI production deployment dpl_ErZjTE8qkMh8A45oGLSpwSTnnZc4. Health reports purchasesEnabled true.
- Next: paid-ad add-on, then hardening. The UI is built; future edits must follow DESIGN.md.
- Blockers: paid-ad add-on not implemented, real authorized music absent, broader hardening and refunds/disputes absent, mainnet unsupported. API gaps: no purchase-count cap, no artifact byte sizes, no license number in project purchase rows, and BPM/seller display names require the fixture catalog join.
- Warnings: npm audit reports dev-tool vulnerabilities in drizzle-kit/esbuild and vitest/picomatch. Fixing them requires breaking major-version changes, so they are deferred. Vitest config still emits a CommonJS/ESM native-loader warning.
