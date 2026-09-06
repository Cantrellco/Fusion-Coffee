# Fall menu implementation status

Requested 2026-09-06: replace the full summer seasonal menu with six fall drinks and two toasts from the user's two note screenshots. Codex owns image design; actual Claude Code owns all website implementation.

## Images completed — compact native vector direction

User clarified: keep small artwork like the former summer illustrations, refined with Astra6. This supersedes the proposed photography and provider question. Codex/Astra drew eight transparent128×128 SVGs directly in public/images/fall/. Every drawing has been visually inspected at128px and64px. Design contract is in design-direction.md; artwork-manifest.json records files and subjects. Website visual QA passed; release is next; the previous 4:3WebP proposal is retired.

## Implementation completed locally

Claude replaced seasonal data, home/menu sections, category labels, small decorative order emblems and item sheets, and JSON-LD; removed four obsolete summer/citrus components. Regular menu preserved. Brown Bear has no modifiers and includes oat milk; Apple Chaider has no milk/espresso options. Existing storage keys remain; canonical cart reconciliation drops retired items and re-prices retained ones. Valid regular saved orders remain available.

Inferred prices: Pumpkin Spice, Peanut Butter, S’more, Brown Bear Cold Brew, Honey Butter $6.50 each; Apple Chaider $6.00; Mediterranean Toast $10.00; Caramel Apple Toast $9.00. Toast prices use the existing $9.00 avocado toast as the closest serving analog.

Verification: `npx tsc -p tsconfig.test.json && node --test tests/fall.test.cjs` passed 14/14 with exit 0 on final source; `npx tsc --noEmit -p tsconfig.json` exit 0. Claude’s `npm run build` completed with all 15 static pages and a full route summary. `git diff --check` clean. Final compact layout visually reviewed at 320, 390 and 1440px. All eight SVGs loaded, no horizontal overflow, no paragraph/art collisions. Home also checked at 320px. Pumpkin item sheet viewed at 320px; Apple Chaider sheet verified without milk or espresso controls. Local static preview produced an expected saved-card endpoint 404 because it has no Worker runtime; production runtime will be checked after deployment. Final menu screenshot: menu-preview.png. Source is reviewed and ready for the authorized two-site release; no commit or deployment has occurred as of this note.

## Implementation owner

Actual Claude Code session: `0135e389-a31a-473e-aee0-db761be77229`. Resume this session for app edits, testing, and eventual release. Keep valid regular carts and saved usual orders when removing retired summer entries. No real checkout/order submission during QA.

## Release

User's existing Fusion deployment preference covers both Cloudflare deployments. After completed image + code review, Claude should commit source and build from an isolated worktree with production Square public values, then deploy and verify BOTH `fusion-coffee.pages.dev` and `fusion-coffee-8zb.pages.dev`/`www.fusioncoffeeshop.com`. Read project memories `deploy-means-both.md`, `checkout-money-safety.md`, and `cloudflare-client-token.md` before release. Never expose credentials in output.
