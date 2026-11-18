# Faucet capacity evidence

Status: passed on production at https://grant-roan.vercel.app.

## Defaults

- Grant per wallet: `20000000` base units, 2.0000000 testnet USDC
- Daily treasury cap: `400000000` base units, 40.0000000 testnet USDC
- One grant per wallet. A grant is refused when the daily cap or treasury balance would be exceeded.

## Treasury

- Balance before the capacity proof: 91.0000000 USDC
- Balance after three 2.00 USDC grants: 85.0000000 USDC

The treasury was topped up from 91.00 USDC after the earlier 5.00 USDC proof. The three new accounts did not exhaust it, which was the failure mode under the old 5.00 USDC grant and 15.00 USDC daily cap.

## Three fresh accounts

Each account was registered, generated a wallet, activated it, added the USDC trustline, and called the faucet sequentially.

| Account | Wallet | Faucet transaction | Balance after grant |
| --- | --- | --- | --- |
| `faucet-cap-1795036045272-1@grant.local` | `GBEHOFYXJFYZ3NH3UK475HT3KFW2AEK7J5G3QEHGBV67DD5GEZ4SXM5K` | `e7afc3ac56d3e4f529fcc5abc2cc1139b3f6a9366085bcd890c3619040d0505e` | 2.0000000 USDC |
| `faucet-cap-1795036045272-2@grant.local` | `GDX7QRO7EUPZ5OMYC4BGXXWI6VBKLLR5WJZ7XJXBL5LTXSEJAORZOHAR` | `b29597682d3d8950953eb907beec274c42373fea36ced57a59eac7cdec969baf` | 2.0000000 USDC |
| `faucet-cap-1795036045272-3@grant.local` | `GC5N6QSRG3MFYDP4EAU7A45XOJMUBR3WDGVXLRQ2UNQW6BTD3KPD4ABV` | `004a9e8793625c03a089d15cc9524a9e2401a7dc1a0d604c5d455bc68332953a` | 2.0000000 USDC |

Evidence JSON: `agent-state/faucet-capacity-evidence.json`.

The earlier 5.00 USDC faucet proof remains historical in `agent-state/funding-evidence.md`. The current defaults are 2.00 USDC and 40.00 USDC.
