# One calendar, three colours

Puts every party on the shop's Google Calendar, colour-coded by which rooms it
takes:

| Colour | Booking | Sold on | Rooms taken |
|---|---|---|---|
| 🔵 Blue | Little Town — $195 | Little Town's Shopify | playhouse |
| 🟠 Orange | Little Town + Fusion — $295 | Little Town's Shopify | playhouse **and** café |
| 🟢 Green | Fusion — $175 | fusioncoffeeshop.com | café |

Two sources feed it. Little Town's bookings arrive in a Google Sheet, written by
a Shopify Flow action. Fusion's are pulled live from the site.

**Fusion is pulled, not pushed, on purpose.** The Apps Script already runs as the
shop's own Google user, so `CalendarApp` works with no service-account key
living in Cloudflare and nothing extra to rotate.

---

## 1. The Sheet

One tab named **`Bookings`**, with this header row:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Date | Slot | Package | Customer | Order | Total |

Example row:

```
2026-09-20 | 1:00–3:00 PM | Little Town + Fusion | Michaela Harrison | #1005 | 295.00
```

Only **Date**, **Slot** and **Package** are load-bearing. Package decides the
colour: anything containing "Fusion" is treated as the combo.

## 2. Shopify Flow → the Sheet

On the existing *Order created* workflow (or a new one), add an
**Add row to spreadsheet** action. Point it at the Sheet, tab `Bookings`, and
use this for **Row contents**:

```liquid
{%- assign pdate = "" -%}{%- assign ptime = "" -%}
{%- for lineItem in order.lineItems -%}
  {%- for ca in lineItem.customAttributes -%}
    {%- if ca.key == "Party date" -%}{%- assign pdate = ca.value -%}{%- endif -%}
    {%- if ca.key == "Party time" -%}{%- assign ptime = ca.value -%}{%- endif -%}
  {%- endfor -%}
{%- endfor -%}
{{ pdate }},{{ ptime }},{{ order.lineItems[0].variant.title }},{{ order.customer.displayName | replace: ",", " " }},{{ order.name }},{{ order.totalPrice }}
```

**Commas split columns**, which is why the customer name is passed through
`replace: ",", " "` — a name like "Smith, Jane" would otherwise shunt every
later column one to the right.

Add a condition so only buyouts get a row: **Order → Line items → Product →
Handle**, *includes*, `private-buyout`. Without it, every day pass and
membership lands on the calendar too.

## 3. The Apps Script

1. Open the Sheet → **Extensions → Apps Script**
2. Paste [`party-calendar.gs`](party-calendar.gs), replacing anything there
3. Fill in `CONFIG`:
   - `FUSION_FEED_SECRET` — the value of `PARTY_FEED_SECRET` from Cloudflare
     Pages → `fusion-coffee` → Settings → Environment variables
   - `CALENDAR_ID` — leave blank for the account's default calendar, or paste
     one from Calendar settings → Integrate calendar
4. Check **Project Settings → Time zone** is `America/Chicago`. Sheet rows carry
   a wall-clock time with no zone, so this is what anchors them.
5. Run **`setup()`** once and grant the permissions it asks for

That installs a 15-minute trigger and does a first sync immediately.

## Notes

**Re-running is safe.** Every event carries a hidden `[ltp:ORDERID]` tag in its
description, and the script checks for that tag before creating anything. A
booking cannot be added twice however often the trigger fires.

**It only looks forward.** Past dates are skipped, so switching it on won't
backfill months of history into the calendar.

**Fusion's feed is private.** Unlike `/api/party-availability`, which exposes
only dates and slots, `/api/party-bookings` returns customer names and phone
numbers. It requires the bearer token and refuses every request when the secret
is unset — an unconfigured feed must never mean an open one.

**If Fusion's half stops appearing**, check the execution log
(Apps Script → Executions). A non-200 from the feed is logged and skipped rather
than throwing, so Little Town's bookings keep syncing regardless.
