# SPEC: Grant, the uncovered frame

GOAL: A judge or editor understands that Grant shows what a music license covers
before money moves, refuses when it cannot cover the brief, and returns a real testnet
settlement, license and public proof.

OUTPUT: HyperFrames, 1920x1080, 30fps, H.264 MP4, about 122 seconds.

TIME: 122s = 3660 frames. No beat grid. Nine scenes.
0-11 hook, 11-24 reveal, 24-39 brief and shortlist, 39-55 strip, 55-70 refusal,
70-88 settlement and proof, 88-103 agent verification, 103-113 stack, 113-122 close.

LOOK:
Ground `#F4F6F0` canvas for product beats, `#0D3B22` deep green for the hook and close.
Ink `#0F1A12`, secondary `#4A544C`, tertiary `#8A938B`.
Accent lemon `#C9F24C` as a fill only, never as text. One lemon fill per scene at most.
Product state colours: success `#17A34A`, warning `#C98A00`, danger `#D1453B`.
Display: Inter 700, hero lines 118-156px, tracking -0.045em, line-height 0.95.
Body: Inter 400/600, 32-44px. Micro labels: Inter 700, 18px, tracking 0.14em, uppercase.
Mono: Geist Mono 400/700, 20-30px, only for addresses, hashes, license IDs and terminal.
Cards: white `#FFFFFF`, radius 28px, 1px `#E3E7DC`, shadow `0 24px 70px rgba(15,26,18,.14)`.
Deep green panels: flat fill with one 6% radial light from upper left. No other gradients.
No glass, no glow, no particles, no grain, no vignette.

OBJECTS:
- The real Quiet Cut review sheet and its six-segment strip.
- The real brief, shortlist, catalogue, refusal, license and proof captures in
  `assets/screens/`.
- The real Stellar Expert transaction card, cropped to the summary.
- A terminal card with the real seller 402 response and the real `demo:agent` output.
- The Grant wordmark, built from Inter text and a lemon period.

MOTION:
Arrivals: `expo.out`, 0.5-0.8s, no bounce. Exits: `power3.in`, 0.22-0.32s.
Camera moves: `power2.inOut`, 0.45-0.7s. Staggers: 0.06-0.1s.
One hero move per shot. Titles land and stay dead still. No breathing, floating or
creeping scale on landed text.
Transitions: object becomes the world (the strip segment grows into the review),
zoom through the CTA, colour flood from cream to deep green, hard cuts inside scenes.
No crossfade between worlds.

SHOTS:
1. 0-11 Hook. Deep green. Real strip fades up at 0.6s. Four cream lines land:
   "Royalty free." 0.8s, "Ninety days." 2.8s, "Paid ads?" 4.8s,
   "Somebody gets caught." 6.8s. The excluded Repost and Future segments get amber
   top rules at 8.2s. Caption pill changes twice.
2. 11-24 Reveal. Cream. Quiet Cut review card rises to 1160x725 on the right.
   "Grant." and the tagline land on the left. Three facts stagger. At 21s the card
   pushes 1.06 and the left text exits.
3. 24-39 Brief and shortlist. Cream. Brief card (1500x820) rises at 0.4s. At 6s the
   Find tracks CTA fills lemon, zoom through it, cut to the shortlist card. At 12s
   the card settles and the first Review button pulses once (scale 1 to 1.04 to 1).
4. 39-55 Strip. Cream. A 1600x190 strip at y=560. Six top rules draw left to right,
   labels land. At 5s the covered fills and excluded dashes resolve. At 8s the six
   dimension labels land under the strip. At 12s the legend lands. At 14s the strip
   pushes to 1.08 and the Repost segment grows past the frame.
5. 55-70 Refusal. Cream. Real Studio Pulse refusal card (1400x875) rises at 0.4s.
   At 4s a deep green pill "Refused before signing" lands over the card. At 7s the
   three facts land beside the card: no signature, no reservation, no receipt.
   At 12s the card pushes 1.05 and the danger chip fills.
6. 70-88 Settlement. Cream to deep green at the end. Large "1.00 USDC" at left,
   mono line "buyer to seller · stellar:testnet". Real Stellar Expert summary card
   rises right at 2s. Real license card rises left at 6s. Real proof page card rises
   right lower at 10s. TESTNET chip lands at 14s. Caption holds 3s.
7. 88-103 Agent verification. Cream. Two dark terminal cards. Left types the seller
   curl and shows 402 plus the terms extension. Right shows the three PASS blocks
   and SUMMARY 3/3 PASS. At 12s "Don't take our word for it." lands above both.
8. 103-113 Stack. Cream. Header "Built on Stellar, end to end." Seven rows reveal
   with hairlines: App, Data, Auth, Wallets, Payments, Files, Tests.
9. 113-122 Close. Deep green. A real 900x100 strip lands at 0.5s. "Grant." at 168px
   with a lemon period at 1.2s. Tagline at 3.2s. URL in a lemon pill at 4.6s.
   "Stellar testnet · no real money" at 6s. Hold 2.5s.

BANNED:
- Black void, neon, glow, particles, purple gradients, glass cards.
- Three cards in a row, feature-list montages, a docked corner logo.
- Every element fading and sliding up, titles that drift after landing.
- Any mainnet or "real money" claim. Testnet must be visible in the payment beat.
- Invented UI, invented numbers, invented receipts.

QA:
- 0:03, 0:09 hook lines legible and not clipped.
- 0:16 review card fully visible, strip labels readable at 1920.
- 0:30 brief fields and CTA legible.
- 0:45 all six strip labels readable and aligned.
- 1:00 refusal facts legible; no signature language visible.
- 1:20 1.00 USDC, tx hash, license ID and TESTNET chip readable.
- 1:35 terminal PASS lines legible; no cut-off rows.
- 1:50 stack rows readable.
- 2:00 wordmark, tagline and URL readable; audio faded.
