# Adding Fusion to Little Town's party calendar

Little Town already has a working Apps Script: it lives in a Sheet in the
`littletownplayhouse` account, reads the `LTPCAL1|` line out of Shopify's staff
order emails every 15 minutes, and puts each party on a **Little Town Parties**
calendar — coloured, with reminders, shared read-only to
`fusioncoffeellc@gmail.com`.

Fusion's own bookings don't come through Shopify, so they never appear. This
adds them as a third colour on the **same** calendar, reusing everything that
already works.

| Colour | Booking | Where it comes from |
|---|---|---|
| 🩷 Flamingo `4` | Little Town — $195 | Shopify order email |
| 🫐 Blueberry `9` | Little Town + Fusion — $295 | Shopify order email |
| 🌿 **Basil `10`** | **Fusion — $175** | **fusioncoffeeshop.com feed** |

---

## The one that would have bitten

`pruneCancelled_()` removes any future event whose `ltSlot` tag is no longer in
`LT_BOOKED_RAW` — the playhouse's availability list, which Flow maintains.

**Fusion bookings are not on that list.** They live in a separate metafield,
`lt_booking.fusion_taken`, because a Fusion booking takes the café and not the
playhouse. So a Fusion event carrying an `ltSlot` tag would look exactly like a
cancelled Little Town party, and prune would delete it within 15 minutes —
quietly, on a timer, with no error.

So Fusion events are deliberately created **without** `ltSlot`. Prune already
skips anything lacking that tag (`if (!slot) continue;`), so it leaves them
alone with no change to prune itself.

That's safe rather than lossy because Fusion is **all sales final** — there is
no cancellation path, so nothing ever needs pruning. If you later add refunds,
the fix is to extend prune to also read `LT_FUSION_TAKEN` from the parties page,
alongside `LT_BOOKED_RAW`.

## What changed in the script

Five additions, no deletions. Existing behaviour is untouched.

1. **`COLOR_FUSION_ONLY`** — Basil green, distinct from the two you have.
2. **`FUSION_FEED_URL` / `FUSION_FEED_SECRET`** — the private feed. Leave the
   secret blank and the whole Fusion half no-ops silently; Little Town keeps
   working exactly as now.
3. **`syncFusionBookings_()`** — fetches the feed, upserts each booking.
4. **One line in `syncNow_()`** to call it, and `added` now counts both.
5. **Three small edits to `upsertEvent_`, `colorFor_` and `buildTitle_`** to
   branch on `p.venue === 'fusion'`.

Everything else — timezone maths, dedupe by `ltOrderId`, reminders, the menu,
the backfill, the alert throttle — is reused as-is.

## Installing

1. Open the Sheet → **Extensions → Apps Script**
2. Replace the file with [`party-calendar-littletown.gs`](party-calendar-littletown.gs)
3. Set `FUSION_FEED_SECRET` to the value of `PARTY_FEED_SECRET` from
   Cloudflare Pages → `fusion-coffee` → Settings → Environment variables
4. Save, then run **`runSelfTest()`** from the editor, or use
   **🎉 Little Town → Check for new bookings now**

No re-authorisation needed: `UrlFetchApp` is already granted, since
`pruneCancelled_()` and `shareCalendarWith_()` both use it.

## Notes

**The secret lives in the littletown account.** That script can now read Fusion
customer names and phone numbers. Given the calendar is already shared between
the two businesses that's probably fine, but it is worth knowing rather than
discovering.

**Fusion's dedupe key** is `fusion-<square order id>`, which can't collide with
Little Town's Shopify order ids or the `backfill-` ones.

**If the feed is unreachable** the run logs it and carries on, so a Fusion
outage can never stop Little Town's bookings syncing.
