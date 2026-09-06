# Fusion Coffee — fall 2026 illustration direction

The user's correction replaces the proposed photography with improved versions of the original summer menu's tiny ingredient drawings. Codex/Astra draws the eight native SVG assets directly; actual Claude Code owns website copy, menu data, prices, application code, checks, and release.

## Visual contract

Keep Fusion's existing Fraunces / Hanken Grotesk type and cream, oak, brick and sage palette. Item names and ingredient descriptions lead. Artwork stays small, calm and decorative, inside compact framed specimen cards like the prior summer menu. No photo panels or oversized product scenes.

Each drawing is a self-contained transparent SVG with intrinsic size 128×128 and viewBox 0 0 128 128. Typical display: 76–96px in the menu, 48–64px in ordering rows, up to96px beside the item-sheet title. Rounded strokes range 1.3–2.3 units. Main outlines use muted clay #AD6948, toasted oak #9B744B and sage #748365. Small translucent fills provide separation without adding surface detail. Natural asymmetry and a few ingredient marks replace dense hatching. Artwork renders at full opacity; its colors are already muted. No text, logos, external resources, scripts, raster embeds, filters or gradients inside the SVGs.

## Asset set

| File under public/images/fall/ | Drawing |
| --- | --- |
| pumpkin-spice.svg | Rounded pumpkin lobes, curled stem, one sage leaf |
| peanut-butter.svg | Tilted peanut shell with sparse hatching and one shelled peanut |
| smore.svg | Two graham crackers, pillowy marshmallow and a few cocoa marks |
| brown-bear-cold-brew.svg | Maple leaf, oat sprig and cinnamon sticks |
| apple-chaider.svg | Apple, leaf and cinnamon sticks |
| honey-butter.svg | Honey dipper and drop, butter pat, tiny dark salt flecks |
| mediterranean-toast.svg | Toast with avocado, arugula, tomato, feta and balsamic marks |
| caramel-apple-toast.svg | Matching toast silhouette, green-edged apple fan, caramel ribbons and crumbs |

The ingredients are visual cues for each named recipe, not a claim that every cue is served whole or used as a garnish. The written recipe remains authoritative. Images are decorative with empty alt and aria-hidden where the nearby name and recipe already convey their meaning.

## Website treatment

Shared FallMenu on home and /menu. Six drinks in three desktop columns and two toast cards in two columns, collapsing to one phone column. Compact warm framed cards, clear copy, reserved lower-right illustration space with no collisions. Keep the existing paper grain and quiet brand greenery; remove seasonal citrus and per-item numbering. Small order-list and item-sheet emblems should preserve the original compact ordering experience. Preserve all regular menu, cart, payment and navigation behavior.

Prices and recipes remain in the shared fallMenu data. Brown Bear oat milk is included and the premade drink has no modifiers. Apple Chaider is cider + chai with no milk or espresso options. Existing marketing price display convention is preserved; inferred prices appear in ordering.
