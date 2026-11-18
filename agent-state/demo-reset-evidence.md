# Demo reset evidence

Status: `npm run demo:reset` completed twice in a row on production. Each run created a new account, a funded wallet, and one clean project. No evidence rows were deleted.

## Command behavior

- Creates a new email/password demo user.
- Generates a per-user Stellar testnet wallet.
- Activates the wallet, adds the USDC trustline, and claims the 2.00 USDC faucet grant.
- Creates one project with the default brief and a 5.00 USDC budget, 2 purchase slots.
- Verifies the project has 0 purchases, 0 confirmed spend, 0 active reservations, and 0 of 2 slots used.
- Prints the email, wallet address, balance, project ID, budget, and faucet transaction.
- Does not delete any settled purchase, license, receipt, artifact, or shared proof.

The first attempted second run exposed a wallet balance cache race between the faucet and project creation. The script now polls `/api/wallet?refresh=1` until the 2.00 grant is visible before creating the project. The two runs below are the consecutive successful runs after that fix.

## Run 1, used for the seller proof

- Email: `demo-reset-1795040018116-e5f45c@grant.local`
- Wallet: `GBBBO4IQTOCVMAUWP52SJAYOYVWQN776MIW2EJVSREKUPQAIOGJUECQD`
- Balance: 2.0000000 USDC
- Project: `prj_c7cb6fad32844f8ea178922af56a2565`
- Budget: 5.00 USDC available, 0 of 2 purchases used
- Faucet transaction: `d25abb7d7b3940c891cab201854856a67006233465be978598bb4ece3fb0eb80`

This account was then used for the base plus add-on purchase in `agent-state/seller-separation-evidence.md`. Its project now shows 2 of 2 purchases used.

## Run 2, clean and untouched

- Email: `demo-reset-1795040041048-547ac9@grant.local`
- Wallet: `GBAOVXPGANWX6FONTYLV5T6ANC7P2HNKBBGP4Q273TP7N2UJFQYHT64N`
- Balance: 2.0000000 USDC
- Project: `prj_e1f8cf242c2349ada0e251025bfe4c6e`
- Budget: 5.00 USDC available, 0 of 2 purchases used
- Faucet transaction: `efdb85b7054a7ba7ce580b54c3ea93beaa2d0723b28bd07552eef7407a1f82f5`

Read back after the seller proof: 0 purchases, confirmed spend 0, active reservations 0, available budget 50000000 base units, purchases used 0 of 2, wallet balance 2.0000000 USDC.

Evidence JSON: `agent-state/demo-reset-evidence.json`. The demo reset password is the configured `DEMO_RESET_PASSWORD` or the script default. It is printed by the command at runtime and is not stored in this evidence file.
