# Paid-ad add-on evidence

Historical note: this proof was recorded before seller separation. The payee in this record was the faucet treasury. The current seller-separated proof is in `agent-state/seller-separation-evidence.md`.

Status: confirmed on production at https://grant-roan.vercel.app.

## Base purchase

- Purchase: `pur_ff0cd26ec27d44a1b2b7d6a400d06958`
- License: `GRANT-2026-3F9A10D1B6`
- Transaction: `e666e5c6f922b4773ef0187c9ff2d87db4ae4f6c86618adbf3d33f22a56dfa26`
- Ledger: `5802910`
- Amount: 1.0000000 testnet USDC
- Term: 2026-11-18T21:43:10.000Z to 2027-02-16T21:43:10.000Z

## Add-on purchase

- Purchase: `pur_b2951301f1be45ad9d688cb9da1aea53`
- License: `GRANT-2026-BC32E70611`
- Parent purchase: `pur_ff0cd26ec27d44a1b2b7d6a400d06958`
- Parent license: `lic_f5394ec546134fd9a862d8acd8e0f45e`
- Transaction: `a1b4bc87d1bde5d013bf60626ed9bb8f341a2ab99a9b625dc1cd502e521cb484`
- Ledger: `5802914`
- Amount: 1.0000000 testnet USDC
- Own receipt: yes
- Parent-bound license: yes
- Term preserved: 2026-11-18T21:43:30.000Z to 2027-02-16T21:43:10.000Z

## Offered delta

- Intended use: paid ads
- Platforms: instagram, tiktok
- Term: 90 days, ending with the base license
- Price: 1.0000000 testnet USDC

## Combined coverage

- Organic: instagram, tiktok
- Paid ads: instagram, tiktok
- Term: 2026-11-18T21:43:10.000Z to 2027-02-16T21:43:10.000Z
- Total paid: 2.0000000 testnet USDC
- Licenses: GRANT-2026-3F9A10D1B6, GRANT-2026-BC32E70611

## Budget and wallet

- Project confirmed spend: 2.0000000 USDC
- Purchases used: 2 of 2
- Available budget: 3.0000000 USDC
- Wallet before: 2.0000000 USDC
- Wallet after: 0.0000000 USDC
- Treasury after: 87.0000000 USDC

Evidence JSON: `agent-state/addon-evidence.json`.
