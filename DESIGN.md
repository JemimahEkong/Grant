# Grant design system

Version 2 — iOS-style light UI on a lemon-green brand.
Supersedes the dark system in v1. If anything in the codebase contradicts this
document, this document wins.

Reference screenshots supplied by the founder (four images):
wallet home (big balance, quick actions, transaction list, floating tab bar),
invoices list (search, pill filters, status chips, card rows),
profile sheet (avatar row, promo card, list rows with chevrons),
landing (lime hero, dark-green cards, pill CTAs).

Adapt them; do not copy their content. Grant sells music clearance, not wallets.

---

## 1. Colour

Light canvas, white cards, one lemon accent, deep green for weight.
Never place lemon behind body text. Lemon is a fill, never a text colour.

| Token | Value | Use |
| --- | --- | --- |
| `--canvas` | `#F4F6F0` | page background |
| `--surface` | `#FFFFFF` | cards, sheets, tab bar |
| `--surface-2` | `#FAFBF7` | inputs, inset rows, unselected chips |
| `--ink` | `#0F1A12` | primary text |
| `--ink-2` | `#4A544C` | secondary text |
| `--ink-3` | `#8A938B` | tertiary, captions, placeholders |
| `--hairline` | `#E3E7DC` | 1px borders and dividers |
| `--brand` | `#C9F24C` | primary buttons, active tab, key highlights |
| `--brand-ink` | `#14210F` | text/icons on lemon |
| `--brand-deep` | `#0D3B22` | dark hero cards, proof header, footer bands |
| `--brand-soft` | `#EAF8C9` | tinted backgrounds, selected chips |
| `--success` | `#17A34A` | settled, covered |
| `--success-soft` | `#E6F6EC` | success chip background |
| `--warning` | `#C98A00` | pending, needs attention |
| `--warning-soft` | `#FBF1DA` | warning chip background |
| `--danger` | `#D1453B` | refused, destructive |
| `--danger-soft` | `#FBEBE9` | refusal chip background |

Contrast rules, non-negotiable: ink on canvas ≥ 12:1; ink-2 on surface ≥ 7:1;
`--brand-ink` on `--brand` ≥ 9:1; never lemon text on white.

## 2. Type

Stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", var(--font-geist-sans),
system-ui, sans-serif`. It should feel native on iOS first, acceptable elsewhere.

| Role | Size / line | Weight | Tracking |
| --- | --- | --- | --- |
| Large title | 34 / 41 | 700 | -0.02em |
| Title 2 | 22 / 28 | 650 | -0.02em |
| Headline | 17 / 22 | 600 | -0.01em |
| Body | 17 / 24 | 400 | 0 |
| Subhead | 15 / 20 | 400 | 0 |
| Footnote | 13 / 18 | 400 | 0 |
| Caption | 12 / 16 | 500 | 0.01em |
| Micro label | 11 / 14 | 700 | 0.06em, uppercase |

Money uses tabular figures in the sans stack (`font-variant-numeric:
tabular-nums`), not mono. Reserve `ui-monospace` for chain data only: addresses,
transaction hashes, license IDs, object keys.

## 3. Shape, spacing, elevation

- Card radius 18px; input radius 14px; button and chip radius 999px.
- Screen gutter 20px. Section gap 24px. Card padding 16–20px.
- Elevation: cards `0 1px 2px rgba(15,26,18,.05)`. Sheets and the tab bar
  `0 -1px 0 var(--hairline)` plus `0 8px 24px rgba(15,26,18,.08)`.
- No gradients, no glassmorphism, no drop shadows on text.

## 4. Components

**Buttons.** Primary: lemon fill, brand-ink label, 52px tall, 17 semibold, full
width in sheets. Secondary: white, 1px hairline, ink label. Tertiary: plain
lemon-ink text. Pressed state scales to 0.98 over 120ms.

**Cards.** White, 18px radius, 1px hairline, 1px shadow. One dark variant:
`--brand-deep` background, white text, lemon accent — used only for the balance
hero and the proof header.

**Chips.** Pill, 13px, 32px tall. Selected: `--brand-soft` fill, `--brand-deep`
text, 1px `--brand` border. Unselected: `--surface-2`, ink-2 text, hairline.

**List rows.** Minimum 60px, 36px circular soft-tint icon left, 17px title,
13px tertiary subtitle, chevron right in ink-3. Divider inset 16px from the left.
Group rows into a card with hairline dividers, iOS style.

**Status chips.** 12px uppercase, soft background, solid text:
settled → success, pending/expiring → warning, refused/expired → danger.

**Tab bar.** Five slots: Home, Tracks, centre action, Purchases, Profile.
Height 84px including safe area, white at 92% opacity with backdrop blur,
1px hairline top. Active icon and label `--brand-deep`; inactive `--ink-3`.
Centre slot is a 56px lemon circle raised 18px above the bar with a 4px white
ring. Above 900px it becomes a 240px left rail with the same order.

**Sheet.** Bottom sheet for wallet quick actions and filters: 24px top radius,
grabber 36×5 hairline, canvas backdrop at 40% black.

## 5. The clearance strip

The signature element. It survives the re-theme and becomes the brand's one
distinctive shape.

- Horizontal band, one segment per coverage dimension, 3px gaps.
- Covered: `--brand-soft` fill, 2px top rule `--success`, `--brand-deep` label.
- Excluded: transparent, 2px top rule `--warning`, dashed 1px `--hairline`
  bottom, `--ink-3` label.
- Height 52 on review, 44 in the hero card, 16 as a row preview.
- Labels are 10px uppercase, 0.04em, wrapped to two lines.

## 6. Landing

Same tokens, more air. Canvas light, one lemon band mid-page and one
`--brand-deep` band for emphasis. Hero headline 44/48 at desktop, 32/37 on
mobile, tracking -0.03em. Cards white with hairline; the license example card
is dark green. Pill CTAs. No stock photography, no gradients, no logo walls,
no pricing table, no testimonials.

## 7. Screen mapping

| Screen | Treatment |
| --- | --- |
| Home | Large title, dark-green balance hero card (balance + budget + cap), quick-action row of four 56px circles, recent list in a grouped card, tab bar |
| Brief | Large title, one sentence in a white input card, chip groups per dimension, sticky lemon CTA above the tab bar |
| Catalog | Large title, search field, pill filters, three card rows with mini strips and "Review" chevron |
| Review | Sheet-style screen, track header, big price, clearance strip, exclusions card with warning tint, sticky Approve CTA |
| Pending | Same as review, header swapped to warning tint, single "Check again" button |
| License | Dark-green header with license ID, three deliverable rows in a grouped card, chain details as inset rows, share row |
| Purchases | Large title with summary card, pill filters, grouped rows with status chips |
| Wallet | Dark-green balance card, QR in a white card, four quick actions, history grouped list |
| Profile | Avatar row, wallet row, grouped list, sign out in danger |
| Proof | Public, light canvas, dark-green header band, strip, inset detail rows, thin footer |

## 8. Motion

200ms ease-out for state changes, 120ms for press, 280ms spring for sheets.
Respect `prefers-reduced-motion`: no transforms, opacity only.

## 9. Rules that survive the re-theme

- One money entry point; only the review screen can call pay.
- Every state is a URL; refresh never loses a purchase.
- Refused, pending, expired, insufficient balance, and cap exceeded are designed
  screens, not error boundaries.
- Every money surface says TESTNET.
- Never claim a receipt proves copyright ownership or that this is legal advice.
- Custody disclosure stays on the wallet screen.
- Do not change payment, auth, settlement, or rate-limit behaviour while
  restyling.

## V2 implementation clarifications

- Exact palette values remain unchanged. Ink-2 replaces ink-3 for small readable labels and inactive navigation. Ink-3 on white is about 3.1:1 and fails normal-text AA.
- Pending chips use brand-ink on warning-soft. Refused chips use ink on danger-soft. Success chips use brand-deep on success-soft. Warning and success remain the strip rules and semantic border colours.
- The tab bar uses an opaque white surface. This follows the project no-glass rule and preserves contrast without backdrop blur.
- Lemon bands use brand-ink labels only. Lemon never colours text.

## Reference refinement, November 19

The founder rejected the first v2 implementation as too spacious and unlike the references. This refinement supersedes conflicting v2 type and navigation measurements.
- Use locally hosted variable Inter (OFL license in app/fonts), 15px body, 13px supporting copy, 28/35 semibold page titles, 14px semibold controls. Chain data alone uses Geist Mono.
- Buttons are 44px high, with 40px compact secondary actions. Use pill shapes with balanced horizontal padding.
- Home order: heading, deep-green balance card, four icon-led quick actions with labels outside their 48px containers, project selector/budget, recent purchases. No duplicate balance inset or repeated create-project panels.
- Mobile navigation is a floating dark-green pill inset 20px, with a lemon centre action and white active-icon capsule. Preserve five-slot order and the desktop rail.
- Purchases use individual white cards with icons, short metadata and status chips. Full refusal reasons remain on the linked detail screen.
- Profile uses an avatar greeting, a deep-green brief CTA card, wallet and grouped account/project rows. No invented paid subscription.
- Landing uses a layered native product-license preview, compact pill CTAs, a lemon coverage section, and deep-green closing band. Keep existing claims and demo disclosures.
- Existing inline icons are retained under the project icon rule. No reference brands, financial claims, stock imagery or device chrome are copied.
