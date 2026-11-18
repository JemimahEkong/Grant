# Grant

Grant is a music-licensing checkout for freelance video editors. A client brief becomes a set of matching license terms, a human approval, a real Stellar testnet payment from the editor's own wallet, a receipt and license, private PDF and MP3 downloads, and a public proof link the client can check without an account.

- Live app: [https://grant-roan.vercel.app](https://grant-roan.vercel.app)
- Public repo: [https://github.com/JemimahEkong/Grant](https://github.com/JemimahEkong/Grant)
- Recording script: [DEMO.md](DEMO.md)
- Submission checklist: [SUBMISSION.md](SUBMISSION.md)
- Design system: [DESIGN.md](DESIGN.md)

## Five-minute judge path

The critical path fits in five minutes. The add-on is optional and uses the second testnet USDC from the faucet.

### 1. Landing, 30 seconds

Open [https://grant-roan.vercel.app](https://grant-roan.vercel.app).

Look for the clearance strip. Each segment is a term from the license. Covered terms are green. Missing terms are amber or red. The page shows a settled sample license, a proof link, and the testnet badge.

### 2. Sign up and fund, about 90 seconds

Open [https://grant-roan.vercel.app/signin](https://grant-roan.vercel.app/signin) and choose Create one. Email and password only.

Complete the four onboarding steps:

1. Generate the user's Stellar testnet wallet.
2. Activate the account with the minimum XLM reserve.
3. Add the USDC trustline.
4. Claim the faucet grant.

The faucet sends 2.00 testnet USDC once per wallet. The daily treasury cap is 40.00 testnet USDC.

### 3. Create a project, about 30 seconds

Open [https://grant-roan.vercel.app/app/new](https://grant-roan.vercel.app/app/new).

Use the default brief or edit the chips. The chips are the authority. There is no LLM parsing of free text. The default brief asks for organic use on Instagram and TikTok, worldwide, for 90 days, with a 30-second clip and client delivery.

### 4. Buy one license, about 90 seconds

Open [https://grant-roan.vercel.app/app/catalog](https://grant-roan.vercel.app/app/catalog).

Choose Morning Edit. Review the quote. The page shows the exact coverage and the exclusions. Approve and pay 1.00 testnet USDC.

The payment is signed by the editor's own wallet. The seller is a separate account. The app verifies the settlement on Horizon, writes a receipt, and issues a license.

The account has 1.00 testnet USDC left after the base purchase.

### 5. Files and proof, about 60 seconds

On the settled purchase page:

1. Download the license PDF.
2. Download the audio MP3.
3. Create a proof link.
4. Open the proof link in a private window.

The PDF and MP3 come from a private R2 bucket through short-lived presigned URLs. The proof page is public and revocable. It shows the license terms, seller, and transaction. It does not show the client's private name, the object key, the raw token, or the audio.

### 6. Optional add-on, about 45 seconds

Return to the base purchase. The Add paid ads panel offers a second purchase for 1.00 testnet USDC.

The add-on keeps the original term, territory, clip length, and client terms. It adds paid-ad use on the same platforms. It gets its own receipt and license. The purchase page shows the combined coverage from both licenses.

## What this is not

- Testnet only. There is no mainnet support and no real money.
- Testnet USDC is priced by a stale oracle and is worth nothing. The 1.00 and 2.00 amounts are test units, not money.
- The catalog audio is CC0 demo material. It is not a commercial catalog, a rights-cleared library, or a legal clearance service.
- The seller names and offer terms are fixtures. The credited CC0 creators are not the sellers and did not endorse Grant. There is no multi-tenant seller onboarding or authority verification.
- There are no refunds or disputes. A settled testnet purchase is final in this demo.
- Grant holds each demo wallet's testnet secret in encrypted form so the demo can sign for the editor. This is demo custody, not a production custodian. It is not insured.
- `npm audit` reports dev-tool vulnerabilities in drizzle-kit/esbuild and vitest/picomatch. Fixing them requires breaking major-version updates. They are development tools, not the production runtime.
- A testnet settlement proves the payment protocol only. It does not prove copyright ownership, legal clearance, or a commercial music license.
- There is no mainnet, no commercial music catalog, no refund path, and no multi-tenant seller onboarding.

## Live testnet facts

| Item | Value |
| --- | --- |
| Network | Stellar testnet |
| USDC asset | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| Faucet treasury, funder only | [GBWSBWJGGL7EVHZPHQLOZTLOEDWZ2SQ4WCGX6YW5T4BXFQN74VMHLUMB](https://stellar.expert/explorer/testnet/account/GBWSBWJGGL7EVHZPHQLOZTLOEDWZ2SQ4WCGX6YW5T4BXFQN74VMHLUMB) |
| Seller payee | [GB53WOPIUPZTTTGPNDACTMZ3DJZ62HNRJP53ARI6EVSSBEWMLMF5SKBD](https://stellar.expert/explorer/testnet/account/GB53WOPIUPZTTTGPNDACTMZ3DJZ62HNRJP53ARI6EVSSBEWMLMF5SKBD) |
| Faucet grant | 2.00 testnet USDC per wallet |
| Faucet daily cap | 40.00 testnet USDC |
| Seller activation, 3 XLM from treasury | [4b12e00886204f7a33676c1def7b5666f1adf25d6e3da2586c22e7c51d43f0c0](https://stellar.expert/explorer/testnet/tx/4b12e00886204f7a33676c1def7b5666f1adf25d6e3da2586c22e7c51d43f0c0) |
| Seller USDC trustline | [79af83dec9c93b5e056431d62180be1846e4b1851905ab290ed52caaa125d147](https://stellar.expert/explorer/testnet/tx/79af83dec9c93b5e056431d62180be1846e4b1851905ab290ed52caaa125d147) |

The treasury funds faucet grants and XLM activation only. It never receives purchase USDC. The seller is a dedicated account. Approval and the seller route fail closed if any active offer pays the treasury.

Latest seller-separated proof:

- Treasury to buyer, 2.00 USDC: [d25abb7d7b3940c891cab201854856a67006233465be978598bb4ece3fb0eb80](https://stellar.expert/explorer/testnet/tx/d25abb7d7b3940c891cab201854856a67006233465be978598bb4ece3fb0eb80)
- Buyer to seller, base, 1.00 USDC: [5faefa5615dfb6305c7513780bf8fff48ac1d391ea9187d92c58a3bf83149a25](https://stellar.expert/explorer/testnet/tx/5faefa5615dfb6305c7513780bf8fff48ac1d391ea9187d92c58a3bf83149a25)
- Buyer to seller, add-on, 1.00 USDC: [550d615b40c94670a9f835fa4e94dd77d12add896581c86e4eac76b570197c38](https://stellar.expert/explorer/testnet/tx/550d615b40c94670a9f835fa4e94dd77d12add896581c86e4eac76b570197c38)

The full three-address record is in [agent-state/seller-separation-evidence.md](agent-state/seller-separation-evidence.md).

Testnet USDC has no monetary value. Any USD conversion or oracle quote is stale and irrelevant. The demo prices are fixed test units.

## CC0 demo audio

The three catalog tracks are real CC0 recordings. The full source list, hashes, and retrieval date are in [demo/audio/PROVENANCE.md](demo/audio/PROVENANCE.md).

| Track | Source | Creator | License | Duration | BPM |
| --- | --- | --- | --- | --- | --- |
| Morning Edit | [Freesound 449812](https://freesound.org/people/tyballer92/sounds/449812) | tyballer92 | CC0 1.0 | 60.25 s | 129 estimate |
| Quiet Cut | [Freesound 254856](https://freesound.org/people/indigo.cloud/sounds/254856) | indigo.cloud | CC0 1.0 | 48.02 s | beatless |
| Studio Pulse | [Freesound 687006](https://freesound.org/people/Seth_Makes_Sounds/sounds/687006) | Seth_Makes_Sounds | CC0 1.0 | 173.00 s | 117 estimate |

The seller names and offer terms are fixtures. The creators above are not Grant sellers and did not endorse Grant. The CC0 files are used as demo catalog audio only. They are delivered as private MP3 artifacts and are not evidence of a commercial music license.

## Architecture

```text
Browser
  Next.js App Router
    Better Auth + Neon Postgres
      users, sessions, projects, quotes, approvals
      reservations, receipts, licenses, share links
    Per-user Stellar testnet wallet
      AES-256-GCM encrypted secret, per-row IV
    Quote -> approval -> budget reservation -> payment attempt
    x402 seller route -> Stellar testnet USDC
      Treasury: faucet grants and XLM activation only
      Seller: dedicated payee, receives purchase USDC
    Horizon verification -> receipt + license
      reconciliation never signs again
    Cloudflare R2 private bucket
      short-lived presigned PDF and MP3 downloads
    Public proof link
      hashed token, revocable, no audio, no client name
```

Key boundaries:

- The owner ID comes from the verified session. The client never supplies the owner, price, parent purchase, or delta.
- The project budget is a spending cap. The wallet balance is read from chain.
- The purchase-count cap defaults to 2 per project and is enforced in the same transaction as the budget reservation.
- The add-on parent must be an owned, settled base purchase. The server derives the paid-ad delta.
- The seller payee must never equal the faucet treasury.

## Setup

Use Node.js 24 and npm.

```sh
git clone https://github.com/JemimahEkong/Grant.git
cd Grant
npm ci
cp .env.example .env.local
```

Fill in `.env.local`. The main groups are:

```text
DATABASE_URL, DATABASE_URL_TEST
BETTER_AUTH_SECRET, BETTER_AUTH_URL, APP_ORIGIN
WALLET_ENCRYPTION_KEY, FAUCET_TREASURY_SECRET
FAUCET_GRANT_BASE_UNITS=20000000
FAUCET_DAILY_CAP_BASE_UNITS=400000000
WALLET_MIN_XLM=3
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
X402_SELLER_PUBLIC, X402_ATTEMPT_SECRET, X402_SELLER_BASE_URL
X402_SELLER_SECRET   (local operator only, never deploy)
PAYMENTS_ENABLED=true
DEMO_PROOF_PATH
```

`WALLET_ENCRYPTION_KEY` is a 32-byte base64 key. `FAUCET_TREASURY_SECRET` is the faucet funder. `X402_SELLER_SECRET` is the seller keypair secret and stays local. The app never reads it. Never commit `.env.local` or any wallet secret.

Database and offers:

```sh
npm run db:migrate
npm run db:migrate:test
npm run db:seed
npm run db:seed:testnet
```

Never run `drizzle push`.

Seller setup:

```sh
npm run seller:create
npm run db:seed:testnet
```

`seller:create` creates or reuses the dedicated seller keypair, funds 3 XLM from the treasury, and adds the USDC trustline. `db:seed:testnet` repoints every active offer at the seller and fails if any active offer still pays the treasury.

Run locally:

```sh
npm run dev
```

Repeatable demo account:

```sh
npm run demo:reset
```

The reset targets `https://grant-roan.vercel.app` by default. Set `DEMO_RESET_BASE_URL` to use another origin. It creates a new account, a funded wallet, and one clean project. It prints the email, wallet address, balance, project ID, and faucet transaction. It does not delete evidence.

## Test commands

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run db:check
npm run db:check:test
npm run r2:check
```

`npm test` runs 72 tests in 12 files. The suite covers auth, budget arithmetic, the purchase-count cap, concurrent reservations, paid-ad add-ons, the seller payee guard, storage, and wallet behavior.

The Neon integration suite runs when `DATABASE_URL_TEST` is present. It must use the separate Neon test branch. Never point integration tests at the main branch.

The Vitest config emits a known CommonJS/ESM native-loader warning. It does not fail the suite.

## Evidence and product documents

- [Repeatable demo reset](agent-state/demo-reset-evidence.md)
- [Seller separation and three addresses](agent-state/seller-separation-evidence.md)
- [CC0 audio provenance](agent-state/cc0-audio-evidence.md)
- [Faucet capacity proof](agent-state/faucet-capacity-evidence.md)
- [Paid-ad add-on evidence, historical](agent-state/addon-evidence.md)
- [Delivery evidence](agent-state/delivery-evidence.md)
- [Recording shot list](DEMO.md)
- [Submission checklist](SUBMISSION.md)
- [Design system](DESIGN.md)

The earlier add-on evidence used the treasury as the payee. It is historical. The current seller-separated proof uses the dedicated seller account.

Objects are private and served only through short-lived signed URLs. The database stores only share token hashes. Wallet secrets are encrypted at rest and are never returned or logged. Proof views are noindex and no-store.
