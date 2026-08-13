// ============================================================
// Party booking — slots, the shared availability ledger, and the
// availability math behind /party's calendar.
//
// Fusion books instant, paid in full, all sales final. The café can
// also be booked from NEXT DOOR: Little Town Playhouse sells a
// "Little Town + Fusion" buyout on their Shopify store, which occupies
// this room for the same window. So availability is not ours alone.
//
// THE SHARED LEDGER
// Little Town already keeps a plain-text shop metafield, `lt_booking.taken`,
// written by a Shopify Flow workflow on every order and read by their
// storefront calendar. Format (their `main` branch, assets/js/main.js):
//
//     2026-06-13|4:30–6:30 PM;2026-06-14|1:00–3:00 PM
//
// date `|` slot, entries joined by `;`. We speak the same format so the two
// calendars can read each other's writes without a translation layer.
//
// TWO LEDGERS, NOT ONE. A Fusion-only party occupies the café but NOT the
// playhouse, so it must block Little Town's $295 combo package while leaving
// their $185 playhouse-only buyout on sale. Writing to `lt_booking.taken`
// would grey out the whole date over there and lose them a sale. Fusion
// therefore reads and writes a SECOND metafield:
//
//     lt_booking.taken        → playhouse occupied  (theirs; we ignore it)
//     lt_booking.fusion_taken → café occupied       (ours; they read it to
//                               disable only the combo package)
//
// The en-dash in the slot labels is load-bearing — it is what their parser
// stored and what their Flow Liquid carries through. Do not retype these as
// hyphens.
// ============================================================

export type PartySlot = {
  /** Ledger + display label, e.g. "3:00–5:00 PM". En-dash, not a hyphen. */
  label: string;
  start: string;
  end: string;
};

/**
 * Bookable windows keyed by `Date#getDay()` — 0 = Sunday, 6 = Saturday.
 * The café hosts on the days it is otherwise quietest: Saturday after
 * regular service, and Sunday, when the shop is closed.
 *
 * DELIBERATELY IDENTICAL to Little Town's `SLOTS_BY_DOW` (their assets/js/main.js).
 * The two venues sell the same room from two storefronts, and until 2026-08-13
 * their windows only partly overlapped — Fusion's Saturday 3–5 caught their
 * 4:30–6:30 by thirty minutes. Aligning them means a booking on either side
 * names the same window with the same string, which is what lets the shared
 * ledger stay a plain text list instead of needing interval arithmetic.
 *
 * If these ever diverge again, the cross-venue block silently degrades: the
 * day-level guard in `freeSlots` still prevents a double sale, but partly-free
 * days stop being sellable. Change both sides together.
 */
export const SLOTS_BY_DOW: Record<number, PartySlot[]> = {
  6: [{ label: '4:30–6:30 PM', start: '4:30 PM', end: '6:30 PM' }],
  0: [
    { label: '1:00–3:00 PM', start: '1:00 PM', end: '3:00 PM' },
    { label: '4:00–6:00 PM', start: '4:00 PM', end: '6:00 PM' },
  ],
};

/**
 * Price of a Fusion buyout, in cents. One flat rate, any window.
 *
 * Matches Fusion's share of Little Town's $295 "Little Town + Fusion" combo, so
 * the café is worth the same whichever storefront sold it.
 */
export const PARTY_PRICE_CENTS = 17500;

/** Bookable days, in `getDay()` order, for rendering legends and copy. */
export const BOOKABLE_DOWS = [6, 0];

/** How far ahead the calendar will page. Mirrors Little Town's ~6 months. */
export const MAX_MONTHS_AHEAD = 6;

// ============================================================
// Ledger
// ============================================================

/** `{ "2026-06-13": ["3:00–5:00 PM"] }` */
export type BookedMap = Record<string, string[]>;

/**
 * Parse the shared metafield string into a date → taken-slots map.
 *
 * Deliberately forgiving in the same places Little Town's parser is: it
 * splits on `;` OR newlines, trims each side, and drops entries with no
 * date. A malformed ledger must degrade to "fewer things look booked",
 * never to a thrown error that blanks the whole calendar — the calendar
 * still refuses to over-book because the server re-checks at purchase.
 */
export function parseLedger(raw: string | null | undefined): BookedMap {
  const map: BookedMap = {};
  if (typeof raw !== 'string' || !raw) return map;
  for (const entry of raw.split(/[;\n]+/)) {
    const [rawDate, rawSlot] = entry.split('|');
    const date = (rawDate ?? '').trim();
    if (!date) continue;
    (map[date] ??= []).push((rawSlot ?? '').trim());
  }
  return map;
}

