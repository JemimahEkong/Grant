# Grant demo shot list

There are two cuts. The 2:02 launch film lives in `video/grant-demo` and is built from
real production captures, with no voiceover. The live screen-recording shot list below is
for the raw 2:45 demo. Use one or the other, not both, in the submission.

Target length: 2:45. Hard stop: 3:00. Testnet only. No real funds, no mainnet, no claim of music ownership or legal clearance.

## Before recording

1. Run `npm run demo:reset` in a terminal that is not on camera. It prints a fresh email, password, wallet address, balance, project ID, and faucet transaction. Do not film that output.
2. Sign in at `https://grant-roan.vercel.app/signin` with the printed account.
3. Confirm Home shows 2.00 testnet USDC, a 5.00 USDC budget, and 0 of 2 purchases used.
4. Have one 20-second video file ready. Keep its name off screen.
5. Open the terminal at the repo root and leave `https://grant-seller.vercel.app/api/health` open in a background tab.
6. Open one private window for the proof beat. Leave it signed out.
7. Rehearse `npm run demo:agent` once. The paid brief is then already bought. The on-camera run uses `--force` and shows the already-bought guard, not a second payment.
8. Do not show `.env.local`, any wallet secret, the demo password, the seller database URL, or the seller's download secret.

## 0:00 Terminal: 402, terms, refusal, unchanged balances

Screen: repo root terminal.

Commands:

```bash
curl -sS -D - https://grant-seller.vercel.app/api/offers/morning-edit/license | head -40
npm run agent:buy -- --brief scripts/agent/briefs/paid-ads-refusal.json --budget 20000000 --max-price 10000000 --sellers https://grant-seller.vercel.app
```

Show the 402 body with `extensions["io.grant.terms"]`, then the refusal line with `PAID_ADS_NOT_OFFERED`. Point at the buyer and seller balances in the refusal run.

Say: "The agent asks the external seller for a license. The seller answers 402 and puts its full terms in the challenge. The agent reads those terms, sees the brief asks for paid ads, and refuses before it signs anything. The balances do not move."

## 0:30 The app: brief with a video, duration detected

Screen: `https://grant-roan.vercel.app/app/new`

Action: Choose a client and a 20-second video. Let the duration chip fill from the file. Do not upload. Point at the detected duration.

Say: "I start with my own cut. Grant reads only the duration, width, and height in the browser. The footage never leaves this laptop."

## 0:50 Shortlist with reasons

Screen: `https://grant-roan.vercel.app/app/shortlist`

Action: Submit the brief. Read the top two cards and their reasons. Point at the coverage and clip-length reasons.

Say: "Every card gives one reason from the data: what it covers, how long it runs, and what it costs against the budget."

## 1:10 Preview over the buyer's own footage

Screen: `https://grant-roan.vercel.app/app/catalog` or the shortlist.

Action: Play the 40-second excerpt on the chosen track. Show the buyer's video previewing muted over the audio. Pause both.

Say: "This is the licensed 40-second excerpt, not the full file. I can hear it over my own cut before I buy."

## 1:30 Review, strip, exclusions, approve

Screen: The purchase review for the chosen track.

Action: Show the clearance strip, the platforms, the term, the territory, the paid-ad line, and the exclusions. Scroll to Approve.

Say: "These are the exact terms. The strip says what is cleared. The exclusions say what is not. I approve these exact terms, not a summary."

## 2:00 Settlement, license, PDF, audio

Screen: `https://grant-roan.vercel.app/app/purchase/<purchaseId>`

Action: Land on the settled state. Show the license number, the transaction hash, the PDF row, and the audio row. Open the PDF once.

Say: "The payment settled on Stellar testnet. The license, the PDF, and the audio are tied to this purchase. The wallet balance and the project budget both moved."

## 2:30 Proof link opened signed out

Screen: The public proof URL in the private window.

Action: Open the proof while signed out. Show the public license summary, the credit line, and the absence of the client name and audio.

Say: "This is the public proof. It shows the license and the credit. It does not show my client, my email, the object key, or the audio."

## 2:45 Agent run against the external seller, paid, license returned

Screen: The same repo root terminal.

Command:

```bash
npm run demo:agent -- --force
```

Action: Let all three blocks print. Point at the `ALREADY_BOUGHT` paid block, the license id, both balances, the settlement hash, and `SUMMARY 3/3 PASS`.

Say: "This is the agent economy. The same brief was paid once in rehearsal. The guard returns the recorded license, the settlement hash, and no second payment. The agent still refuses the two briefs that do not fit."

End on the `3/3 PASS` line. Do not add a new claim after it.

## Do not put on camera

- The demo reset password and any terminal output that contains it.
- `.env.local`, wallet secrets, the seller database URL, the download secret, or the buyer secret.
- The seller's database or Vercel environment screens.
- Unrelated projects, other users, or the settled evidence from earlier runs.
- Any suggestion that testnet USDC has value, that this is mainnet, that the seller owns the music, or that the license is legal clearance.
- The failed first rehearsal. It is not part of the script.
