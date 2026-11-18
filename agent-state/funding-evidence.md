# Per-user funding and purchase evidence

Status: confirmed on production with a fresh account.

## Onboarding

A new production account completed the four-step gate:

1. Generated a per-user Stellar testnet wallet.
2. Activated the account with the minimum XLM reserve.
3. Added the USDC trustline.
4. Funded 5 testnet USDC from the faucet.

- Wallet address: `GAPYFLWNKSGSQIOH2P6SRIIZ32GYVXIYRUQZ4G4OT7JMDSK2A5U5TMHD`
- Faucet amount: 5.0000000 testnet USDC
- Faucet transaction: `5a6672727f59d685cd97f4feb1a953e11142d50dc32ed11b9347117c4ec3f03f`
- Faucet grant status: confirmed

## Purchase

- Purchase: `pur_beeaa55ec33e46019d5a9ceebc246dad`
- Project: `prj_1a975f9f3c4d4728b41a3887acdbc981`
- License: `lic_560132a582a542e68a489921c4b5b07e`
- License number: `GRANT-2026-9A30B34453`
- Amount: 1.0000000 testnet USDC
- Purchase transaction: `90be474e0a4c1b0faa5fba821f4e21a37396b9cbdb5c788f21a99f3f497f7968`
- Ledger: `5787225`
- Settlement reference: `stellar:testnet:90be474e0a4c1b0faa5fba821f4e21a37396b9cbdb5c788f21a99f3f497f7968:0`
- Buyer balance after purchase: `4.0000000` USDC
- Treasury balance after purchase: `11.0000000` USDC

## Delivery

- PDF: 2433 bytes, SHA-256 `2b3dee8dea610be4c644c961a0037489d2a20de3061c4d4cc7f2a1f0663d7982`
- Audio: 176444 bytes, SHA-256 `b1deeb1327e003781fb7135b879b9da7301e6a66e667c12b25b3cfbf5fc4d7bd`
- Purchase status after delivery: `ready`
- Proof link created but the raw token was not recorded.

## Migration and retirement

- Migration `0004` adds per-user wallets and faucet grants.
- The pay route signed with the new account's encrypted wallet.
- The old shared buyer signer was retired after this proof and `X402_BUYER_SECRET` was removed from Vercel Production.
- The spending allowlist is retired. Spending is bounded by the user's on-chain balance, faucet caps, project budget, approval, reservation, rate limits, and settlement checks.
