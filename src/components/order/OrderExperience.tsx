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

type CheckoutStatus = 'idle' | 'submitting' | 'not_configured' | 'placed' | 'error';

export default function OrderExperience() {
  const [state, dispatch] = useReducer(cartReducer, { lines: [] });
  const [tipPercent, setTipPercent] = useState(15);
  const [pickup, setPickup] = useState(PICKUP_OPTIONS[0]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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

  const subtotal = useMemo(
    () => state.lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0),
    [state.lines],
  );
  const tipCents = Math.round((subtotal * tipPercent) / 100);
  const dueCents = subtotal + tipCents;
  const itemCount = state.lines.reduce((n, l) => n + l.qty, 0);

  async function placeOrder() {
    if (itemCount === 0 || !name.trim()) return;
    setStatus('submitting');
    setErrorMsg('');
    const payload = {
      customerName: name.trim(),
      pickup,
      tipCents,
      subtotalCents: subtotal,
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
        // Function reachable but Square keys not set yet — the expected
        // pre-launch state. Show the honest "ready for Square" panel.
        setStatus('not_configured');
        return;
      }
      if (!res.ok) throw new Error(`Checkout failed (${res.status})`);
      dispatch({ type: 'clear' });
      setStatus('placed');
    } catch {
      // No function deployed yet (static preview) also lands here — treat it
      // as the same "not connected yet" state rather than a scary error.
      setStatus('not_configured');
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
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="flex items-center justify-between gap-4">
            <p className="eyebrow text-brick-deep">Build your order</p>
            {itemCount > 0 && (
              <a
                href="#cart"
                className="rounded-full border border-ink/15 px-4 py-1.5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream lg:hidden"
              >
                Review order · {itemCount}
              </a>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-12">
            {orderMenu.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-baseline justify-between gap-4 border-b border-ink/15 pb-3">
                  <h2 className="font-display text-2xl text-ink md:text-3xl">
                    {cat.heading}
                  </h2>
                  {cat.note && (
                    <span className="shrink-0 text-xs uppercase tracking-mega text-ink-muted">
                      {cat.note}
                    </span>
                  )}
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
        <aside id="cart" className="scroll-mt-24 lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-cream-deep">
              <div className="border-b border-ink/10 px-6 py-5">
                <h2 className="font-display text-2xl text-ink">Your order</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Pickup at {/* single-location shop */}207 East Main St.
                </p>
              </div>

              {state.lines.length === 0 ? (
                <p className="px-6 py-10 text-center text-ink-muted">
                  Your cart is empty. Add something tasty from the menu.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-ink/10 px-6">
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
                            className="flex h-7 w-7 items-center justify-center rounded-full text-lg text-ink transition-colors hover:bg-ink/10"
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
                            className="flex h-7 w-7 items-center justify-center rounded-full text-lg text-ink transition-colors hover:bg-ink/10"
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
              )}

              {state.lines.length > 0 && (
                <div className="border-t border-ink/10 px-6 py-5">
                  {/* Tip */}
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

                  {/* Pickup + name */}
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

                  {status === 'not_configured' ? (
                    <div className="mt-5 rounded-lg border border-oak/60 bg-oak/15 px-4 py-4 text-sm text-ink">
                      <p className="font-medium">Almost there — payment isn&apos;t switched on yet.</p>
                      <p className="mt-1 text-ink-muted">
                        The order flow is ready; the last step (Square taking the
                        card) turns on once the shop&apos;s Square keys are connected.
                        Your cart is saved.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={placeOrder}
                      disabled={status === 'submitting' || !name.trim()}
                      className="group mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brick py-4 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-[#9b4128] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {status === 'submitting'
                        ? 'Sending…'
                        : `Continue to payment · ${formatCents(dueCents)}`}
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  )}
                  {!name.trim() && status !== 'not_configured' && (
                    <p className="mt-2 text-center text-xs text-ink-muted">
                      Add a name to continue.
                    </p>
                  )}
                  {errorMsg && (
                    <p className="mt-2 text-center text-xs text-brick">{errorMsg}</p>
                  )}
                </div>
              )}
            </div>
          </div>
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
              <label key={group.id} className="inline-flex items-center gap-1.5">
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
