# Submission checklist

Use this list before pasting anything into the submission form. Open every public link in a private window while signed out.

## 1. URLs to paste

| Field | Value |
| --- | --- |
| Project name | Grant |
| One-line description | Music licensing checkout for freelance video editors, with per-user Stellar testnet wallets, human approval, verified settlement, private PDF and MP3 delivery, and a public proof link. |
| Live app | `https://grant-roan.vercel.app/` |
| Public repo | `https://github.com/JemimahEkong/Grant` |
| README | `https://github.com/JemimahEkong/Grant/blob/main/README.md` |
| Demo script | `https://github.com/JemimahEkong/Grant/blob/main/DEMO.md` |
| Design system | `https://github.com/JemimahEkong/Grant/blob/main/DESIGN.md` |
| Video | `[paste the unlisted YouTube, Loom, or Vimeo URL]` |
| Proof link | `[paste the active proof link created during the recording]` |
| Health | `https://grant-roan.vercel.app/api/health` |
| Seller account | `https://stellar.expert/explorer/testnet/account/GB53WOPIUPZTTTGPNDACTMZ3DJZ62HNRJP53ARI6EVSSBEWMLMF5SKBD` |
| Treasury account | `https://stellar.expert/explorer/testnet/account/GBWSBWJGGL7EVHZPHQLOZTLOEDWZ2SQ4WCGX6YW5T4BXFQN74VMHLUMB` |
| Base proof transaction | `https://stellar.expert/explorer/testnet/tx/5faefa5615dfb6305c7513780bf8fff48ac1d391ea9187d92c58a3bf83149a25` |
| Add-on proof transaction | `https://stellar.expert/explorer/testnet/tx/550d615b40c94670a9f835fa4e94dd77d12add896581c86e4eac76b570197c38` |
| Faucet proof transaction | `https://stellar.expert/explorer/testnet/tx/d25abb7d7b3940c891cab201854856a67006233465be978598bb4ece3fb0eb80` |

The proof link must be created during the recording or immediately before it. Do not paste a revoked link. The transaction links above are the seller-separated proof. They are valid testnet records and show the seller as distinct from the treasury.

## 2. Public visitor checks

Run these signed out, in a private window.

| Check | URL | Expected |
| --- | --- | --- |
| Landing | `https://grant-roan.vercel.app/` | 200, hero and clearance strip load |
| Sign in page | `https://grant-roan.vercel.app/signin` | 200, email and password form loads |
| App gate | `https://grant-roan.vercel.app/app` | Redirect to `/signin` or onboarding |
| Current user | `https://grant-roan.vercel.app/api/me` | 401 |
| Projects | `https://grant-roan.vercel.app/api/projects` | 401 |
| Purchase record | `https://grant-roan.vercel.app/api/purchases/<base purchase id>` | 401 |
| Audio download | `https://grant-roan.vercel.app/api/purchases/<base purchase id>/download?asset=audio` | 401 |
| Proof page | `https://grant-roan.vercel.app/proof/<token>` | 200, terms and transaction, no audio, no client name, no download |
| Health | `https://grant-roan.vercel.app/api/health` | 200, phase `testnet-product-demo` |
| Catalog API | `https://grant-roan.vercel.app/api/catalog` | 200, no payee secret or wallet secret |
| Repo | `https://github.com/JemimahEkong/Grant` | Public, no login required |
| README | `https://github.com/JemimahEkong/Grant/blob/main/README.md` | Renders |
| DEMO | `https://github.com/JemimahEkong/Grant/blob/main/DEMO.md` | Renders |
| DESIGN | `https://github.com/JemimahEkong/Grant/blob/main/DESIGN.md` | Renders |
| Video | Paste the video URL | Plays without login, duration 2:00 to 3:00, audio audible |

Also check the judge path once with a throwaway account:

- Create an account from `/signin`.
- Complete wallet, activation, trustline, and faucet. The grant is 2.00 testnet USDC.
- Create a project and buy Morning Edit for 1.00 testnet USDC.
- Download the PDF and MP3.
- Create a proof link and open it in a private window.
- Create a throwaway proof, revoke it, and confirm the revoked URL returns 404. Do not revoke the final submission proof.

## 3. Repo requirement

The repository is public and must stay public. The submission form should link to the root:

`https://github.com/JemimahEkong/Grant`

Before submitting:

- [ ] The `main` branch is pushed and current.
- [ ] `README.md`, `DEMO.md`, `DESIGN.md`, and `SUBMISSION.md` are present at the repo root.
- [ ] Source, migrations, and tests are included.
- [ ] No `.env.local`, `.env`, wallet secret, seller secret, session cookie, or raw share token is tracked.
- [ ] `.env.example` contains names only, with empty or safe values.
- [ ] No `.next`, `node_modules`, `tsconfig.tsbuildinfo`, or local logs are tracked.
- [ ] The repo opens in a private window without a login.

Useful checks:

```sh
git status --short
git ls-files | rg '(^|/)\.env|tsbuildinfo|\.next|node_modules|coverage'
git ls-files | rg 'DEMO\.md|SUBMISSION\.md|README\.md|DESIGN\.md'
```

`git ls-files` should show `.env.example` only from the env group. The other command should show the four docs.

## 4. Video requirement

- [ ] Duration is 2:00 to 3:00. The hard limit is 3:00. The shot list targets 2:45.
- [ ] The video is uploaded as unlisted or public. It is not private.
- [ ] The video plays in a private window without a login.
- [ ] The audio is audible. The screen text is readable at 1080p or 720p.
- [ ] The refusal, approval, settlement, PDF download, audio download, public proof, add-on, and explorer beat are visible.
- [ ] The explorer beat shows the buyer and seller as different addresses.
- [ ] No password, terminal secret, `.env` file, or wallet secret is visible.
- [ ] No claim of real money, mainnet, commercial rights, or legal clearance is made.
- [ ] Background music is owned or CC0. The app's demo audio is CC0.

## 5. Final private-window pass

Open every link below in a fresh private window, signed out. Check every box.

- [ ] Landing loads and the live links work.
- [ ] Sign in loads and registration works.
- [ ] `/app` redirects signed out.
- [ ] `/api/me` and `/api/projects` return 401 signed out.
- [ ] The proof link opens signed out and shows no audio, no client name, no download, and no object key.
- [ ] The proof link is active and has not been revoked.
- [ ] `/api/health` returns 200 with phase `testnet-product-demo`.
- [ ] The public repo opens without login.
- [ ] README, DEMO, DESIGN, and SUBMISSION render on GitHub.
- [ ] The video plays, has audio, and is under 3:00.
- [ ] The seller and treasury explorer links load and show different accounts.
- [ ] The base, add-on, and faucet transaction links load.
- [ ] The submission form URLs match the live URLs exactly.
- [ ] No URL contains a wallet secret, seller secret, session cookie, or admin token. The proof URL is a public, revocable capability.
- [ ] The repo has no `.env.local`, wallet secret, seller secret, or raw share token.
- [ ] The final proof link is not revoked after the check.

## 6. Do not submit if

- The repo is private.
- The video is longer than 3:00.
- The proof link is revoked or requires a login.
- The proof page shows the client name, the audio, or a download button.
- The video shows a secret, password, or `.env` file.
- The seller and treasury are the same account.
- The live judge path returns a 500 or cannot complete a purchase.
- The submission still describes the old treasury payee as the seller.