/**
 * Marks a ledger entry as written by Little Town rather than by us.
 *
 * Both sources share one metafield, but they mean different things: a Fusion
 * booking takes ONE window (so the café can still host the other Sunday slot),
 * while a "Little Town + Fusion" combo next door takes the whole day. Without a
 * marker the two are indistinguishable and we would have to over-block every
 * entry, throwing away the second Sunday window on our own bookings.
 *
 * It rides as an optional THIRD pipe-delimited field:
 *
 *     2026-09-13|1:00–3:00 PM        ← ours, blocks that window
 *     2026-09-13|1:00–3:00 PM|lt     ← next door's, blocks the day
 *
 * Backward compatible on purpose: Little Town's existing parser reads only
 * fields [0] and [1], so a third field is silently ignored over there.
 */
export const CROSS_MARKER = 'lt';

/**
 * Split the shared ledger into our bookings and next door's.
 *
 * Anything carrying the marker is treated as cross-venue; everything else is
 * ours. Unmarked is the safe default for OUR side because an unmarked entry
 * only blocks a single window — mistaking next-door's entry for ours would
 * under-block, so the marker is what Flow must be configured to write.
 */
export function splitLedger(raw: string | null | undefined): {
  own: BookedMap;
  cross: BookedMap;
} {
  const own: BookedMap = {};
  const cross: BookedMap = {};
  if (typeof raw !== 'string' || !raw) return { own, cross };

  for (const entry of raw.split(/[;\n]+/)) {
    const parts = entry.split('|');
    const date = (parts[0] ?? '').trim();
    if (!date) continue;
    const slot = (parts[1] ?? '').trim();
    const target = (parts[2] ?? '').trim().toLowerCase() === CROSS_MARKER ? cross : own;
    (target[date] ??= []).push(slot);
  }
  return { own, cross };
}

/** Serialize back to the metafield string. Sorted so writes are stable. */
export function serializeLedger(map: BookedMap): string {
  return Object.keys(map)
    .sort()
    .flatMap((date) => map[date].map((slot) => `${date}|${slot}`))
    .join(';');
}

/** Append one booking, returning a new map. Idempotent on exact duplicates. */
export function addBooking(map: BookedMap, dateKey: string, slot: string): BookedMap {
  const existing = map[dateKey] ?? [];
  if (existing.includes(slot)) return map;
  return { ...map, [dateKey]: [...existing, slot] };
}

