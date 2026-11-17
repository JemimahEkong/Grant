# G0 Stellar testnet x402 evidence

Status: confirmed with two real testnet settlements. This is protocol evidence, not a product purchase. The local seller response granted no license, entitlement, or audio.

## Configuration

- Network: `stellar:testnet`
- Scheme: `exact`
- Asset contract: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` (7 decimals)
- Facilitator: `https://www.x402.org/facilitator`
- Facilitator capability check: `/supported` listed `exact` on `stellar:testnet` with `extra.areFeesSponsored: true`
- RPC: `https://soroban-testnet.stellar.org`
- Local seller: `http://127.0.0.1:4021/g0/license`
- Buyer: `GAIPPBOFGQGABZ2SQ53QUIE5T24BZYCAS2ARMENZZAM7F65B3AIZWYQP`
- Seller payee: `GBWSBWJGGL7EVHZPHQLOZTLOEDWZ2SQ4WCGX6YW5T4BXFQN74VMHLUMB`
- Packages: `@x402/core`, `@x402/express`, `@x402/fetch`, `@x402/stellar` 2.30.0; `@stellar/stellar-sdk` 17.4.0; Node 24.15.0
- Signer secrets were written only to ignored `.env.local` and are not in this repository.

## Settlement 1: 0.01 testnet USDC

- Transaction: `8a7770520e5e575d37bbaa4274fdc9b17b826161d7c872253e1208fbafa8d144`
- Ledger: `5782531`
- Ledger time: `2026-11-17T17:25:01Z`
- Horizon result: successful, one operation
- Amount: `100000` base units, 0.01 USDC
- Settlement response: `success: true`, payer matched the buyer, network `stellar:testnet`
- Buyer balance: `20.0000000` to `19.9900000` USDC
- Seller balance: `0.0000000` to `0.0100000` USDC

## Settlement 2: 1.00 testnet USDC

- Transaction: `e1dcd2ef7754ea822078d2aa8c8c49535f20b5a1f890d5f093117a36cc23a160`
- Ledger: `5782541`
- Ledger time: `2026-11-17T17:25:51Z`
- Horizon result: successful, one operation
- Amount: `10000000` base units, 1.00 USDC
- Settlement response: `success: true`, payer matched the buyer, network `stellar:testnet`
- Buyer balance: `19.9900000` to `18.9900000` USDC
- Seller balance: `0.0100000` to `1.0100000` USDC
- On-chain source account: `GC6CSXBV4C6RL3HEDTW57KXYXSSXKAWKGYDEOSATXM3XNKXSR2VRYN3K` (facilitator signer)
- Fee charged: `11701` stroops, sponsored by the facilitator

## Reproduction

Run locally only. Never deploy the buyer secret or the seller script with a signer.

```sh
npm run g0:setup
# Fund the printed buyer public key through https://faucet.circle.com on Stellar Testnet.
npm run g0:seller
G0_PRICE='$1.00' npm run g0:seller
npm run g0:buyer
```

The seller binds to `127.0.0.1`. The buyer exits nonzero if the quote is not 402, the network or payee differs, the paid retry is not 200, or the settlement header is missing. The script writes safe evidence to `agent-state/g0-evidence.json` and never writes secrets.

## What this does not prove

- No music license, copyright authority, or ownership verification.
- No protected audio or PDF delivery.
- No human approval, budget reservation, idempotency, or reconciliation path.
- No mainnet or production custody claim.

Payments remain disabled in the product until the approved execution path, verification, and reconciliation are implemented and tested.
