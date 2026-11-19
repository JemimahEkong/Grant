# Design QA: glass material refinement

## Evidence

- Landing source truth: `C:/Users/emman/.t3/userdata/attachments/c0a86b8f-e7cb-4216-959e-74a4f3218b20-90d51a86-fdfa-4471-854f-2a3bb780d89d.jpg`, 1080 x 1920 pixels.
- Home source truth: `C:/Users/emman/.t3/userdata/attachments/c0a86b8f-e7cb-4216-959e-74a4f3218b20-51cb9622-a519-4856-874f-82b978217c8d.jpg`, 1200 x 1800 pixels.
- Landing implementation mobile: `C:/Users/emman/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mwne6bcw-a00ebc9d.png`, 488 x 1055 pixels from a 390 x 844 CSS viewport.
- Home implementation mobile: `C:/Users/emman/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mwne6weo-0f344bdd.png`, 488 x 1055 pixels from a 390 x 844 CSS viewport.
- Landing implementation desktop: `C:/Users/emman/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mwne7o0z-a3361a06.png`, 1600 x 1000 pixels from a 1280 x 800 CSS viewport.
- Full-view comparisons: `design-qa-landing-comparison.png` and `design-qa-home-comparison.png`. Each pair was normalized to a common height before compositing.
- States: public landing with live settled sample, signed-in Home with a funded testnet wallet and selected demo project.
- Browser checks: landing CTAs and navigation were present, signed-in Home loaded live wallet, project, catalog and purchase APIs, mobile navigation remained fixed, and the console showed no runtime errors.

## Required fidelity surfaces

- Fonts and typography: local Inter matches the rounded neo-grotesk character of both references. Hero weight, large numeric balance, compact labels and tabular money preserve the reference hierarchy without copying its brand.
- Spacing and layout rhythm: landing uses the same two-column editorial hero, large quiet canvas and stacked product-card focal point as the source. Home uses a compact top rhythm, dominant balance surface, overlapping quick-action tray and floating tab bar.
- Colors and visual tokens: the source green/red finance treatments are translated to Grant lemon and deep green. Glass edges, blur, tonal gradients and highlights are limited to controls and product surfaces. Text contrast remains solid on all readable surfaces.
- Image quality and asset fidelity: no stock photography, reference logos, device chrome or borrowed financial content is used. The realistic hero is built from product UI with real Grant terms, clearance segments and testnet status.
- Copy and content: all existing Grant claims and disclosures remain unchanged. The added product-card labels describe true Grant behavior only.

## Comparison history

### Pass 1 findings

- [P1] Home actions were detached flat icons on a light canvas, while the source uses an overlapping translucent action tray inside the hero surface.
- [P1] The landing example was one flat license card, while the source hero depends on overlapping realistic cards, rings and floating information panels.
- [P2] Primary and secondary controls lacked the bright edge highlights, depth and translucency requested by the founder.
- [P2] Supporting landing cards were visually uniform white panels instead of the compact tonal card family shown in the reference.

### Fixes applied

- Moved Home quick actions into the balance card and gave them a shared dark glass tray, circular translucent controls and a lemon active action.
- Rebuilt the landing hero as a two-card scene with a budget card, clearance card, orbit treatment, clearance statistic, delivery chip and terms chip.
- Added shared glass tokens and material states to primary buttons, secondary buttons and the floating mobile tab bar.
- Added lime, green and deep-green tonal treatments to the three-step, coverage, delivery and close sections.

### Pass 2 evidence

- `design-qa-home-comparison.png` shows the same dominant balance-to-action-tray relationship and floating bottom navigation as the selected mobile source.
- `design-qa-landing-comparison.png` shows the same editorial hero balance, layered green product cards, orbit composition and floating data card as the selected landing source.
- Mobile landing measured 375 CSS pixels for both `clientWidth` and `scrollWidth`, so there is no horizontal overflow.
- Desktop landing measured 1265 CSS pixels for both `clientWidth` and `scrollWidth` at the 1280 viewport, so there is no horizontal overflow.
- Focused review of the hero card, quick-action tray, CTAs and tab bar found no remaining P0, P1 or P2 mismatch for the selected visual grammar.

## Follow-up polish

- [P3] Safari blur strength may vary slightly from Chromium. Solid fallback fills keep the same hierarchy and contrast.

final result: passed
