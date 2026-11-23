# Review

## Output

- `renders/grant-demo_*.mp4`: 2:02, 1920x1080, 30fps, H.264, AAC.
- Source: `index.html` plus nine scenes in `compositions/`.
- Assets: production screenshots in `assets/screens/`, Inter and Geist Mono in
  `assets/fonts/`, the CC0 demo bed in `assets/audio/bed.mp3`.

## Checks

- `npx hyperframes check`: 0 errors, 9 warnings.
- Warnings are all `text_below_floor` on micro labels: strip labels, chapter labels,
  terminal rows, and the end-card strip. These are deliberately small and are not the
  reading text. No `dead_stretch`, `first_frame_empty`, contrast, overflow or runtime
  findings.
- Contrast: 23/23 text checks pass WCAG AA.
- Frames reviewed: 0, 3, 8, 14, 20, 28, 36, 45, 60, 75, 95, 118, 121.75.
- Audio: mean -26.7 dB, peak about -8 dB after the volume raise.

## Product truth

- Every product screen is a real capture from `https://grant-roan.vercel.app`, not a
  mockup.
- The settlement is a real Stellar testnet transaction:
  `f72272318c22d5b21642c20400ec27ab5bfd313898b05e352ac6dde3bc11bb5b`.
- The license is `GRANT-2026-CABBC9E9E7`, 1.00 testnet USDC, Morning Edit.
- The film says TESTNET in the payment beat and "No real money" in the closing. The hook
  does not claim mainnet.
- The refusal is a real quote against Studio Pulse, created through the production API.
- The terminal values are the real seller 402 terms and the real `demo:agent` PASS run.
- The proof screenshot has the share token redacted.

## What was borrowed from the reference

The beat order, the full-frame type cards, the bottom caption pill, the floating real UI
cards, the refusal beat, the proof cards, the terminal verification, the stack table and
the built end card.

## What was not borrowed

The black and hot pink identity, the Rigbill copy, the NEAR claims, the logo and the
narration. Grant uses its own canvas, deep green, lemon fill, Inter and Geist Mono.

## Known limits

- No voiceover in this cut. `SCRIPT.md` has a 2:02 read.
- The music bed is the CC0 demo track Studio Pulse, used at low volume.
- The film is a testnet demo. It does not prove music ownership or legal clearance.
