# Grant demo shot list

Target length: 2:45. Hard stop: 3:00.

This is a shot list for a 2 to 3 minute recording. Each beat has the exact screen, the exact action, and the exact words. Read the words naturally. Do not add claims about real money, mainnet, commercial rights, or legal clearance.

## Before recording

1. Run `npm run demo:reset` in a terminal that is not on camera. It prints a fresh email, password, wallet address, balance, project ID, and faucet transaction.
2. Sign in at `https://grant-roan.vercel.app/signin` with the printed account.
3. Confirm Home shows 2.00 testnet USDC, a 5.00 USDC budget, and 0 of 2 purchases used.
4. Clear downloads and close unrelated tabs. Use a 1280 by 800 window or larger. Keep the desktop left rail visible.
5. Open the seller account in a background tab: `https://stellar.expert/explorer/testnet/account/GB53WOPIUPZTTTGPNDACTMZ3DJZ62HNRJP53ARI6EVSSBEWMLMF5SKBD`.
6. Open one private window for the proof beat. Leave it signed out.
7. Do not film the terminal output. It contains the demo password. Do not film `.env.local` or any wallet secret.
8. Use no background music, or use only owned or CC0 music. The app's demo audio is CC0.

A clean reset account may already be available. If it is still unused, sign in with it and skip the reset command. If it has purchases, run `npm run demo:reset` for a fresh one.

## Beat 1, 0:00 to 0:10, cold open

Screen: `https://grant-roan.vercel.app/`

Action: Hold on the landing hero and the clearance strip. Do not scroll yet.

Say: "Grant turns a client brief into a music license, a testnet payment, and a public proof."

## Beat 2, 0:10 to 0:25, the clean account

Screen: `https://grant-roan.vercel.app/app`

Action: Show the Home balance, the project budget, and the purchase counter. Point at the 2.00 USDC wallet balance and the 0 of 2 purchases label.

Say: "I'm signed in as the editor. The wallet has 2.00 testnet USDC. The project has a 5.00 budget and two purchase slots."

## Beat 3, 0:25 to 0:50, the refusal

Screen: `https://grant-roan.vercel.app/app/catalog`

Action: Open the catalog. Find Studio Pulse. Click Review. The purchase page opens in the refused state. Scroll just enough to show the refusal reasons.

Say: "This is the refusal state. The brief asks for Instagram and TikTok, worldwide, for 90 days. This offer is YouTube only, Nigeria only, 30 days. Grant refuses before any signature, reservation, or charge."

Action: Click Review another track to return to the catalog.

## Beat 4, 0:50 to 1:15, the approval

Screen: `https://grant-roan.vercel.app/app/catalog`

Action: Choose Morning Edit. Click Review. Show the quote, the clearance strip, and the exclusions. Scroll to the approval button.

Say: "Morning Edit covers the brief. The quote shows the exact terms and the exclusions. I approve these exact terms."

Action: Click Approve and pay 1.00. Keep the pointer away from the button after clicking.

## Beat 5, 1:15 to 1:30, the settlement

Screen: `https://grant-roan.vercel.app/app/purchase/<base purchase id>`

Action: Cut the network wait. Land on the settled page with the license ID and the transaction. Do not fake the state. Show the status chip and the license number.

Say: "The payment is confirmed on testnet. Grant wrote the receipt and issued the license."

## Beat 6, 1:30 to 1:45, explorer tab, buyer and seller are different

Screen: Seller account tab, then `https://grant-roan.vercel.app/app/wallet`, then the base transaction on Stellar Expert.

Action: [EXPLORER TAB] Switch to the seller account tab. Show the seller address. Then switch to the app wallet and show the buyer address. Then open the base transaction from the purchase page.

Say: "Here is the buyer wallet. Here is the seller account. They are different addresses. The treasury only funded the buyer. The purchase paid the seller."

Note: The seller account is the dedicated payee. The treasury is not the seller. If the seller balance is 1.00 after the base purchase, that is expected. The add-on will bring it to 2.00.

## Beat 7, 1:45 to 2:00, PDF and audio

Screen: `https://grant-roan.vercel.app/app/purchase/<base purchase id>`

Action: Scroll to the download list. If the files are still preparing, wait for the ready state. Click License PDF. Then click Audio MP3. If the browser shows a download shelf, let it appear briefly.

Say: "The PDF is the license. The MP3 is the CC0 demo track. Both are private objects behind short-lived signed links."

## Beat 8, 2:00 to 2:15, proof page opened signed out

Screen: `https://grant-roan.vercel.app/app/purchase/<base purchase id>`

Action: Scroll to Proof link. Click Create proof link. Copy the link. Switch to the private window. Paste the proof URL. Show the public proof page. Do not sign in.

Say: "The client opens this without an account. It shows the terms, the seller, and the transaction. It hides the client name and the audio."

Action: Point at the proof page URL and the license number. Leave the proof page visible for two seconds.

## Beat 9, 2:15 to 2:25, the add-on offer

Screen: `https://grant-roan.vercel.app/app/purchase/<base purchase id>`

Action: Return to the signed-in window. Scroll to Add paid ads. Show the explicit delta, the end date, the unchanged base terms, and the 1.00 price.

Say: "The base license leaves paid ads out. The add-on is an explicit second purchase."

Action: Click Review add-on. The new purchase page opens.

## Beat 10, 2:25 to 2:40, add-on settlement and combined coverage

Screen: `https://grant-roan.vercel.app/app/purchase/<add-on purchase id>`

Action: Approve and pay 1.00. Cut the wait. Land on the add-on page. Scroll to Combined coverage. Show the base license, the add-on license, each receipt, and the total 2.00 USDC.

Say: "The add-on keeps the original term. It adds paid ads on the same platforms. It has its own receipt and license. Combined coverage shows both."

Action: Point at the two license numbers and the two transaction lines. Do not open a second proof link.

## Beat 11, 2:40 to 2:50, close

Screen: The add-on Combined coverage panel, or the base proof page in the private window.

Action: Hold on the two license numbers and the testnet badge.

Say: "That is Grant. A brief, a human approval, a real testnet settlement, private files, and a public proof. Testnet only."

## Recording checklist

- The refusal is visible before the approval.
- The approval button is shown before it is clicked.
- The settlement state is real, even if the wait is cut.
- The explorer tab shows the seller account and the buyer wallet as different addresses.
- The PDF and MP3 download actions are visible.
- The proof page is opened signed out in a private window.
- The add-on is a second purchase, with its own receipt and license.
- The combined coverage is visible.
- The video is under 3:00.
- No secret, password, raw token, or `.env.local` is visible.
- No claim of real money, mainnet, commercial rights, or legal clearance.
