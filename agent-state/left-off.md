# Left off

- Current task: auth, R2 adapter, G0 evidence, and Vercel skeleton are implemented and verified. Update state, commit, and push the checkpoint.
- Done: Better Auth with the Drizzle adapter, migration 0001 auth tables, email/password, server-side allowlist, session helper, origin checks, authenticated project create/read, R2 presigned-download adapter with entitlement checks, local G0 x402 seller/buyer, two confirmed testnet settlements, Vercel production deployment, and production smoke tests.
- Verified: 55 tests in 6 files passed. Typecheck, lint, and production build passed. Main and test branches at migration 0001. Production health/auth/project/ownership/origin smoke tests passed.
- G0 evidence: 0.01 USDC tx 8a7770520e5e575d37bbaa4274fdc9b17b826161d7c872253e1208fbafa8d144 ledger 5782531. 1.00 USDC tx e1dcd2ef7754ea822078d2aa8c8c49535f20b5a1f890d5f093117a36cc23a160 ledger 5782541. See agent-state/g0-evidence.md.
- Deployment: https://grant-roan.vercel.app. Latest production deployment dpl_22UxLcW7onzk6uAUP4RePuupcsir. Vercel framework preset is Next.js. Sensitive env vars are set, including DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, APP_ORIGIN, and DEMO_ALLOWLIST_EMAILS.
- Git: checkpoint 2db62aa was pushed to origin/main. Production was redeployed from that tree.
- Next: obtain Google OAuth credentials and R2 credentials. Then implement real artifact generation/upload, connect the approved payment path to the verified settlement persistence, and add bounded reconciliation. Keep payments disabled until that full path is tested.
- Blockers: no GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET, no R2 credentials, no seller payee, no buyer signer integration, no payment execution adapter, no reconciliation, no authorized audio, no generated PDFs.
- Warnings: npm audit reports dev-tool vulnerabilities in drizzle-kit/esbuild and vitest/picomatch. Fixing them requires breaking major-version changes, so they are deferred. Vitest config still emits a CommonJS/ESM native-loader warning.
- Do not ask for the UI design reference yet. Payment execution, reconciliation, artifacts, and delivery remain backend work.
