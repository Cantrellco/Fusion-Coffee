'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { site, partyBooking } from '@/lib/site';
import {
  buildMonth,
  bookingWindow,
  dateKey,
  formatPrice,
  freeSlots,
  longDateLabel,
  monthLabel,
  splitLedger,
  BOOKABLE_DOWS,
  PARTY_PRICE_CENTS,
  type DayCell,
  type PartySlot,
} from '@/lib/party';
import { ArrowUpRight } from '@/components/icons';

const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "Sat, Aug 15" — the compact form, for rows that sit in a narrow column. */
const shortDate = (d: Date) =>
  `${DOW_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;

/** How many windows the shortcut list offers before "or pick any date". */
const SHORTLIST = 6;

/** Monday-first grid, so cell columns 5 and 6 are Saturday and Sunday. */
const isWeekendCol = (index: number) => index % 7 >= 5;

type OpenWindow = { key: string; date: Date; label: string; slot: string };

type Selection = { key: string; date: Date; label: string };

/**
 * Animation here is pure CSS (`animate-month-in`, `animate-fade-up`), matching
 * the rest of the site. That means the global `prefers-reduced-motion` clamp in
 * globals.css disables all of it for free — no JS motion hook to keep in sync —
 * and /party's route JS stays near zero instead of carrying an animation
 * library for a month slide and a pill stagger.
 */
export default function PartyCalendar({
  /**
   * The shared availability ledger, in Little Town's metafield format
   * (`YYYY-MM-DD|slot;…`). Empty string = everything open. Once the Shopify
   * token lands this arrives from our Cloudflare Function instead of a prop.
   */
  ledgerRaw = '',
  /**
   * Square checkout handler. While it's absent the card falls back to a
   * pre-filled email request, the same graceful pattern the newsletter and
   * the old booking form use — the control always works on the static export.
   */
  onCheckout,
}: {
  ledgerRaw?: string;
  onCheckout?: (booking: { dateKey: string; slot: string; label: string }) => void;
}) {
  // `today` is resolved in an effect, never at render. The static export bakes
  // this component's HTML at BUILD time, so a render-time `new Date()` would
  // ship a frozen month to the live site and disagree with the client's first
  // paint — a hydration mismatch that also silently mis-states availability.
  // Until the effect runs we render the shell with no days in it.
  const [today, setToday] = useState<Date | null>(null);
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [direction, setDirection] = useState(1);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const timesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setToday(now);
    setView({ y: now.getFullYear(), m: now.getMonth() });
  }, []);

  // One string, two meanings: our own bookings take a single window, next
  // door's take the whole day. `splitLedger` separates them by the `|lt` marker.
  const { own: booked, cross: crossBooked } = useMemo(
    () => splitLedger(ledgerRaw),
    [ledgerRaw],
  );
  const range = useMemo(() => (today ? bookingWindow(today) : null), [today]);

  const cells: DayCell[] = useMemo(() => {
    if (!view || !range) return [];
    return buildMonth(view.y, view.m, booked, range.minDate, range.maxDate, crossBooked);
  }, [view, range, booked, crossBooked]);

  // How many grid rows the weekend field covers: down to the row holding the
  // month's last weekend day, and no further. Running it to the bottom of the
  // grid leaves a warm tail hanging under a month that ends on a weekday.
  const fieldRows = useMemo(() => {
    let last = -1;
    cells.forEach((cell, i) => {
      if (cell.date && isWeekendCol(i)) last = i;
    });
    return last < 0 ? 0 : Math.floor(last / 7) + 1;
  }, [cells]);

  /**
   * The next few windows actually on sale, walked forward from tomorrow across
   * however many months it takes to find them.
   *
   * This is what the times column holds before a date is picked. Most people
   * booking a party want the soonest free weekend, and making them find it by
   * paging a grid is work the page can do for them — one tap here sets the date
   * AND the window and jumps the board to that month, so the shortcut and the
   * calendar never disagree about what is selected.
   */
  const nextOpen: OpenWindow[] = useMemo(() => {
    if (!range) return [];
    const found: OpenWindow[] = [];
    const cursor = new Date(range.minDate);
    while (cursor <= range.maxDate && found.length < SHORTLIST) {
      if (BOOKABLE_DOWS.includes(cursor.getDay())) {
        const key = dateKey(cursor);
        for (const s of freeSlots(cursor.getDay(), key, booked, crossBooked)) {
          if (found.length >= SHORTLIST) break;
          const date = new Date(cursor);
          found.push({ key, date, label: longDateLabel(date), slot: s.label });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return found;
  }, [range, booked, crossBooked]);

  // Slots left on the selected day, recomputed from the ledger rather than
  // stored — so a refreshed ledger can retire a slot the customer is looking at.
  const openSlots: PartySlot[] = useMemo(() => {
    if (!selected) return [];
    return freeSlots(selected.date.getDay(), selected.key, booked, crossBooked);
  }, [selected, booked, crossBooked]);

  // If the chosen slot disappears from under us, drop it rather than letting
  // the summary advertise a window that is no longer for sale.
  useEffect(() => {
    if (slot && !openSlots.some((s) => s.label === slot)) setSlot(null);
  }, [slot, openSlots]);

  const canPageBack = useMemo(() => {
    if (!view || !today) return false;
    return view.y > today.getFullYear() || view.m > today.getMonth();
  }, [view, today]);

  const canPageForward = useMemo(() => {
    if (!view || !range) return false;
    const last = range.maxDate;
    return view.y < last.getFullYear() || view.m < last.getMonth();
  }, [view, range]);

  function page(step: 1 | -1) {
    if (!view) return;
    setDirection(step);
    const next = new Date(view.y, view.m + step, 1);
    setView({ y: next.getFullYear(), m: next.getMonth() });
  }

  /**
   * Below lg the times sit UNDER the board, off-screen at the moment a date is
   * tapped — so on a phone the tap reads as having done nothing at all. From lg
   * up both columns are on screen together and this must never fire.
   *
   * `block: 'nearest'` is the whole trick: it scrolls the MINIMUM distance that
   * brings the panel into view, so the board stays on screen above it instead
   * of being shoved off the top, and it does nothing once the panel already
   * fits — which is why calling it again when a window is chosen only moves the
   * page if the summary it just revealed actually needs the room. The panel's
   * `scroll-mb` keeps that bottom alignment clear of the floating tab bar.
   *
   * No `behavior` is passed on purpose: the scroll then follows the document's
   * own `scroll-behavior`, which globals.css already switches to `auto` under
   * prefers-reduced-motion.
   */
  function nudgeToTimes() {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return;
    requestAnimationFrame(() => timesRef.current?.scrollIntoView({ block: 'nearest' }));
  }

  function pickDay(cell: DayCell) {
    if (!cell.date || !cell.available) return;
    setSelected({ key: cell.key, date: cell.date, label: longDateLabel(cell.date) });
    setSlot(null);
    nudgeToTimes();
  }

  function pickSlot(label: string) {
    setSlot(label);
    nudgeToTimes();
  }

  /** One tap from the shortcut list: date, window, and the month it lives in. */
  function pickWindow(w: OpenWindow) {
    setDirection(1);
    setView({ y: w.date.getFullYear(), m: w.date.getMonth() });
    setSelected({ key: w.key, date: w.date, label: w.label });
    setSlot(w.slot);
    nudgeToTimes();
  }

  const ready = Boolean(selected && slot);
  const summaryText = ready ? `${selected!.label} · ${slot}` : '';

  // The month title sets the year a step quieter than the month — "August" is
  // what you're reading, "2026" is only ever a confirmation.
  const [monthName, yearName] = (view ? monthLabel(view.y, view.m) : ' ').split(' ');

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent('Party booking request');
    const body = encodeURIComponent(
      [
        `Window: ${summaryText}`,
        `Package: Private buyout — ${formatPrice(PARTY_PRICE_CENTS)}`,
        '',
        'Name:',
        'Phone:',
        'Approx. guests:',
        'Anything we should know:',
      ].join('\n'),
    );
    return `mailto:${site.email}?subject=${subject}&body=${body}`;
  }, [summaryText]);

  // 44px, not 40: these are the only controls on the board a thumb has to find
  // between two large tap fields. Disabled keeps its frame at a lower weight
  // rather than fading the whole control to 25% — a month header with one arrow
  // missing reads as broken, not as "you're at the start".
  const navCls =
    'flex h-11 w-11 shrink-0 items-center justify-center border border-ink/15 text-ink transition-[color,border-color,background-color] duration-300 ease-out-expo hover:border-brick hover:bg-brick hover:text-cream disabled:pointer-events-none disabled:border-ink/10 disabled:bg-transparent disabled:text-ink/20';

  const ctaCls =
    'group mt-7 flex w-full items-center justify-center gap-2.5 border border-transparent bg-brick px-7 py-4 text-sm font-medium tracking-wide text-cream transition-[color,background-color,box-shadow,transform] duration-300 ease-out-expo hover:bg-[#9b4128] hover:shadow-[0_12px_30px_-20px_rgba(120,80,40,0.55)] active:scale-[0.985] motion-reduce:active:scale-100';

  return (
    // No width cap of its own: /party gives this the right eight of twelve
    // columns at xl, and the board takes the width it is handed.
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-10">
      {/* ---------- Calendar ---------- */}
      <div className="lg:col-span-6 xl:col-span-7">
        {/* The cap only exists below xl, where this column is half the page and
            an uncapped card would inflate the aspect-square cells into 130px
            tiles. At xl the column is already the right size, so the card fills
            it and the cells land near 56px. The single-column stack runs to lg
            rather than md because at tablet widths a 12-column split squeezed
            the same cells to 40px — under the touch-target floor on the device
            most likely to be held. */}
        <div className="summer-card card-static relative max-w-[29rem] p-4 sm:p-7 xl:max-w-none">
          <span className="summer-rule" aria-hidden />

          {/* Month header. The hairline groups the nav with the title and
              separates both from the board — without it the arrows read as
              part of the first week. */}
          <div className="flex items-center justify-between gap-3 border-b border-ink/10 pb-5">
            <button
              type="button"
              onClick={() => page(-1)}
              disabled={!canPageBack}
              aria-label="Previous month"
              className={navCls}
            >
              <Chevron className="h-4 w-4 rotate-180" />
            </button>

            <p
              aria-live="polite"
              className="min-w-0 flex-1 text-center font-display text-[1.7rem] leading-none text-ink"
            >
              {monthName}{' '}
              {/* ink/55 is the floor here, not a taste call: at 27px this is
                  WCAG "large text", and anything lighter drops the year under
                  3:1 on cream. */}
              <span className="text-ink/55">{yearName}</span>
            </p>

            <button
              type="button"
              onClick={() => page(1)}
              disabled={!canPageForward}
              aria-label="Next month"
              className={navCls}
            >
              <Chevron className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6">
            {/* Weekday rail — Monday first, so Sat/Sun sit together at the end
                and the two bookable columns are one block instead of being split
                across opposite edges of every row. The indent cancels the
                trailing letter-space of `tracking-mega`, which otherwise parks
                each single letter half a space left of its column centre. */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5" aria-hidden>
              {DOW_LABELS.map((d, i) => (
                <span
                  key={i}
                  className={`py-1.5 text-center text-[0.68rem] font-semibold uppercase tracking-mega [text-indent:0.14em] ${
                    isWeekendCol(i) ? 'text-brick-deep' : 'text-ink-muted'
                  }`}
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Days. Keyed by month so paging remounts the grid and replays the
                slide; --slide-from carries which way the customer paged.

                The -m-2/p-2 pair leaves the clip box 8px larger than the grid
                without moving it: `overflow-hidden` clips at the padding edge,
                so this is what keeps the focus ring on a top- or edge-row day
                from being sheared off by the month-slide clip. */}
            <div className="mt-1 sm:mt-1.5">
              <div className="-m-2 overflow-hidden p-2">
                <div
                  key={view ? `${view.y}-${view.m}` : 'empty'}
                  style={{ '--slide-from': `${direction * 18}px` } as CSSProperties}
                  className="relative isolate grid animate-month-in grid-cols-7 gap-1 sm:gap-1.5"
                >
                  {/* The weekend field. Absolutely positioned, but PLACED by the
                      grid — so it spans the two weekend columns and the gutter
                      between them exactly, at any gap, with no width arithmetic
                      to keep in sync. Out of flow, so it doesn't displace a
                      single day cell; behind them (`-z-10` inside this grid's
                      own `isolate`), so an open day paints over it as an opening
                      in the column rather than a tile stuck on top. It lives
                      inside the keyed grid on purpose: the field belongs to the
                      month and slides in with it. */}
                  {fieldRows > 0 && (
                    <span
                      aria-hidden
                      className="weekend-field pointer-events-none absolute inset-0 -z-10 col-start-6 col-end-8 row-start-1"
                      style={{ gridRowEnd: fieldRows + 1 }}
                    />
                  )}

                  {cells.length === 0
                    ? // Shell that matches the real grid's height so the card
                      // doesn't jump when the effect resolves the month.
                      Array.from({ length: 35 }, (_, i) => (
                        <span key={`skeleton-${i}`} className="aspect-square" />
                      ))
                    : cells.map((cell) => (
                        <DayButton
                          key={cell.key}
                          cell={cell}
                          selected={selected?.key === cell.key}
                          onPick={pickDay}
                        />
                      ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink/10 pt-5 text-xs text-ink-muted">
            <LegendKey className="border border-ink/25 bg-cream" label="Open" />
            <LegendKey className="bg-brick" label="Your pick" />
            {/* Slashed, not just a fainter outline — against the weekend field
                an unfilled box reads identical to the "Open" key. Same
                `.day-slash` the cell itself draws, so the key can't drift. */}
            <LegendKey className="day-slash weekend-field border border-ink/10" label="Booked" />
          </div>

          <noscript>
            <p className="mt-5 text-sm leading-relaxed text-ink-muted">
              Booking online needs JavaScript — email{' '}
              <a href={`mailto:${site.email}`} className="text-brick-deep underline">
                {site.email}
              </a>{' '}
              and we&rsquo;ll get you booked.
            </p>
          </noscript>
        </div>
      </div>

      {/* ---------- Times + summary ---------- */}
      <div className="lg:col-span-6 lg:col-start-7 xl:col-span-5 xl:col-start-8">
        {/* The scroll margins keep nudgeToTimes() clear of the two floating
            chrome pieces it can land under — the header pill at the top, the
            tab bar at the bottom. */}
        {/* Deliberately not sticky. It was, when this column was the only thing
            to the right of the board; in the three-column band a stuck panel
            detaches from the row the moment the section reaches the top of the
            viewport, and the columns stop reading as one object. The section is
            barely taller than a viewport now, so there is nothing to keep. */}
        <div ref={timesRef} className="max-w-md scroll-mb-28 scroll-mt-24 xl:max-w-none">
          {!selected ? (
            /* Resting state. Not a placeholder and not a repeat of the offer
               table /party already sets in type to the left of this — the actual
               next windows on sale, each one tap from being the booking. */
            <div className="animate-fade-up">
              <p className="eyebrow text-brick">Next open windows</p>

              {nextOpen.length === 0 ? (
                <p className="mt-5 text-pretty text-sm leading-relaxed text-ink-muted">
                  Every window in the next six months is taken. Email{' '}
                  <a href={`mailto:${site.email}`} className="text-brick-deep underline">
                    {site.email}
                  </a>{' '}
                  and we&rsquo;ll find you a date.
                </p>
              ) : (
                <>
                  <ul className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
                    {nextOpen.map((w, i) => (
                      <li key={`${w.key}-${w.slot}`}>
                        <button
                          type="button"
                          onClick={() => pickWindow(w)}
                          aria-label={`Book ${w.label} at ${w.slot}`}
                          style={{ animationDelay: `${i * 55}ms` }}
                          className="group flex w-full animate-fade-up items-center justify-between gap-4 py-4 text-left"
                        >
                          <span className="font-display text-base text-ink transition-colors duration-300 ease-out-expo group-hover:text-brick-deep">
                            {shortDate(w.date)}
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="text-sm tabular-nums text-ink-muted transition-colors duration-300 ease-out-expo group-hover:text-brick-deep">
                              {w.slot}
                            </span>
                            <Chevron className="h-3.5 w-3.5 shrink-0 text-ink/30 transition-[color,transform] duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:text-brick" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-5 text-sm leading-relaxed text-ink-muted">
                    Or pick any open date on the calendar.
                  </p>
                </>
              )}
            </div>
          ) : (
            // Keyed by date so switching days replays the entrance rather than
            // silently swapping the text under the customer.
            <div key={selected.key} className="animate-fade-up">
              <p className="eyebrow text-brick">Available times</p>
              <p className="mt-3 font-display text-2xl leading-snug text-ink">
                {selected.label}
              </p>

              {openSlots.length === 0 ? (
                // Reachable: the ledger can retire this day's last window while
                // it sits selected on screen. Name what happened and what to do,
                // rather than showing an empty row of nothing.
                <p className="mt-6 text-sm leading-relaxed text-ink-muted">
                  This date has just been taken — pick another and we&rsquo;ll
                  get you in.
                </p>
              ) : (
                <div
                  role="group"
                  aria-live="polite"
                  aria-label={`Available times on ${selected.label}`}
                  className="mt-6 flex flex-wrap gap-2.5"
                >
                  {openSlots.map((s, i) => {
                    const active = slot === s.label;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => pickSlot(s.label)}
                        aria-pressed={active}
                        style={{ animationDelay: `${i * 70}ms` }}
                        className={`animate-fade-up min-h-11 border px-5 py-3 text-sm tabular-nums tracking-wide transition-colors duration-300 ease-out-expo ${
                          active
                            ? 'border-brick bg-brick text-cream'
                            : 'border-ink/20 bg-cream/70 text-ink hover:border-brick hover:bg-oak/20 hover:text-brick-deep'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Summary + CTA. A receipt, not an echo: the date and window are
                  labelled rows rather than the heading above repeated back as
                  one run-on line. */}
              {ready && (
                <div className="mt-8 animate-fade-up border border-ink/12 bg-cream p-6 sm:p-7">
                  <p className="eyebrow text-ink/45">Your party</p>

                  <dl className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
                    <div className="flex items-baseline justify-between gap-5 py-3.5">
                      <dt className="text-sm text-ink-muted">Date</dt>
                      {/* Short form: the full weekday-and-year label is already
                          the heading two lines up, and it overruns this column
                          at xl where the panel is the narrowest of the three. */}
                      <dd className="text-right font-display text-base tabular-nums text-ink">
                        {shortDate(selected.date)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-5 py-3.5">
                      <dt className="text-sm text-ink-muted">Window</dt>
                      <dd className="text-right font-display text-base tabular-nums text-ink">
                        {slot}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex items-baseline justify-between gap-5">
                    <span className="text-sm text-ink-muted">Private buyout</span>
                    <span className="font-display text-3xl tabular-nums text-ink">
                      {formatPrice(PARTY_PRICE_CENTS)}
                    </span>
                  </div>

                  {/* What the price actually buys, on the last panel before the
                      customer leaves to pay. */}
                  <p className="mt-4 text-pretty text-sm leading-relaxed text-ink-muted">
                    {partyBooking.staffing.line}
                  </p>

                  {onCheckout ? (
                    <button
                      type="button"
                      onClick={() =>
                        onCheckout({ dateKey: selected.key, slot: slot!, label: summaryText })
                      }
                      className={ctaCls}
                    >
                      <span>Continue to payment</span>
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  ) : (
                    <>
                      <a href={mailtoHref} className={ctaCls}>
                        <span>Request this window</span>
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                      <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
                        Card payment is being connected — for now this drafts
                        your request and we&rsquo;ll confirm the date by reply.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================

function DayButton({
  cell,
  selected,
  onPick,
}: {
  cell: DayCell;
  selected: boolean;
  onPick: (cell: DayCell) => void;
}) {
  if (!cell.date) return <span className="aspect-square" />;

  const base =
    'flex aspect-square items-center justify-center text-sm tabular-nums transition-colors duration-300 ease-out-expo';

  if (selected) {
    return (
      <button
        type="button"
        onClick={() => onPick(cell)}
        aria-pressed
        aria-label={longDateLabel(cell.date)}
        className={`${base} border border-brick bg-brick font-medium text-cream shadow-[0_10px_20px_-16px_rgba(120,80,40,0.9)]`}
      >
        {cell.day}
      </button>
    );
  }

  if (cell.available) {
    return (
      <button
        type="button"
        onClick={() => onPick(cell)}
        aria-pressed={false}
        aria-label={longDateLabel(cell.date)}
        className={`${base} border border-ink/25 bg-cream text-ink hover:border-brick hover:bg-oak/20 hover:text-brick-deep`}
      >
        {cell.day}
      </button>
    );
  }

  return (
    <span
      aria-label={cell.soldOut ? `${longDateLabel(cell.date)} — booked` : undefined}
      className={`${base} ${
        // Unavailable dates are dimmed, but they are still the only way to read
        // WHICH day a cell is — the previous ink/25 was a 2:1 grey that made the
        // month hard to count through. Dimmed enough to recede under the open
        // days, not so dim it stops being a date.
        cell.soldOut
          ? // A strikethrough on a numeral reads as a marked-down price. The
            // diagonal is the calendar convention and it is the one the legend
            // has always drawn.
            'day-slash border border-ink/10 text-ink/50'
          : 'text-ink/60'
      }`}
    >
      {cell.day}
    </span>
  );
}

function LegendKey({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3.5 w-3.5 ${className}`} aria-hidden />
      {label}
    </span>
  );
}

function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
