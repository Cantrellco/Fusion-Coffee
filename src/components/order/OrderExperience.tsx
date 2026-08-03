'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  orderMenu,
  formatCents,
  lineKey,
  type CartLine,
  type CartModifier,
  type OrderItem,
} from '@/lib/order';
import { ArrowUpRight, Close } from '@/components/icons';
import { CitrusSlice } from '@/components/Citrus';
import { specimenFor } from '@/components/SummerSpecimens';
import SquareCard from './SquareCard';

// ============================================================
// On-site ordering — the interactive heart of /order.
//
// Everything the customer touches (browse, customize, cart, tip, pickup)
// lives here on fusioncoffeeshop.com. The final "pay" step hands a compact
// order payload to a Cloudflare Pages Function (functions/api/checkout.ts),
// which is where Square's secret access token creates the real Order +
// Payment. Until the Square keys are wired in, the function replies
// "not configured" and the UI shows a clear, honest "ready for Square" state —
// so the whole flow is clickable today without taking a real card.
// ============================================================

const CART_KEY = 'fusion-cart-v1';
const TIP_OPTIONS = [0, 15, 18, 20];
const PICKUP_OPTIONS = [
  'As soon as possible',
  'In 30 minutes',
  'In 45 minutes',
  'In 1 hour',
];

// Public Square config (safe in the browser), baked at build from .env.local.
// When present, checkout shows Square's real card form; when absent, it falls
// back to the honest "payment isn't switched on yet" panel.
const SQ_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
const SQ_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
const SQ_ENV: 'sandbox' | 'production' =
  process.env.NEXT_PUBLIC_SQUARE_ENV === 'production' ? 'production' : 'sandbox';
const SQUARE_READY = Boolean(SQ_APP_ID && SQ_LOCATION_ID);

type CartState = { lines: CartLine[] };
type CartAction =
  | { type: 'hydrate'; lines: CartLine[] }
  | { type: 'add'; item: OrderItem; modifiers: CartModifier[] }
  | { type: 'inc'; key: string }
  | { type: 'dec'; key: string }
  | { type: 'remove'; key: string }
  | { type: 'clear' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'hydrate':
      return { lines: action.lines };
    case 'add': {
      const key = lineKey(action.item.id, action.modifiers);
      const existing = state.lines.find((l) => l.key === key);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.key === key ? { ...l, qty: l.qty + 1 } : l,
          ),
        };
      }
      const line: CartLine = {
        key,
        itemId: action.item.id,
        name: action.item.name,
        priceCents: action.item.priceCents,
        qty: 1,
        modifiers: action.modifiers.filter((m) => m.value && m.value !== 'None'),
        squareCatalogObjectId: action.item.squareCatalogObjectId ?? null,
      };
      return { lines: [...state.lines, line] };
    }
    case 'inc':
      return {
        lines: state.lines.map((l) =>
          l.key === action.key ? { ...l, qty: l.qty + 1 } : l,
        ),
      };
    case 'dec':
      return {
        lines: state.lines
          .map((l) => (l.key === action.key ? { ...l, qty: l.qty - 1 } : l))
          .filter((l) => l.qty > 0),
      };
    case 'remove':
      return { lines: state.lines.filter((l) => l.key !== action.key) };
    case 'clear':
      return { lines: [] };
    default:
      return state;
  }
}

type CheckoutStatus =
  | 'idle'
  | 'paying'
  | 'submitting'
  | 'not_configured'
  | 'placed'
  | 'error';

