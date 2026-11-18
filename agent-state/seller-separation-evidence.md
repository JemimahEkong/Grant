# Seller separation evidence

Status: confirmed on production at https://grant-roan.vercel.app.

## Three distinct addresses

- Treasury, faucet funder only: `GBWSBWJGGL7EVHZPHQLOZTLOEDWZ2SQ4WCGX6YW5T4BXFQN74VMHLUMB`
- Buyer, demo reset account: `GBBBO4IQTOCVMAUWP52SJAYOYVWQN776MIW2EJVSREKUPQAIOGJUECQD`
- Seller, dedicated payee: `GB53WOPIUPZTTTGPNDACTMZ3DJZ62HNRJP53ARI6EVSSBEWMLMF5SKBD`
- All distinct: yes

## Seller setup

- Activation transaction, treasury to seller, 3 XLM: `4b12e00886204f7a33676c1def7b5666f1adf25d6e3da2586c22e7c51d43f0c0`
- USDC trustline transaction: `79af83dec9c93b5e056431d62180be1846e4b1851905ab290ed52caaa125d147`
- Seller XLM balance: 2.9999900

## Treasury to buyer

- Faucet transaction: `d25abb7d7b3940c891cab201854856a67006233465be978598bb4ece3fb0eb80`
- From: `GBWSBWJGGL7EVHZPHQLOZTLOEDWZ2SQ4WCGX6YW5T4BXFQN74VMHLUMB`
- To: `GBBBO4IQTOCVMAUWP52SJAYOYVWQN776MIW2EJVSREKUPQAIOGJUECQD`
- Amount: 2.0000000 USDC

## Buyer to seller

| Record | Base | Add-on |
| --- | --- | --- |
| Purchase | `pur_e2608dd3375043268ce67a39dd9b1d9e` | `pur_ebcaa45b8aa04cf2b1d24e807c106eac` |
| Transaction | `5faefa5615dfb6305c7513780bf8fff48ac1d391ea9187d92c58a3bf83149a25` | `550d615b40c94670a9f835fa4e94dd77d12add896581c86e4eac76b570197c38` |
| Ledger | 5803294 | 5803298 |
| Amount | 1.0000000 USDC | 1.0000000 USDC |
| License | `GRANT-2026-73AB3285E6` | `GRANT-2026-21C938B847` |
| Payee | `GB53WOPIUPZTTTGPNDACTMZ3DJZ62HNRJP53ARI6EVSSBEWMLMF5SKBD` | `GB53WOPIUPZTTTGPNDACTMZ3DJZ62HNRJP53ARI6EVSSBEWMLMF5SKBD` |

## Balances and budget

- Buyer before: 2.0000000 USDC
- Buyer after: 0.0000000 USDC
- Seller after: 2.0000000 USDC
- Treasury after: 79.0000000 USDC
- Combined coverage: organic on Instagram and TikTok; paid ads on Instagram and TikTok
- Purchases used: 2 of 2

## Health

- Phase: `testnet-product-demo`

Evidence JSON: `agent-state/seller-separation-evidence.json`.
