# Design v2 verification

- Scope: visual components, CSS, browser theme metadata and favicon only. No API, auth, payment, wallet, settlement, reservation, rate-limit or migration implementation changed.
- 72 tests across 12 files pass, including test database integration. Typecheck, lint and Next production build pass.
- Production browser checks: landing, sign-in, home, brief, catalog, purchases, wallet, profile, public proof, settled base license and paid-ad add-on. Checked at 390px and 1280px. No horizontal overflow found.
- Four onboarding steps checked with a fresh account at both widths. Wallet generation, activation and trustline succeeded. Stopped at funding without claiming a faucet grant.
- Fresh review created through catalog. Approve & pay remains the sole payment entry point. No new payment submitted during visual verification.
- Pending/refused/expired branches retain their existing handlers and shared styles. A live pending settlement was not induced during this pass. Unit/integration tests cover payment lifecycle, refusals, reservations and caps.
- Contrast ratios: ink/canvas 16.39, ink-2/white 7.88, brand-ink/lemon 12.99, white/deep 12.61, deep/brand-soft 11.27, deep/success-soft 11.26, brand-ink/warning-soft 14.91, ink/danger-soft 15.43, danger/white 4.54.
- DESIGN.md documents darker small text and status labels, plus opaque tab navigation under the project no-glass rule.
- Initial v2 deployment: dpl_9Z1KajAwPR2UKqoasA2SoAnpfnfP. Final follow-up adds catalog search, sticky brief CTA, shared legal footer and light browser chrome.

- Final route sweep found Studio Pulse refusal provenance URL overflow at 390px. Fixed with a shrinkable review header and wrapping provenance text.
- Signed-out proof verified at both widths with /api/me returning 401 and the proof still rendering. Final deployment uses light colour-scheme metadata.

- Final production: dpl_9AdbJJrMpFFng7uqz8RFz7uHPfr2, code 7511555. Refused screen retested at 390px: scroll width 375px and provenance overflow-wrap anywhere. At 1280px: scroll width 1265px. Quote naturally expired and the expired screen was verified at both widths.