export default function OrderExperience() {
  const [state, dispatch] = useReducer(cartReducer, { lines: [] });
  const [tipPercent, setTipPercent] = useState(15);
  const [pickup, setPickup] = useState(PICKUP_OPTIONS[0]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // Mobile only: the cart lives in a bottom sheet opened from a floating bar.
  const [cartOpen, setCartOpen] = useState(false);

  // Hydrate from localStorage AFTER mount so the static export's first paint
  // matches the server-rendered empty cart (no hydration mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      if (raw) {
        const lines = JSON.parse(raw) as CartLine[];
        if (Array.isArray(lines)) dispatch({ type: 'hydrate', lines });
      }
    } catch {
      /* ignore malformed cache */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(state.lines));
    } catch {
      /* storage full / disabled — cart still works in-memory */
    }
  }, [state.lines]);

  // While the mobile cart sheet is open: lock body scroll, tuck the global
  // bottom tab bar away (reusing the same `body.sheet-open` hook the header
  // menu uses), and close on Escape. No-op on desktop (never opens there).
  useEffect(() => {
    if (!cartOpen) return;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sheet-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCartOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('sheet-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [cartOpen]);

  const subtotal = useMemo(
    () => state.lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0),
    [state.lines],
  );
  const tipCents = Math.round((subtotal * tipPercent) / 100);
  const dueCents = subtotal + tipCents;
  const itemCount = state.lines.reduce((n, l) => n + l.qty, 0);

  // "Continue to payment": if Square is wired up, reveal the card form;
  // otherwise fall back to the honest pre-launch panel.
  function beginCheckout() {
    if (itemCount === 0 || !name.trim()) return;
    setErrorMsg('');
    if (SQUARE_READY) {
      setStatus('paying');
    } else {
      void submitOrder();
    }
  }

  async function submitOrder(sourceId?: string) {
    if (itemCount === 0 || !name.trim()) return;
    setStatus('submitting');
    setErrorMsg('');
    const payload = {
      customerName: name.trim(),
      pickup,
      tipCents,
      subtotalCents: subtotal,
      sourceId,
      lines: state.lines.map((l) => ({
        itemId: l.itemId,
        name: l.name,
        qty: l.qty,
        priceCents: l.priceCents,
        modifiers: l.modifiers,
        squareCatalogObjectId: l.squareCatalogObjectId ?? null,
      })),
    };
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 501) {
        // Keys not set yet — the expected pre-launch state.
        setStatus('not_configured');
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `Checkout failed (${res.status})`);
      dispatch({ type: 'clear' });
      setCartOpen(false);
      setStatus('placed');
    } catch {
      if (sourceId) {
        // The card charge failed — keep them on the card form to retry.
        setErrorMsg('That payment did not go through. Please try again.');
        setStatus('paying');
      } else {
        // No function deployed (static preview) → same "not connected" state.
        setStatus('not_configured');
      }
    }
  }

  if (status === 'placed') {
    return (
      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto max-w-xl px-5 text-center sm:px-8">
          <p className="eyebrow justify-center text-brick-deep">Order received</p>
          <h2 className="mt-4 font-display text-fluid-xl text-ink">
            Thanks, {name.split(' ')[0] || 'friend'} — we&apos;re on it.
          </h2>
          <p className="mt-4 text-ink-muted">
            Your order is heading to the bar for {pickup.toLowerCase()}. Keep an
            eye on your phone for the ready text.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setName('');
            }}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brick px-7 py-3.5 text-sm font-medium text-cream transition-colors hover:bg-[#9b4128]"
          >
            Start another order
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-cream py-12 md:py-20">
      <div className="mx-auto grid max-w-edge gap-x-14 gap-y-10 px-5 sm:px-8 lg:grid-cols-12">
        {/* -------------------- MENU -------------------- */}
        {/* Bottom padding on mobile so the last items scroll clear of the
            floating "View order" bar + the global bottom tab bar. */}
        <div className="pb-28 lg:col-span-7 lg:pb-0 xl:col-span-8">
          <p className="eyebrow text-brick-deep">Build your order</p>

          <div className="mt-8 flex flex-col gap-12">
            {orderMenu.map((cat) => (
              <div key={cat.id}>
                {/* flex-wrap so the seasonal chip drops to its own line on a
                    phone instead of squeezing "Summer Drinks" into two lines. */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-ink/15 pb-3">
                  <h2 className="font-display text-2xl text-ink md:text-3xl">
                    {cat.heading}
                  </h2>
                  {/* Seasonal sections wear the same citrus "Limited time" chip
                      the /menu Summer header does, so the two pages read as one
                      menu; everything else keeps the plain note (e.g. 6–11am). */}
                  {cat.note &&
                    (cat.seasonal ? (
                      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-oak/45 bg-cream-deep px-3 py-1">
                        <CitrusSlice className="h-3.5 w-3.5 shrink-0 text-terracotta" />
                        <span className="text-xs uppercase tracking-mega text-brick-deep">
                          {cat.note}
                        </span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs uppercase tracking-mega text-ink-muted">
                        {cat.note}
                      </span>
                    ))}
                </div>
                <div className="mt-4 flex flex-col divide-y divide-ink/10">
                  {cat.items.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      onAdd={(modifiers) => dispatch({ type: 'add', item, modifiers })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -------------------- CART -------------------- */}
        {/* Mobile: a floating summary bar opens the cart as a bottom sheet, so
            ordering has a proper mobile surface instead of a panel stranded
            under a long menu. Desktop: a sticky right-column aside whose item
            list scrolls INSIDE the panel, so the checkout button never leaves
            the viewport. Both share the ONE cart body below (single Square card
            container, no duplicate ids). */}
        {itemCount > 0 && !cartOpen && (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-haspopup="dialog"
            className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-full bg-brick px-5 py-3.5 text-cream shadow-lg shadow-black/30 transition-transform active:scale-[0.99] motion-reduce:active:scale-100 lg:hidden"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-cream/20 px-1.5 text-xs tabular-nums">
                {itemCount}
              </span>
              View order
            </span>
            <span className="text-sm font-semibold tabular-nums">{formatCents(dueCents)}</span>
          </button>
        )}

        {/* Scrim behind the mobile sheet */}
        <div
          aria-hidden
          onClick={() => setCartOpen(false)}
          className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ease-out-expo motion-reduce:transition-none lg:hidden ${
            cartOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />

        <aside
          id="cart"
          role="dialog"
          aria-label="Your order"
          aria-modal={cartOpen ? true : undefined}
          className={`z-50 flex max-h-[86vh] flex-col overflow-hidden border-ink/10 bg-cream-deep fixed inset-x-0 bottom-0 rounded-t-2xl border-t shadow-[0_-18px_60px_rgba(0,0,0,0.4)] transition-transform duration-300 ease-out-expo motion-reduce:transition-none ${
            cartOpen ? 'translate-y-0' : 'translate-y-full'
          } lg:sticky lg:top-24 lg:col-span-5 lg:inset-x-auto lg:bottom-auto lg:max-h-[calc(100vh-7rem)] lg:translate-y-0 lg:self-start lg:rounded-2xl lg:border lg:shadow-none xl:col-span-4`}
        >
          {/* Header — does not scroll */}
          <div className="flex-none border-b border-ink/10 px-6 py-4 lg:py-5">
            <div aria-hidden className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-ink/15 lg:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink">Your order</h2>
                <p className="mt-1 text-sm text-ink-muted">Pickup at 207 East Main St.</p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close order"
                className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/10 hover:text-ink lg:hidden"
              >
                <Close className="h-5 w-5" />
              </button>
            </div>
          </div>

          {state.lines.length === 0 ? (
            <p className="flex-1 px-6 py-12 text-center text-ink-muted">
              Your cart is empty. Add something tasty from the menu.
            </p>
          ) : (
            <>
              {/* Scrollable middle: items + tip + name + pickup + totals */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
                <ul className="flex flex-col divide-y divide-ink/10">
                  {state.lines.map((line) => (
                    <li key={line.key} className="flex gap-3 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg leading-tight text-ink">
                          {line.name}
                        </p>
                        {line.modifiers.length > 0 && (
                          <p className="mt-0.5 text-sm text-ink-muted">
                            {line.modifiers.map((m) => m.value).join(' · ')}
                          </p>
                        )}
                        <div className="mt-2 inline-flex items-center gap-3 rounded-full border border-ink/15 px-1">
                          <button
                            type="button"
                            aria-label={`Remove one ${line.name}`}
                            onClick={() => dispatch({ type: 'dec', key: line.key })}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-ink transition-colors hover:bg-ink/10"
                          >
                            −
                          </button>
                          <span className="min-w-4 text-center text-sm tabular-nums text-ink">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            aria-label={`Add one ${line.name}`}
                            onClick={() => dispatch({ type: 'inc', key: line.key })}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-ink transition-colors hover:bg-ink/10"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm tabular-nums text-ink">
                          {formatCents(line.priceCents * line.qty)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${line.name}`}
                          onClick={() => dispatch({ type: 'remove', key: line.key })}
                          className="text-ink-muted transition-colors hover:text-brick"
                        >
                          <Close className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Tip */}
                <div className="mt-1 border-t border-ink/10 pt-5">
                  <p className="text-sm font-medium text-ink">Add a tip</p>
                  <div className="mt-2 flex gap-2">
                    {TIP_OPTIONS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setTipPercent(pct)}
                        className={`flex-1 rounded-full border px-2 py-2 text-sm tabular-nums transition-colors ${
                          tipPercent === pct
                            ? 'border-brick bg-brick text-cream'
                            : 'border-ink/15 text-ink hover:border-ink/40'
                        }`}
                      >
                        {pct === 0 ? 'None' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name + pickup */}
                <div className="mt-5 flex flex-col gap-3">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Name for the order</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="First name"
                      className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brick"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Pickup</span>
                    <select
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2.5 text-ink outline-none transition-colors focus:border-brick"
                    >
                      {PICKUP_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Totals */}
                <dl className="mt-5 flex flex-col gap-1.5 border-t border-ink/10 pt-4 text-sm">
                  <div className="flex justify-between text-ink-muted">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{formatCents(subtotal)}</dd>
                  </div>
                  {tipCents > 0 && (
                    <div className="flex justify-between text-ink-muted">
                      <dt>Tip ({tipPercent}%)</dt>
                      <dd className="tabular-nums">{formatCents(tipCents)}</dd>
                    </div>
                  )}
                  <div className="mt-1 flex justify-between border-t border-ink/10 pt-2 font-medium text-ink">
                    <dt>Due at checkout</dt>
                    <dd className="tabular-nums">{formatCents(dueCents)}</dd>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    Sales tax is added on the payment step.
                  </p>
                </dl>
              </div>

              {/* Pinned footer — the primary action stays visible while the
                  middle scrolls. Extra bottom padding clears the phone's home
                  indicator when this is a sheet. */}
              <div className="flex-none border-t border-ink/10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-4">
                {status === 'not_configured' ? (
                  <div className="rounded-lg border border-oak/60 bg-oak/15 px-4 py-4 text-sm text-ink">
                    <p className="font-medium">Almost there — payment isn&apos;t switched on yet.</p>
                    <p className="mt-1 text-ink-muted">
                      The order flow is ready; the last step (Square taking the
                      card) turns on once the shop&apos;s Square keys are connected.
                      Your cart is saved.
                    </p>
                  </div>
                ) : status === 'paying' ? (
                  <div className="animate-fade-up motion-reduce:animate-none">
                    <SquareCard
                      appId={SQ_APP_ID as string}
                      locationId={SQ_LOCATION_ID as string}
                      env={SQ_ENV}
                      amountLabel={formatCents(dueCents)}
                      onPaid={(sourceId) => submitOrder(sourceId)}
                      onError={(m) => setErrorMsg(m)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setStatus('idle');
                      }}
                      className="mt-3 w-full text-center text-xs text-ink-muted underline underline-offset-2 transition-colors hover:text-ink"
                    >
                      Back to order
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={beginCheckout}
                    disabled={status === 'submitting' || !name.trim()}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-brick py-4 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-[#9b4128] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {status === 'submitting'
                      ? 'Processing…'
                      : `Continue to payment · ${formatCents(dueCents)}`}
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                )}
                {!name.trim() &&
                  status !== 'not_configured' &&
                  status !== 'paying' && (
                    <p className="mt-2 text-center text-xs text-ink-muted">
                      Add a name to continue.
                    </p>
                  )}
                {errorMsg && (
                  <p className="mt-2 text-center text-xs text-brick">{errorMsg}</p>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

// ---- One menu row: name, price, optional drink customizations, Add ----

function MenuItemRow({
  item,
  onAdd,
}: {
  item: OrderItem;
  onAdd: (modifiers: CartModifier[]) => void;
}) {
  // Selected modifier values default to the first option of each group.
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    Object.fromEntries((item.modifiers ?? []).map((g) => [g.id, g.options[0]])),
  );
  const [justAdded, setJustAdded] = useState(false);
  // The item's hand-drawn specimen sketch, matched by exact name — the same
  // drawings the /menu summer cards carry. null for everything unillustrated,
  // which is every regular-menu item today.
  const specimen = specimenFor(item.name);

  function add() {
    const modifiers: CartModifier[] = (item.modifiers ?? []).map((g) => ({
      groupId: g.id,
      label: g.label,
      value: selection[g.id] ?? g.options[0],
    }));
    onAdd(modifiers);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1100);
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 py-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {/* On /menu these sketches sit behind the card as faint watermarks; in
            a dense order list they earn their keep as a small legible mark that
            identifies the drink at a glance. Decorative — the name is the
            accessible label, so the wrapper stays aria-hidden. */}
        {specimen && (
          <span
            aria-hidden
            className="mt-0.5 h-10 w-10 shrink-0 opacity-90 sm:h-11 sm:w-11"
          >
            {specimen}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-xl text-ink">{item.name}</h3>
            <span className="text-sm tabular-nums text-ink-muted">
              {formatCents(item.priceCents)}
            </span>
          </div>
          {item.description && (
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">
              {item.description}
            </p>
          )}
          {item.modifiers && item.modifiers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.modifiers.map((group) => (
                <label
                  key={group.id}
                  className="inline-flex items-center gap-1.5"
                >
                  <span className="sr-only">{group.label}</span>
                  <select
                    value={selection[group.id]}
                    onChange={(e) =>
                      setSelection((s) => ({ ...s, [group.id]: e.target.value }))
                    }
                    aria-label={`${group.label} for ${item.name}`}
                    className="rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-xs text-ink outline-none transition-colors focus:border-brick"
                  >
                    {group.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {group.label === 'Flavor' && opt !== 'None'
                          ? `+ ${opt}`
                          : opt}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={add}
        className={`shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
          justAdded
            ? 'border-sage bg-sage text-cream'
            : 'border-ink/20 text-ink hover:border-brick hover:bg-brick hover:text-cream'
        }`}
      >
        {justAdded ? 'Added ✓' : 'Add'}
      </button>
    </div>
  );
}