// ============================================================
// Dates
// ============================================================

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` in LOCAL time. Never `toISOString()` — that shifts the day. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/** "Saturday, June 13, 2026" — the human half of the order's line item. */
export function longDateLabel(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ============================================================
// Availability
// ============================================================

/**
 * Which slots are still open on a given date.
 *
 * Single-slot days (Saturday) are treated as fully booked the moment ANYTHING
 * is stored against that date, rather than matching the exact time wording.
 * Little Town's engine does the same, for a reason worth keeping: if the slot
 * time is ever edited, a label mismatch would silently un-book a party that
 * has already been paid for. Matching on the date alone fails safe.
 */
export function freeSlots(
  dow: number,
  key: string,
  booked: BookedMap,
  crossBooked?: BookedMap,
): PartySlot[] {
  const all = SLOTS_BY_DOW[dow] ?? [];
  if (all.length === 0) return [];

  // Cross-venue bookings block at DAY granularity, not slot. Fusion's windows
  // and Little Town's don't line up — Fusion's Saturday 3–5 overlaps their
  // 4:30–6:30 by thirty minutes, Sunday 12–2 overlaps their 1–3 by an hour —
  // so a slot-level compare would need interval math and would still leave
  // half-usable windows on sale. Over-blocking the whole date is the deliberate
  // call: with all sales final, selling the room twice is unrecoverable, and
  // losing one window on a rare double-booked weekend is not.
  if (crossBooked && (crossBooked[key]?.length ?? 0) > 0) return [];

  const taken = booked[key] ?? [];
  if (all.length === 1) return taken.length ? [] : all;
  return all.filter((slot) => !taken.includes(slot.label));
}

export type DayCell = {
  /** `null` renders an empty leading/trailing grid cell. */
  date: Date | null;
  key: string;
  day: number;
  /** A bookable weekend day, in range, with at least one slot left. */
  available: boolean;
  /** A bookable weekend day whose slots are all gone. */
  soldOut: boolean;
};

/**
 * Build one month's grid, Monday-first.
 *
 * Monday-first is not cosmetic here: it puts Saturday and Sunday adjacent in
 * the last two columns, so the only bookable days in the whole month read as
 * one block instead of being split across opposite edges of each row.
 */
export function buildMonth(
  year: number,
  month: number,
  booked: BookedMap,
  minDate: Date,
  maxDate: Date,
  crossBooked?: BookedMap,
): DayCell[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay() is Sunday-first; shift so Monday === 0.
  const lead = (first.getDay() + 6) % 7;

  const cells: DayCell[] = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ date: null, key: `lead-${i}`, day: 0, available: false, soldOut: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const dow = date.getDay();
    const bookable = BOOKABLE_DOWS.includes(dow);
    const inRange = date >= minDate && date <= maxDate;
    const open =
      bookable && inRange ? freeSlots(dow, key, booked, crossBooked).length > 0 : false;

    cells.push({
      date,
      key,
      day,
      available: open,
      soldOut: bookable && inRange && !open,
    });
  }

  return cells;
}

/** Earliest bookable date: tomorrow. Matches Little Town — no same-day parties. */
export function bookingWindow(today: Date): { minDate: Date; maxDate: Date } {
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 1);
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD + 1, 0);
  maxDate.setHours(23, 59, 59, 999);

  return { minDate, maxDate };
}

export function formatPrice(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

// ============================================================
// Server-side validation
//
// The browser decides what to OFFER; this decides what may be SOLD. Everything
// below runs in the Cloudflare Function on a payload that a hand-rolled POST
// could have written, so nothing here may trust the client — not the price, not
// the slot, not whether the date is even one we host on.
// ============================================================

/** The shop's wall-clock timezone. Matches TIMEZONE in hours.ts. */
const SHOP_TZ = 'America/Chicago';

/**
 * `YYYY-MM-DD` for "today" where the café actually is.
 *
 * Workers run in UTC, so a plain `new Date()` rolls the calendar over at 7pm
 * Chicago time and would start refusing tomorrow's bookings an evening early.
 * `en-CA` formats as YYYY-MM-DD, which is exactly the ledger's key format.
 */
export function shopTodayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Weekday for a `YYYY-MM-DD` key, 0=Sunday.
 *
 * Built through `Date.UTC` so the answer never depends on the server's zone —
 * `new Date('2026-08-15')` is UTC midnight, which is the 14th in Chicago, and
 * would report the wrong day for exactly the Saturday we sell.
 */
export function dowOf(dateKey: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  // Rejects impossible dates that Date happily rolls over (e.g. 2026-02-31).
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt.getUTCDay();
}

/**
 * How far a UTC instant is from the shop's wall clock, in ms.
 *
 * Formats the instant AS Chicago time, reads those numbers back as if they
 * were UTC, and takes the difference. That is the offset in effect on that
 * date, so it handles CDT/CST without a timezone library — which matters,
 * because Workers ship no tz database beyond Intl.
 */
function shopOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});

  const asIfUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // Chicago never hits 24, but Intl can emit "24" for midnight in some
    // engines; normalising keeps the arithmetic honest either way.
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asIfUTC - instant.getTime();
}

/** "2:00 PM" → 14 * 60. Returns null on anything it doesn't recognise. */
function minutesFromClock(clock: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

/**
 * RFC3339 instant for a slot's START, which Square requires on a SCHEDULED
 * pickup (`A SCHEDULED pickup must have a pickup_at time.`).
 *
 * The slot times are the café's WALL CLOCK — "3:00 PM" means three in the
 * afternoon in Fairfield, not UTC. Workers run in UTC, so writing the naive
 * time would put every party on the order five or six hours early.
 *
 * Two passes: guess the instant assuming the offset at that wall time, then
 * recompute the offset AT that instant and correct. One correction is enough
 * for every real case; the second pass only matters for slots inside a DST
 * transition, and these are weekend afternoons, so it is belt and braces.
 */
export function slotStartISO(dateKey_: string, slot: PartySlot): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey_);
  const mins = minutesFromClock(slot.start);
  if (!m || mins === null) return null;

  const naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0) + mins * 60_000;
  let instant = naive - shopOffsetMs(new Date(naive));
  instant = naive - shopOffsetMs(new Date(instant));

  return new Date(instant).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export type BookingCheck =
  | { ok: true; slot: PartySlot }
  | { ok: false; reason: 'bad_date' | 'not_bookable_day' | 'bad_slot' | 'too_soon' | 'too_far' | 'slot_taken' };

/**
 * The one gate every sale passes through.
 *
 * `ledger` is the parsed shared availability map. Pass it only when it was
 * actually retrieved — a caller that could not reach the ledger must refuse the
 * sale outright rather than calling this with `{}`, which would read as
 * "nothing is booked" and put a taken room back on sale.
 */
export function validateBooking(
  dateKey_: string,
  slotLabel: string,
  ledger: BookedMap,
): BookingCheck {
  const dow = dowOf(dateKey_);
  if (dow === null) return { ok: false, reason: 'bad_date' };

  const slots = SLOTS_BY_DOW[dow] ?? [];
  if (!slots.length) return { ok: false, reason: 'not_bookable_day' };

  const slot = slots.find((s) => s.label === slotLabel);
  if (!slot) return { ok: false, reason: 'bad_slot' };

  // String compare is safe and exact here: both sides are YYYY-MM-DD, which
  // sorts lexicographically in date order.
  const today = shopTodayKey();
  if (dateKey_ <= today) return { ok: false, reason: 'too_soon' };

  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + MAX_MONTHS_AHEAD + 1);
  if (dateKey_ > dateKey(horizon)) return { ok: false, reason: 'too_far' };

  if (!freeSlots(dow, dateKey_, ledger).some((s) => s.label === slotLabel)) {
    return { ok: false, reason: 'slot_taken' };
  }

  return { ok: true, slot };
}
