# Reference refinement QA

Final result: passed for the adapted Grant visual system.

## Scope and comparison
- Compared supplied wallet, invoice, profile, landing and typography screenshots with the running Grant UI. These are layout references, not identical product content. Grant remains light lemon/deep green, and the wallet reference is dark red.
- Mobile viewport 390 x 844 CSS px; browser screenshots are 488 x 1055 pixels at OS scale 1.25. Comparison board normalizes images to a common display width and crops reference device surroundings. Desktop viewport 1280 x 900.
- Comparison evidence: ../comparison-qa-final.png. Source attachments remain in the user's attachment directory. Browser captures are under the T3 browser-artifacts directory.

## Findings and fixes
- P1: text-only quick-action circles, nested white balance card and repeated project prompts. Fixed with icon containers and labels, a single balance/footer surface and a single project entry. Final Home capture browser-screenshot-localhost-mwndc372-2ed9a5d0.png confirms the revision.
- P1: conflicting legacy primary-action rule produced dark text on dark fill. Explicit lemon fill now wins; final Home capture verifies readable text.
- P2: purchase rows looked like uncontained text. Now separate white rounded cards with icon, metadata separator and status. Full refusal explanation remains on detail. Final list capture browser-screenshot-localhost-mwnd8qav-8a587740.png.
- P2: body and button weights and sizes were too heavy. Local variable Inter now supplies the complete UI font, with 15px body, 13px supporting text, 14px controls, semibold titles and tabular money. The exact reference font cannot be identified from pixels alone.
- P2: landing had a flat single card. Native license preview now has a floating term-check note and lemon deliverables layer; headline, CTAs, coverage band and closing section rebalanced. Desktop capture browser-screenshot-localhost-mwnd5rl4-ff913795.png.

## Required fidelity surfaces
- Typography: local font loaded and verified from computed styles. Supporting copy, labels and control sizes are consistent; chain data stays mono.
- Spacing: 20px mobile gutters, compact actions, floating navigation, separated list cards. Home, catalog, brief, purchases, wallet and profile checked at mobile. Landing and Home checked at desktop. No horizontal overflow in measured views.
- Colours: existing lemon and deep-green palette retained. Main CTA contrast fixed. State chips preserve readable foregrounds.
- Assets: existing product icons retained under repository policy. No copied reference logos, photos, financial imagery or device chrome. This is an intentional product adaptation.
- Copy: existing claims, legal disclosure, custody disclosure and testnet labels retained. No invented subscription or payment feature.

## Validation and limits
- Typecheck, lint and production build pass. 72 tests pass with --testTimeout=60000. Initial run had one 30-second database integration timeout; isolated rerun and full rerun passed. No backend code changed.
- No payment was submitted for visual QA. Live pending settlement was not induced. Shared styling covers the existing states.
- P3 follow-up: desktop Home could use a denser multi-column dashboard in a separate design iteration. The supplied Home reference is mobile only.
