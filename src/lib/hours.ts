// ============================================================
// Shop hours — the single source of truth for "is Fusion open right now?".
//
// This lives in its own dependency-free module because BOTH sides need it:
//   • the browser — the "Open now / Closed" pill and the /order checkout gate
//   • the server — functions/api/checkout.ts imports this directly and refuses
//     to create an order or take a card outside these hours.
// The browser gate is a courtesy (it can be bypassed by POSTing the API
// directly); the server one is the rule. Same table, same math, so the two can
// never disagree.
//
// Keep this file free of React/Next imports — it gets bundled into the
// Cloudflare Worker.
//
// Every calculation is done in the SHOP's timezone, never the visitor's.
// ============================================================

/** IANA zone for the shop. Re-exported as `site.timezone`. */
export const TIMEZONE = 'America/Chicago';

export type DayHours = {
  day: string;
  short: string;
  /** 12-hour clock string, e.g. "6:00 AM". null = closed all day. */
  open: string | null;
  close: string | null;
};

// Mon–Fri 6:00 AM – 6:00 PM, Sat 6:00 AM – 4:00 PM, Sunday closed.
// Verified against the shop's live Google/Yelp listings (June 2026).
// Editing this table changes the pill, the JSON-LD, the hours list AND what
// the checkout function will accept — all at once, on purpose.
export const hours: DayHours[] = [
  { day: 'Monday', short: 'Mon', open: '6:00 AM', close: '6:00 PM' },
  { day: 'Tuesday', short: 'Tue', open: '6:00 AM', close: '6:00 PM' },
  { day: 'Wednesday', short: 'Wed', open: '6:00 AM', close: '6:00 PM' },
  { day: 'Thursday', short: 'Thu', open: '6:00 AM', close: '6:00 PM' },
  { day: 'Friday', short: 'Fri', open: '6:00 AM', close: '6:00 PM' },
  { day: 'Saturday', short: 'Sat', open: '6:00 AM', close: '4:00 PM' },
  { day: 'Sunday', short: 'Sun', open: null, close: null },
];

// "6:00 AM" / "4:00 PM" -> minutes past midnight (e.g. 360 / 960).
export function parseClock(t: string): number {
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

// "6:00 AM" -> "06:00", "6:00 PM" -> "18:00" — the 24h form Schema.org wants.
export function to24h(t: string): string {
  const mins = parseClock(t);
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// "6:00 PM" -> "6pm", "6:30 AM" -> "6:30am" — compact for the pill.
function compactClock(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return t.toLowerCase();
  const min = m[2] === '00' ? '' : `:${m[2]}`;
  return `${parseInt(m[1], 10)}${min}${m[3].toLowerCase()}`;
}

export type OpenStatus = {
  open: boolean;
  /** Short status line, e.g. "Open now · closes 6pm" or "Closed · opens 6am". */
  label: string;
};

/**
 * Resolve open/closed for a given shop-local weekday + minute-of-day. Pure, so
 * callers can feed it any "now" and stay trivial. When closed, it points at the
 * next opening so the answer always includes "...so when?".
 */
export function openStatusFor(weekday: string, minutesNow: number): OpenStatus {
  const today = hours.find((h) => h.day === weekday);

  if (today?.open && today.close) {
    const open = parseClock(today.open);
    const close = parseClock(today.close);
    if (minutesNow >= open && minutesNow < close) {
      return { open: true, label: `Open now · closes ${compactClock(today.close)}` };
    }
    if (minutesNow < open) {
      return { open: false, label: `Closed · opens ${compactClock(today.open)}` };
    }
  }

  // Closed for the day (already past close, or a no-hours day like Sunday).
  // Walk forward to the next day that has opening hours.
  const idx = hours.findIndex((h) => h.day === weekday);
  for (let step = 1; step <= 7; step += 1) {
    const next = hours[(idx + step) % 7];
    if (next?.open) {
      const when = step === 1 ? 'tomorrow' : next.short;
      return { open: false, label: `Closed · opens ${when} ${compactClock(next.open)}` };
    }
  }
  return { open: false, label: 'Closed' };
}

/**
 * "Now" as the shop experiences it — weekday name + minutes past midnight in
 * TIMEZONE, whatever clock the browser or the Worker happens to be set to.
 * Intl with a timeZone is supported in browsers and on the Workers runtime.
 */
export function nowInShop(): { weekday: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // some engines emit "24" at midnight under hour12:false
  return { weekday: get('weekday'), minutes: hour * 60 + parseInt(get('minute'), 10) };
}

/** Open/closed right this second, in shop time. The one call both sides make. */
export function shopOpenStatus(): OpenStatus {
  const { weekday, minutes } = nowInShop();
  return openStatusFor(weekday, minutes);
}
