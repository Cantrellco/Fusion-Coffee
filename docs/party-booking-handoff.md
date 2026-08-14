# Party booking — state of play

Built 2026-08-13. Everything below is **live** unless marked otherwise.

Two businesses share one café. Little Town Playhouse next door sells a
"Little Town + Fusion" buyout that opens Fusion's room with a barista, and
Fusion sells the same room from its own site. Two storefronts, one room, so they
need one list of when it is taken.

---

## The three bookings

| Booking | Price | Sold on | Rooms taken |
|---|---|---|---|
| Little Town | $195 | Little Town's Shopify | playhouse |
| Little Town + Fusion | $295 | Little Town's Shopify | playhouse **and** café |
| Fusion | $175 | fusioncoffeeshop.com | café |

Windows are **identical at both venues**: Sat 4:30–6:30 PM, Sun 1:00–3:00 PM,
Sun 4:00–6:00 PM. They used to differ, which is why some code still guards
against mismatched slot strings.

## The shared ledger

A Shopify **shop metafield** on Little Town's store, plain text:

```
lt_booking.taken          playhouse occupied   (theirs; Fusion ignores it)
lt_booking.fusion_taken   café occupied        (both sides read and write)

  2026-09-20|1:00–3:00 PM|lt;2026-10-10|4:30–6:30 PM|lt
  ^date       ^slot        ^ optional marker: written by Little Town
```

**Why two metafields.** `taken` records date and slot but not which variant sold,
so a $195 playhouse party and a $295 combo look identical in it. If Fusion read
`taken`, every playhouse booking would black out a Fusion date for no reason.
If Fusion wrote into `taken`, Little Town's calendar would grey out a date where
the playhouse is free.

**Why the `|lt` marker.** A Fusion booking takes one window; a Little Town combo
takes the whole day. Without the marker they're indistinguishable and everything
would have to be over-blocked. Little Town's parser reads only fields 0 and 1,
so the third field is invisible to it — deliberately backward compatible.

**Blocking is day-level for cross-venue bookings.** Slot-level would work now
that the windows match, but day-level over-blocks by at most one Sunday window
and can never under-block. Cheap insurance while two slot tables live in two
repos. A test pins Fusion's `SLOTS_BY_DOW` to Little Town's values so a future
divergence fails loudly.

**"Nothing booked" is an ABSENT metafield, not an empty one.** Shopify rejects
`""` on a single-line-text metafield with `Value can't be blank.` — clear it by
deleting the metafield.

---

## Fusion's side — this repo

| File | Does |
|---|---|
| [src/lib/party.ts](../src/lib/party.ts) | slots, price, ledger parse/serialise, availability, the sale gate |
| [src/components/party/PartyCalendar.tsx](../src/components/party/PartyCalendar.tsx) | month grid, slot pills |
| [src/components/party/PartyCheckout.tsx](../src/components/party/PartyCheckout.tsx) | card form, contact, all-sales-final gate |
| [src/components/party/PartyBooking.tsx](../src/components/party/PartyBooking.tsx) | flow owner: pick → pay → confirmed |
| [functions/api/party-checkout.ts](../functions/api/party-checkout.ts) | the money path |
| [functions/api/party-availability.ts](../functions/api/party-availability.ts) | public; dates and slots only |
| [functions/api/party-bookings.ts](../functions/api/party-bookings.ts) | **private**; names and phones, bearer token |
| [functions/api/_shopify.ts](../functions/api/_shopify.ts) | token minting + ledger read/write |
| [docs/party-calendar.gs](party-calendar.gs) · [docs/party-calendar.md](party-calendar.md) | Google Calendar sync |

### Order of operations in checkout — this *is* the design

1. validate server-side, trusting nothing from the client
2. read the ledger — **refuse the sale if it can't be read**
3. create the Square order
4. take the payment
5. append to the ledger — best effort, **after** the money

Step 5 must never fail the response: the card is already charged, and an error
would tell a paying customer their party didn't book. It returns
`ledgerWritten: false` and the confirmation tells them to call.

A ledger that can't be *read* fails closed. Unknown is not the same as empty;
treating an outage as "nothing booked" would put every window back on sale.

Price is a server constant, never a request field. Idempotency mirrors
`checkout.ts`: stable order key, per-attempt payment key.

### Deliberately separate from `checkout.ts`

