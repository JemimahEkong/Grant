# Grant design system

Version: 1.0. Source of truth for every Grant surface. The visual references are
`grant-landing.html`, `grant-ui-mock.html`, `grant-ui-mock2.html`, and `grant-ui-mock3.html`.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| Base | `#0A0A0B` | Page background |
| Panel | `#121214` | Cards, rows, inputs |
| Panel 2 | `#17171A` | Nested surfaces, avatars, media wells |
| Hairline | `#26262A` | Borders and dividers |
| Text | `#F2EFE9` | Primary text |
| Muted | `#8A8A8F` | Secondary text |
| Dim | `#5C5C62` | Micro labels, disabled text |
| Accent | `#E9B44C` | Money, needs decision, primary action |
| Covered | `#6FCF97` | Covered clearance segment, settled state |
| Refused | `#E5645C` | Refused state, destructive explanations |

Accent is limited to money, needs-decision states, and the primary action. It is not a
decorative color.

## Type

- Geist Sans for all UI text.
- Geist Mono for every number, price, amount, license ID, transaction hash, address, and
  balance. Use tabular figures.
- Micro labels: 9px uppercase, 0.15em tracking, 700 weight, dim color.
- Headings: tight tracking, 600 to 680 weight. Hero headings may use 0.038em negative
  tracking.
- Body copy stays between 10px and 13px in dense panels. Do not use large paragraphs.

## Layout

- One breakpoint at 900px.
- Mobile: bottom navigation with Home, Tracks, center plus action, Purchases, Profile.
- Desktop: fixed left rail with the same routes and brand.
- Content max width: 1120px. Dense panels may cap at 760px.
- Spacing rhythm: 4, 8, 12, 16, 24, 32.
- No gradients, glass, or drop shadows. The only shadow is a phone shell if one is used in
  a presentation surface. The product UI uses none.
- No images or stock photography. Inline SVG only. No icon library.

## Clearance strip

The signature element. One segment per coverage dimension.

- Covered: green top rule, translucent green fill, covered text.
- Excluded: hollow surface, amber top rule, dashed bottom edge, dim text.
- Segments share equal width. Labels are 6.5px to 8px uppercase with tight line height.
- Appears on the landing hero card, catalog rows, review, license, and proof page.
- Dimensions: platforms/use, term, territory, client delivery, reposting, future campaigns.

## States

- Settled: green chip.
- Pending: amber chip, exactly one action, "Check again".
- Refused: red chip and an explanation panel. Refusals are content, not fallback errors.
- Over cap and over budget: explanatory panels with the actual limit and the actual price.
- Empty: designed copy and one next action.
- Non-allowlisted spending: explanatory amber panel, not a toast.

Every money surface labels TESTNET.

## Interaction

- Every control has a visible label.
- Focus is a 2px accent outline with a 2px offset.
- Keyboard order follows visual order.
- Reduced motion disables transitions and animations.
- Pending never simulates progress and never offers a retry that could sign again.
