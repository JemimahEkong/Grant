<div align="center">

# Grant

**Know what a music license covers before you export.**

Describe the video you're making. Grant shows you what each track's license actually
allows, what it doesn't, and the price. You approve once. Then you get the audio, a
license PDF, and a link your client can open.

![live](https://img.shields.io/badge/live-grant--roan.vercel.app-0D3B22?style=flat-square)
![network](https://img.shields.io/badge/network-Stellar%20testnet-6FCF97?style=flat-square)
![tests](https://img.shields.io/badge/tests-126%20passing-0D3B22?style=flat-square)
![language](https://img.shields.io/badge/TypeScript-strict-C9F24C?style=flat-square)

[Open the live app](https://grant-roan.vercel.app) · [Try it in 5 minutes](#try-grant) · [See a real payment](#a-real-payment-you-can-check) · [How it is built](#how-it-is-built)

<img src="docs/hero.png" alt="Grant landing page" width="100%" />

</div>

---

## What is Grant?

Grant is a music licensing app for freelance video editors.

You tell it what you're making. "A 30-second reel, Instagram and TikTok, three months,
for my client Harbor Athletics." Grant turns that into a list of terms, then shows you
which tracks cover those terms and which don't, with the price next to each one.

You pick a track, read what the license does and does not allow, and approve. The app
pays the seller from your own test wallet. You get the audio file, a PDF of the license,
and a link your client can open without an account.

If a track can't cover what you need, Grant refuses. It tells you which part is missing
and charges nothing.

## The problem: "royalty free" doesn't tell you anything

Imagine you're editing a 30-second reel for a client. You find a track you like for one
dollar. The listing says royalty free. You use it.

Three weeks later the client asks for a paid ad. Or the campaign runs past 90 days. Or
they want it in Nigeria. Any of those can fall outside what you bought, and nobody told
you where the line was.

The same gap shows up four times:

1. **You can't see what you're buying.** A price is not a license. Platform, length of
   use, country, and client delivery all change what is allowed.
2. **Your budget lives in a spreadsheet.** A project has a limit. Nothing stops the app
   from spending past it.
3. **A receipt is not a license.** Your bank statement proves money moved. It doesn't
   prove what you were allowed to do.
4. **Retrying a failed payment can charge you twice.** Refresh the page at the wrong
   moment and you sign again, with no way to tell if the first one already went through.

## What Grant does about it

**It shows the edges.** Every license is drawn as one strip, one segment per term.
Filled means covered. Hollow means not covered. You see both before you pay.

**It checks before it spends.** Grant matches your brief against the license first. If
the license can't cover it, you get a refusal with the reason, not a charge.

**You approve the exact terms.** The approval is tied to that one quote. It cannot be
reused for a different purchase or a different price.

**Money is reserved before anything is signed.** The budget is held aside in the database
first. If anything fails, it is released.

**The payment is checked, not assumed.** Grant asks Stellar whether the money actually
arrived, to the right seller, for the right amount, before it hands over anything.

**You can't pay twice.** A second click returns the first result. If the app genuinely
doesn't know what happened, the purchase stays pending and asks you to check again
instead of signing again.

## Who it is for

- **Freelance video editors** who buy music for client work and can't afford to guess.
- **Small studios** that want one cap and one receipt per project.
- **Rights holders** who would rather say no than find out later.

## How a purchase works

1. **Write the brief.** One sentence, then four groups of chips: platforms, how long,
   where, and who it's for. The chips are the real input. There is no AI guessing what
   you meant.
2. **Get a shortlist.** Grant ranks eight tracks against the brief and gives each one a true reason. Open the full catalogue for more. Play a 40-second excerpt. If you picked footage on the brief, the player shows it muted under the music.
3. **Read the review screen.** What's covered, what isn't, what the price leaves in your
   budget, and one Approve button.
4. **Approve.** The app reserves the amount and signs one payment from your wallet.
5. **Wait a moment.** The screen says submitted, not confirmed, until the payment is
   actually verified on Stellar.
6. **Get your files.** The license PDF, the audio download, and a public link you can
   send to the client.

If you need longer use, wider platforms, or paid ads, the add-on screen quotes the
difference. The original license stays as it was.

## A real payment you can check

Everything below happened on Stellar's test network, where money is not real.

| What | Where |
| --- | --- |
| Faucet sent 2.00 USDC to the buyer | [`d25abb7d…`](https://stellar.expert/explorer/testnet/tx/d25abb7d7b3940c891cab201854856a67006233465be978598bb4ece3fb0eb80) |
| Buyer paid the seller for a license | [`5faefa56…`](https://stellar.expert/explorer/testnet/tx/5faefa5615dfb6305c7513780bf8fff48ac1d391ea9187d92c58a3bf83149a25) |
| Buyer paid again for the paid-ads add-on | [`550d615b…`](https://stellar.expert/explorer/testnet/tx/550d615b40c94670a9f835fa4e94dd77d12add896581c86e4eac76b570197c38) |

Buyer, seller, and the faucet are three different accounts on purpose. A demo where the
buyer pays the account that funded them would prove nothing, so the app refuses to run
if a seller address ever matches the faucet.

You can also open a finished license and see it as a client would:
[grant-roan.vercel.app/proof/…](https://grant-roan.vercel.app)

## Agent economy

Grant can also buy from an external seller that runs as its own service. The seller has its own package, Vercel project, Stellar payee, license table, download secret, and terms. It shares no runtime with the Grant app. The deployed demo is https://grant-seller.vercel.app with payee `GAONRKB5QBYD32SYJAG2EFFMFBNZOY73BHTNXLB2NVCXJALCTJTAXIFD`, separate from both the first-party seller and the faucet treasury.

The seller publishes machine-readable offers at `/api/offers`. An unpaid license request returns `402` with the normal x402 Stellar testnet requirements plus `extensions["io.grant.terms"]`. The buyer agent reads those terms from the challenge, checks them against the listing and the brief, and signs only after both pass. Every decision is written as one JSON line.

Deploy it from `seller/` with its own Vercel project and the five environment variables in `seller/README.md`. Set `SELLER_PUBLIC_URL` to the project origin and redeploy once so download and proof URLs use that origin.

Repeat the refusal:

```bash
npm run agent:buy -- --brief scripts/agent/briefs/paid-ads-refusal.json --budget 20000000 --max-price 10000000 --sellers https://grant-seller.vercel.app
```

That exits `1` with `PAID_ADS_NOT_OFFERED` before any signing and leaves both balances unchanged.

Repeat the paid run:

```bash
npm run agent:buy -- --brief scripts/agent/briefs/fit.json --budget 20000000 --max-price 10000000 --sellers https://grant-seller.vercel.app
```

The first paid run buys once and saves the license, receipt, challenge, and audio under `agent-runs/`. Repeating the same command returns `ALREADY_BOUGHT` and does not pay again. The buyer wallet needs testnet USDC and `AGENT_BUYER_SECRET` in `.env.local`.

## Why Stellar

A music license costs about a dollar. Moving a dollar has to be instant and nearly free,
or the fee eats the sale.

Stellar settles in seconds and costs a fraction of a cent. The app pays with USDC, which
keeps the price steady. The payment request travels over the same HTTP call that asks for
the file, so there is no checkout page and no card form.

None of this is visible to the editor. That is the point.

## Screens

| Screen | What you see |
| --- | --- |
| Landing | The pitch, a finished license, and an example refusal |
| Sign in | Email and password. No wallet app to install |
| Setup | Four steps: create your test wallet, switch it on, add USDC, get free test money |
| Home | Your balance, what's left in the budget, and what you bought |
| Brief | One sentence and the chip groups |
| Catalog | The catalog, with coverage and price |
| Review | The strip, the exclusions, the price, and Approve |
| Pending | Submitted, not confirmed. One button: check again |
| License | PDF, audio, payment details, and a share link |
| Purchases | Everything you bought, refused, or left unfinished |
| Wallet | Your address, QR code, balance, and history |
| Proof | The page your client opens. No account needed |

## Try Grant

Five minutes. No wallet extension. No real money.

1. Open [grant-roan.vercel.app](https://grant-roan.vercel.app) and press **Start a demo project**.
2. Make an account with any email and password.
3. Finish the four setup steps. The faucet gives you 2.00 test USDC.
4. Create a project and keep the default brief.
5. Open **Quiet Cut**, read the strip, and approve.
6. Download the PDF and the audio, then open the proof link in a private window.

To see a refusal instead, ask for paid ads on **Studio Pulse**. Grant says no, explains
which term is missing, and charges nothing.

## How it is built

| Part | What we used |
| --- | --- |
| App | Next.js 16, React 19, TypeScript |
| Database | Neon Postgres with Drizzle |
| Sign in | Better Auth, email and password |
| Payments | Stellar testnet with x402 (`@x402/*` 2.30.0) |
| Files | Cloudflare R2, private bucket, short-lived download links |
| PDF | pdf-lib |
| Tests | Vitest, 126 tests |

The browser never holds a signing key. Each person gets their own Stellar account, and
the secret is encrypted before it is stored. Downloads are only issued after the app
checks who is asking, whether they own the purchase, and whether it was paid.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run db:migrate
npm run db:seed
npm run previews:prepare
npm run dev
```

```bash
npm test            # 126 tests
npm run typecheck
npm run lint
npm run build
npm run demo:reset  # fresh account and project for a new recording
# Seller applications live at /app/sellers/apply and stay in submitted status.
npm run catalog:ingest # Freesound ingest; requires FREESOUND_API_KEY
npm run previews:prepare # 40-second previews for tracks that lack one
```

## What it doesn't do yet

- **Test money only.** The payment flow is real, the network is not.
- **Demo music.** 150 CC0 and Freesound demo tracks with fixture sellers. No real deals yet.
- **No refunds.** Once a license settles there is no way back.
- **The app holds your key.** That is fine for a test build, not for real money.
- **Test USDC looks like it's worth a dollar.** It isn't. Explorers use a stale price.

## About this build

Made by the Grant team for the EmpowerHer hackathon. [SUBMISSION.md](SUBMISSION.md) has the checklist,
[DEMO.md](DEMO.md) has the recording script, and [DESIGN.md](DESIGN.md) has the design
system.

Free demo audio. Test USDC only. Grant shows license terms. It is not legal advice.