That file moves café and merch money daily and has shipped broken once. A
booking flow with a different shape has no business sharing its branches. What
must not drift — the sales-tax object and the idempotency contract — is
imported, not copied.

---

## Little Town's side — `Cantrellco/Little-Town`, branch `main`

`assets/js/main.js` reads `window.LT_FUSION_TAKEN` and disables **only** the
$295 card on days Fusion is taken. The $195 card is never touched and the date
is never greyed out — a booked café must not cost a playhouse sale.

Pushed to the **live** theme (#162033565917) as four files only.

> ⚠️ **The repo drifts from the live theme.** Twice now the published theme
> carried edits the repo never had — the buyout price, and a whole per-child /
> infants-free copy rewrite. Someone edits the published theme directly, so any
> rebuild silently reverts it.
>
> **Before any theme push: pull the live theme and diff it against a fresh
> build.** Push only changed files:
> ```
> npx @shopify/cli theme pull  --theme 162033565917 --store 2vwce2-cj.myshopify.com --path /tmp/live
> npx @shopify/cli theme push  --theme 162033565917 --store 2vwce2-cj.myshopify.com \
>     --nodelete --allow-live --force --only "assets/main.js" --only "..."
> ```
> Use `npm run build:theme`, **not** `npm run build` — the latter re-runs the
> image optimiser and rewrites ~130 identical images.

---

## Gotchas that cost time

- **The store has two domains.** Admin handle `little-town-playhouse`, permanent
  `2vwce2-cj.myshopify.com`. The Theme Access token **only** works with the
  permanent one. Prefer it everywhere.
- **Shopify killed admin-created custom apps on 2026-01-01.** There is no
  `shpat_` token to find. Apps live in the Dev Dashboard and you exchange a
  client id + secret for a 24-hour token via the client credentials grant. The
  app must be *installed* on the store or you get `app_not_installed`.
- **Shop metafields need no scopes at all** — read *or* write. Orders and
  products do (`read_orders`, `read_products`).
- **Node versions differ per tool.** `next` → 20. `wrangler` and
  `@shopify/cli` → 24.
- **`npm install` on macOS** strips Linux `libc: glibc` entries from
  `package-lock.json`. Revert rather than commit, or their Actions runner breaks.
- **Deploy means BOTH** Cloudflare projects, and build from a **git worktree**
  with production Square values inline — a worktree has no `.env.local`, which
  is the only reliable guard against shipping sandbox keys.

## Credentials

All in `~/.config/fusion-coffee/`, never in the repos:

| File | What |
|---|---|
| `shopify-lt-client` | Dev Dashboard client id + secret, and the store domain |
| `shopify-theme-token` | Theme Access token (`shptka_…`) |
| `cloudflare-client-token` | the client's Cloudflare API token |
| `square-access-token` | production Square |

`.dev.vars` (gitignored) holds the same plus `PARTY_FEED_SECRET` and a
sandbox-only `SQUARE_TAX_OBJECT_ID`.

> **Both Shopify credentials were pasted into a chat transcript and should be
> rotated.** Neither is known to have leaked; rotating is one click each.

---

## Still open

1. **Google Calendar setup** — code is written and deployed, but needs the Sheet
   tab `Bookings`, the Flow "Add row to spreadsheet" action, and the script
   pasted. See [party-calendar.md](party-calendar.md).
2. **Fusion reminders.** Little Town's are Shopify Flow workflows going to both
   businesses' staff inboxes. Fusion has no equivalent yet. Fusion bookings
   collect name and phone but **no email**, so anything customer-facing needs a
   new field or SMS; staff-facing does not.
3. **The Flow is armed but unproven.** The `Fusion Booking` workflow is on and
   configured, but no $295 order has exercised its Liquid yet. If the variable
   alias is wrong it fails silently — nothing is written and Fusion never finds
   out. Worth testing with one order.
4. **Splitting the $295.** Shopify can't: one bank account per account, no
   native split, Square isn't an available gateway. The workable path is
   Square's Invoices API with `automatic_payment_source: CARD_ON_FILE` — Fusion
   auto-invoices Little Town $175 per combo and Square charges their saved card
   on the due date. Needs both owners to agree.
5. **`read_orders`** would let tooling classify bookings by variant directly
   rather than inferring from the ledger.
