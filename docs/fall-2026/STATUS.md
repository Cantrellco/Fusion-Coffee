# Fall menu implementation status

Requested 2026-09-06: replace the full summer seasonal menu with six fall drinks and two toasts from the user's two note screenshots. Codex owns image design; actual Claude Code owns all website implementation.

## Images completed — compact native vector direction

User clarified: keep small artwork like the former summer illustrations, refined with Astra6. This supersedes the proposed photography and provider question. Codex/Astra drew eight transparent128×128 SVGs directly in public/images/fall/. Every drawing has been visually inspected at128px and64px. Design contract is in design-direction.md; artwork-manifest.json records files and subjects. Website visual QA passed; release is next; the previous 4:3WebP proposal is retired.

## Implementation completed locally

Claude replaced seasonal data, home/menu sections, category labels, small decorative order emblems and item sheets, and JSON-LD; removed four obsolete summer/citrus components. Regular menu preserved. Brown Bear has no modifiers and includes oat milk; Apple Chaider has no milk/espresso options. Existing storage keys remain; canonical cart reconciliation drops retired items and re-prices retained ones. Valid regular saved orders remain available.

Inferred prices: Pumpkin Spice, Peanut Butter, S’more, Brown Bear Cold Brew, Honey Butter $6.50 each; Apple Chaider $6.00; Mediterranean Toast $10.00; Caramel Apple Toast $9.00. Toast prices use the existing $9.00 avocado toast as the closest serving analog.

Verification: `npx tsc -p tsconfig.test.json && node --test tests/fall.test.cjs` passed 14/14 with exit 0 on final source; `npx tsc --noEmit -p tsconfig.json` exit 0. Claude’s `npm run build` completed with all 15 static pages and a full route summary. `git diff --check` clean. Final compact layout visually reviewed at 320, 390 and 1440px. All eight SVGs loaded, no horizontal overflow, no paragraph/art collisions. Home also checked at 320px. Pumpkin item sheet viewed at 320px; Apple Chaider sheet verified without milk or espresso controls. Final menu screenshot: menu-preview.png. The production Worker runtime was checked live after deployment (see “Release completed” below). Source was reviewed, committed and shipped to both sites.

## Implementation owner

Actual Claude Code session: `0135e389-a31a-473e-aee0-db761be77229`. This session implemented, tested and released the fall menu (see “Release completed” below). Valid regular carts and saved usual orders are kept when retired summer entries are removed. No real checkout/order was submitted during QA or release verification.

## Release

User's existing Fusion deployment preference covers both Cloudflare deployments. Per that preference, the release committed source, built from an isolated worktree with production Square public values, then deployed and verified BOTH `fusion-coffee.pages.dev` and `fusion-coffee-8zb.pages.dev`/`www.fusioncoffeeshop.com`, following project memories `deploy-means-both.md`, `checkout-money-safety.md`, and `cloudflare-client-token.md`. No credentials were exposed in output. Details below.

## Release completed — 2026-09-06

**Source SHA:** `edbca661b43a88c1c369ae968e4fbd7fe6c88a43` (branch `main`, pushed).

**Production build:** isolated detached worktree `/private/tmp/fusion-fall-release-edbca66` at the release SHA (no `.env.local`/`.dev.vars`; symlinked `node_modules`; Node 20.20.2; `GH_PAGES_BASE=` empty; inline production `NEXT_PUBLIC_SQUARE_APP_ID=sq0idp-P7wBm00ZxoHfcD8sPkxZ_A`, `NEXT_PUBLIC_SQUARE_LOCATION_ID=LJJEGQGXDHP0Y`, `NEXT_PUBLIC_SQUARE_ENV=production`). 15/15 static pages. Whole `out/` tree contains only the production app id and location id — zero sandbox app id / `squareupsandbox` / env strings. All eight `out/images/fall/*.svg` are byte-identical (sha256) to the committed sources.

**Deployments (personal first, client second), wrangler 4.129.0, Node 24:**

| Target | Account | Deployment URL | Alias / domain |
| --- | --- | --- | --- |
| Personal | `cf6e690feb8c6532cecdfb31a55fbe0d` | https://55445267.fusion-coffee.pages.dev | https://fusion-coffee.pages.dev |
| Client | `e71478347cb65347d00374cbffd8d6f9` | https://307e6e7a.fusion-coffee-8zb.pages.dev | https://fusion-coffee-8zb.pages.dev · https://www.fusioncoffeeshop.com |

Both uploaded 116 files and compiled the Functions/Worker bundle (shared menu/pricing). Personal used stored wrangler OAuth with no API token in env; client read its token straight into the child process env only (never printed).

**Live verification (all three hosts — personal, client, custom domain):** `/menu/` shows all 8 fall names and 0 retired summer names (HTTP 200); all 8 `/images/fall/*.svg` return 200 with sha256 matching the reviewed sources; `/order/` bundle carries the production Square app id with no sandbox id/env (12 chunks scanned). Safe `POST /api/checkout {}` probe returns **409 `{"error":"closed"}`** rather than 501 — the shop was closed at verification time, so the hours gate short-circuits before the missing-sourceId check; nothing was created. No real orders or charges were submitted.

**Root live visual QA (independent, 2026-09-06; artifacts in `/tmp/fusion-fall-qa/live`):** personal desktop `/menu/` — all 8 headings and SVGs, intrinsic 128, zero horizontal overflow, approved compact cards; canonical `www.fusioncoffeeshop.com` `/menu/` at 390px — all 8 assets, no overflow; live `/order/` — correct prices, Pumpkin Spice showing milk/extra-shot options with the 96px emblem, Apple Chaider excluding milk/espresso with its art loading. No order submitted.
