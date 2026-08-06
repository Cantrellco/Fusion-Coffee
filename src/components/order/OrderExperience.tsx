'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  orderMenu,
  formatCents,
  lineKey,
  unitPriceCents,
  type CartLine,
  type CartModifier,
  type OrderItem,
  type OrderModifierOption,
} from '@/lib/order';
import { shopOpenStatus, site, type OpenStatus } from '@/lib/site';
import { ArrowUpRight, Close } from '@/components/icons';
import { onFieldEnter } from '@/components/formKeys';
import { CitrusSlice } from '@/components/Citrus';
import { specimenFor } from '@/components/SummerSpecimens';
import SquareCard from './SquareCard';
import WalletButtons, { type WalletContact } from './WalletButtons';
import ItemSheet from './ItemSheet';
import OrderChips from './OrderChips';
import { useDragDismiss, useSheetChrome, useCloseAboveBreakpoint } from './sheet';

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
//
// CLOSED HOURS: while the shop is closed the menu still browses and the cart
// still fills (it survives in localStorage), but checkout is replaced by a
// "we're closed, back at 6am" panel. The same hours table gates the server
// (functions/api/checkout.ts returns 409), so nothing can be paid for while
// the lights are off — see src/lib/hours.ts.
//
// TWO LAYOUTS, ONE STATE. Below `lg` this is an app: a sticky category rail,
// compact tappable menu rows, an item detail sheet for customization, and the
// cart as a drag-dismissable bottom sheet. At `lg` and up it stays the original
// two-column page — inline-dropdown menu rows and the sticky cart aside — and
// that rendering is FROZEN: every mobile change below sets the base value and
// restores the original at `lg:`. The cart body is still written ONCE and
// shared by both, so there is never a second `#sq-card` container.
// ============================================================

// v2: modifier upcharges landed, so a v1 cart in localStorage holds prices that
// are now wrong. Bumping the key retires those carts instead of reviving them.
const CART_KEY = 'fusion-cart-v2';
// Per-TAB, not per-browser: written the instant an express wallet is tapped,
// because Cash App Pay on a phone leaves the site for the Cash App and comes
// back to a FRESH page. The cart itself survives in localStorage (so the wallet
// buttons remount and can still receive the token), but the typed name, tip and
// open cart sheet would not — the customer would land on the menu wondering
// what happened. Read once on mount and deleted. See WalletButtons.tsx.
const CHECKOUT_KEY = 'fusion-checkout-v1';
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
  | { type: 'add'; item: OrderItem; modifiers: CartModifier[]; qty: number }
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
      // Only the choices worth showing/charging ride along; the line's price is
      // the base plus their upcharges, so subtotal, tip and Square all agree.
      const chosen = action.modifiers.filter((m) => m.value && m.value !== 'None');
      const unit = unitPriceCents(action.item.priceCents, chosen);
      // Stack onto an existing line only when the PRICE matches too. A cart
      // restored from localStorage can carry a pre-price-change unit cost, and
      // merging into it would quietly sell today's drink at the old price —
      // which the server then rejects with a 409 the customer can't act on.
      const existing = state.lines.find((l) => l.key === key && l.priceCents === unit);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l === existing ? { ...l, qty: l.qty + action.qty } : l,
          ),
        };
      }
      const line: CartLine = {
        key,
        itemId: action.item.id,
        name: action.item.name,
        priceCents: unit,
        qty: action.qty,
        modifiers: chosen,
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

/**
 * A saved cart is untrusted input. A truncated write, a quota failure, or a
 * cart left behind by an older build can all produce a line with no
 * `modifiers` array — and the render path reads `line.modifiers.length`
 * unguarded. That throws during render, and with no error boundary on the
 * route the customer gets a permanently broken /order: the poison value is
 * re-read on every visit and they cannot clear their own localStorage.
 */
function validLine(l: unknown): l is CartLine {
  if (!l || typeof l !== 'object') return false;
  const c = l as Partial<CartLine>;
  return (
    typeof c.key === 'string' &&
    typeof c.itemId === 'string' &&
    typeof c.name === 'string' &&
    typeof c.priceCents === 'number' &&
    Number.isFinite(c.priceCents) &&
    c.priceCents >= 0 &&
    Number.isInteger(c.qty) &&
    (c.qty as number) > 0 &&
    Array.isArray(c.modifiers)
  );
}

type CheckoutStatus =
  | 'idle'
  | 'paying'
  | 'submitting'
  | 'not_configured'
  | 'closed'
  // The server repriced the cart and refused to charge (409 price_changed).
  | 'price_changed'
  // A charge was sent but we never saw the outcome. NOT a failure — retrying
  // is safe only because the retry reuses the same token + idempotency key.
  | 'unconfirmed'
  | 'placed'
  | 'error';

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function OrderExperience() {
  const [state, dispatch] = useReducer(cartReducer, { lines: [] });
  const [tipPercent, setTipPercent] = useState(15);
  const [pickup, setPickup] = useState(PICKUP_OPTIONS[0]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // What the server said changed price, so the panel can name it rather than
  // just asserting "something moved".
  const [repriced, setRepriced] = useState<
    { name: string; fromCents: number; toCents: number | null }[]
  >([]);
  // Mobile only: the cart lives in a bottom sheet opened from a floating bar.
  const [cartOpen, setCartOpen] = useState(false);
  // The drink being customized (< lg). Kept mounted after close so the sheet
  // still has something to render while it slides away.
  const [sheetItem, setSheetItem] = useState<OrderItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // What just landed in the cart — drives the pill's count bump and the
  // screen-reader announcement. Add-to-cart feedback has to persist, not flash.
  const [lastAdded, setLastAdded] = useState<{ name: string } | null>(null);
  // null until mounted — the static export is prerendered at build time, so
  // resolving hours only after hydration keeps server and first client render
  // identical (same trick as the OpenStatus pill).
  const [openStatus, setOpenStatus] = useState<OpenStatus | null>(null);
  // The cart <aside> is a modal sheet below lg and an ordinary sticky column at
  // lg, so it must only carry dialog semantics below lg. Starts false to match
  // the server render, then corrects itself after hydration (attributes only —
  // nothing visual depends on it, so there is no hydration mismatch).
  const [isDesktop, setIsDesktop] = useState(false);
  // Gates the attribute-only corrections below (dialog role, inert) so the
  // server HTML keeps today's markup and nothing shifts during hydration.
  const [mounted, setMounted] = useState(false);

  const cartPanelRef = useRef<HTMLElement>(null);
  // Square rejects a REUSED idempotency key whose request body differs, and
  // mints a SECOND CHARGE for a fresh key. So the key is scoped to the exact
  // cart being charged: a retry of the same order reuses it (Square de-dupes),
  // while changing the tip or a quantity earns a new one instead of a hard
  // failure. `sourceId` is deliberately outside the signature — see retry().
  const idem = useRef<{ sig: string; key: string }>({ sig: '', key: '' });
  // The card token from the in-flight attempt. A retry MUST reuse it: a fresh
  // token plus the same key is the one combination Square refuses, and a fresh
  // token plus a fresh key is how you charge someone twice.
  const lastSourceId = useRef<string | undefined>(undefined);
  // Bumped only on a DEFINITE decline. The server derives the payment's
  // idempotency key from it, so a new card gets a new key while the order key
  // stays stable — one order, however many cards it takes to pay for it.
  const paymentAttempt = useRef(0);
  // The name an express wallet gave us, for an order placed without ever
  // showing the name field. Sticky so a retry rebuilds the same payload.
  const walletName = useRef('');
  // Skips the persist effect's FIRST run. Both effects fire in the same mount
  // commit, and at that point `state.lines` is still the empty initial value —
  // so persisting would write `[]` over the saved cart before the hydrate
  // dispatch has re-rendered. (A flag set inside the hydrate effect doesn't
  // help: it runs first, so persist would already see it as true.)
  const skipFirstPersist = useRef(true);

  // Hydrate from localStorage AFTER mount so the static export's first paint
  // matches the server-rendered empty cart (no hydration mismatch).
  //
  // The checkout step is resumed here too — in the SAME effect, so it is read
  // before the persist effect below can clear it, and only when there is
  // actually a cart to pay for.
  useEffect(() => {
    let lines: CartLine[] = [];
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          lines = parsed.filter(validLine);
          dispatch({ type: 'hydrate', lines });
        }
      }
    } catch {
      /* ignore malformed cache */
    }

    // Landing back from a wallet that took the buyer off-site (Cash App on a
    // phone). The express buttons live on the PAYMENT step, so that is the step
    // to come back to — anything less and the wallet's token is dispatched into
    // an unmounted component and the order they just approved never happens.
    try {
      const raw = window.sessionStorage.getItem(CHECKOUT_KEY);
      // One-shot, and cleared even when it can't be used (an order was placed
      // and the cart is empty). Leaving it would spring the sheet open days
      // later on a brand new cart, prefilled with a stranger's old details.
      window.sessionStorage.removeItem(CHECKOUT_KEY);
      if (!raw || !SQUARE_READY || lines.length === 0) return;
      const saved = JSON.parse(raw) as {
        name?: unknown;
        pickup?: unknown;
        tipPercent?: unknown;
      };
      // The payment step needs a name, and the server needs the shop open.
      // Without either, resuming would land them on a step that can't pay.
      if (typeof saved?.name !== 'string' || !saved.name.trim()) return;
      if (!shopOpenStatus().open) return;
      setName(saved.name);
      if (typeof saved?.pickup === 'string' && PICKUP_OPTIONS.includes(saved.pickup)) {
        setPickup(saved.pickup);
      }
      if (typeof saved?.tipPercent === 'number' && TIP_OPTIONS.includes(saved.tipPercent)) {
        setTipPercent(saved.tipPercent);
      }
      setStatus('paying');
      // Below lg the whole checkout lives inside the cart sheet. Harmless at lg
      // and up — useCloseAboveBreakpoint closes it again on a desktop viewport.
      setCartOpen(true);
    } catch {
      /* ignore malformed resume state */
    }
  }, []);

  useEffect(() => {
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(state.lines));
    } catch {
      /* storage full / disabled — cart still works in-memory */
    }
  }, [state.lines]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    setMounted(true);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Track open/closed in shop time, re-checked every minute so a tab left open
  // past closing swaps to the closed state on its own instead of offering
  // checkout.
  useEffect(() => {
    const update = () => {
      const next = shopOpenStatus();
      // shopOpenStatus() returns a fresh object literal every call, so setting
      // it unconditionally re-rendered this whole tree every 60 seconds — which,
      // while the Square card form was mounted, tore the card iframe down and
      // rebuilt it mid-typing. Only commit a real change.
      setOpenStatus((prev) =>
        prev && prev.open === next.open && prev.label === next.label ? prev : next,
      );
      // Reopening has to release the checkout too. Without this, someone who
      // tapped "Continue to payment" at 5:59 is stuck on a dead cart at 6:01
      // with no way back short of reloading a page that looks perfectly live.
      setStatus((s) => (next.open && s === 'closed' ? 'idle' : s));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const closeCart = useCallback(() => setCartOpen(false), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  // Modal chrome for the cart sheet: iOS-safe scroll lock, focus trap, focus
  // restore, Escape, and inert-ing the header + tab bar — both of which sit
  // ABOVE the scrim in z-order and stayed tappable straight through it.
  useSheetChrome({ open: cartOpen, onClose: closeCart, panelRef: cartPanelRef });
  useCloseAboveBreakpoint(cartOpen, 1024, closeCart);
  const { style: cartDragStyle, handlers: cartDragHandlers } = useDragDismiss({
    onDismiss: closeCart,
  });

  const subtotal = useMemo(
    () => state.lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0),
    [state.lines],
  );
  const tipCents = Math.round((subtotal * tipPercent) / 100);
  const dueCents = subtotal + tipCents;
  const itemCount = state.lines.reduce((n, l) => n + l.qty, 0);
  // Before hydration resolves the hours, assume open — the button needs JS to
  // do anything anyway, and beginCheckout re-checks the clock for real.
  const closed = openStatus ? !openStatus.open : false;

  const addToCart = useCallback(
    (item: OrderItem, modifiers: CartModifier[], qty: number) => {
      dispatch({ type: 'add', item, modifiers, qty });
      setLastAdded({ name: item.name });
    },
    [],
  );

  function openItemSheet(item: OrderItem) {
    setCartOpen(false);
    setSheetItem(item);
    setSheetOpen(true);
  }

  function addFromSheet(item: OrderItem, modifiers: CartModifier[], qty: number) {
    addToCart(item, modifiers, qty);
    setSheetOpen(false);
  }

  // "Continue to payment": if Square is wired up, reveal the card form;
  // otherwise fall back to the honest pre-launch panel.
  function beginCheckout() {
    if (itemCount === 0 || !name.trim()) return;
    // Read the clock now rather than trusting the once-a-minute poll — the shop
    // can tick past closing between renders. (The function checks again too.)
    const now = shopOpenStatus();
    setOpenStatus(now);
    if (!now.open) {
      setErrorMsg('');
      setStatus('closed');
      return;
    }
    setErrorMsg('');
    if (SQUARE_READY) {
      setStatus('paying');
    } else {
      void submitOrder();
    }
  }

  async function submitOrder(sourceId?: string, contact?: WalletContact | null) {
    // An express wallet pays before the name field is ever shown, so the name
    // comes from the wallet instead. Parked in a ref rather than recomputed
    // per call: retryUnconfirmed() re-sends with no contact, and if that
    // produced a DIFFERENT name the payload signature would change, mint a
    // second idempotency key, and turn a safe retry into a second charge.
    if (contact?.name.trim()) walletName.current = contact.name.trim();
    const customerName = name.trim() || walletName.current || 'Express order';
    if (itemCount === 0 || !customerName) return;
    setStatus('submitting');
    setErrorMsg('');
    lastSourceId.current = sourceId;

    const lines = state.lines.map((l) => ({
      itemId: l.itemId,
      name: l.name,
      qty: l.qty,
      priceCents: l.priceCents,
      modifiers: l.modifiers,
      squareCatalogObjectId: l.squareCatalogObjectId ?? null,
    }));
    // The signature covers everything that changes the AMOUNT or the order —
    // but not sourceId, so re-sending an unconfirmed charge keeps its key.
    const sig = JSON.stringify({
      lines,
      tipCents,
      subtotalCents: subtotal,
      customerName,
      pickup,
    });
    if (idem.current.sig !== sig) {
      idem.current = { sig, key: newIdempotencyKey() };
      paymentAttempt.current = 0;
    }

    const payload = {
      customerName,
      pickup,
      tipCents,
      subtotalCents: subtotal,
      sourceId,
      idempotencyKey: idem.current.key,
      paymentAttempt: paymentAttempt.current,
      lines,
    };
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        label?: string;
        status?: string;
        lines?: { itemId: string; shownCents: number; actualCents: number | null }[];
      };
      if (res.status === 501) {
        // Keys not set yet — the expected pre-launch state.
        setStatus('not_configured');
        return;
      }
      if (res.status === 409 && data.error === 'closed') {
        // The shop closed out from under this order (or the clock disagreed).
        // Nothing was created and no card was charged. The server's label is
        // the authoritative one, so adopt it.
        setOpenStatus({ open: false, label: data.label ?? shopOpenStatus().label });
        setErrorMsg('');
        setStatus('closed');
        return;
      }
      if (res.status === 409 && data.error === 'price_changed') {
        // The server refused to charge because the menu moved under a cart
        // that had been sitting in localStorage. Nothing was created. Adopt
        // the server's numbers — it is the authority — and make the customer
        // re-confirm rather than silently charging the new total.
        applyReprice(data.lines ?? []);
        return;
      }
      if (data.error === 'payment_failed' || data.error === 'order_failed') {
        // Square answered, and the answer was no. This is a DEFINITE failure —
        // nothing was captured — so it must not be dressed up as "we couldn't
        // confirm". Send them back to the card form with a real reason.
        //
        // The next attempt needs a new payment idempotency key: Square rejects
        // the same key carrying a different card token, which would otherwise
        // deadlock checkout after any decline. The ORDER key stays put so the
        // retry reuses the order instead of stacking up duplicates.
        paymentAttempt.current += 1;
        lastSourceId.current = undefined;
        setErrorMsg(
          data.error === 'payment_failed'
            ? 'That card was declined. Check the details or try another card.'
            : 'We could not start that order. Please try again.',
        );
        setStatus('paying');
        return;
      }
      if (!res.ok) throw new Error(data.error || `Checkout failed (${res.status})`);
      // A 200 is NOT automatically a sale. `order_created_payment_pending`
      // means a real order exists in Square that nobody has paid for — the
      // build-time NEXT_PUBLIC_SQUARE_* keys are missing while the runtime
      // token is present. Never show that as "Order received".
      if (data.status && data.status !== 'paid') {
        setErrorMsg('');
        setStatus('not_configured');
        return;
      }
      dispatch({ type: 'clear' });
      idem.current = { sig: '', key: '' };
      lastSourceId.current = undefined;
      setCartOpen(false);
      setStatus('placed');
    } catch {
      if (sourceId) {
        // We sent a card token and never learned the outcome. It may well have
        // charged. Do NOT drop them back on a blank card form — a fresh token
        // would be a second, independent charge. Offer the idempotent retry.
        setErrorMsg('');
        setStatus('unconfirmed');
      } else {
        // Never reached a deployed function (static preview, or offline before
        // the request left) — nothing was created either way.
        setErrorMsg('');
        setStatus('not_configured');
      }
    }
  }

  /**
   * Adopt the server's prices for the lines it rejected. Matching is on
   * (itemId, shownCents) because one item id can appear as several cart lines
   * with different builds — and therefore different unit prices.
   */
  function applyReprice(
    mismatched: { itemId: string; shownCents: number; actualCents: number | null }[],
  ) {
    const changes: { name: string; fromCents: number; toCents: number | null }[] = [];
    const next: CartLine[] = [];
    for (const line of state.lines) {
      const hit = mismatched.find(
        (m) => m.itemId === line.itemId && m.shownCents === line.priceCents,
      );
      if (!hit) {
        next.push(line);
        continue;
      }
      changes.push({
        name: line.name,
        fromCents: line.priceCents,
        toCents: hit.actualCents,
      });
      // actualCents === null means the item is gone from the menu entirely.
      if (hit.actualCents !== null) {
        next.push({ ...line, priceCents: hit.actualCents });
      }
    }
    dispatch({ type: 'hydrate', lines: next });
    setRepriced(changes);
    // The cart changed, so the old key no longer describes what we'd charge.
    idem.current = { sig: '', key: '' };
    setStatus(next.length ? 'price_changed' : 'idle');
  }

  /** Re-send the SAME token under the SAME key — Square de-dupes a real hit. */
  function retryUnconfirmed() {
    void submitOrder(lastSourceId.current);
  }

  // Stable identities, via a latest-value ref rather than a dependency list.
  // SquareCard and WalletButtons re-run their whole mount effect when these
  // change, which destroys and re-attaches Square's iframes — and the express
  // buttons now sit right next to the name field, so a dep on `name` would
  // rebuild all three wallets on every keystroke.
  const submitRef = useRef(submitOrder);
  useEffect(() => {
    submitRef.current = submitOrder;
  });
  const onPaid = useCallback((sourceId: string, contact?: WalletContact | null) => {
    void submitRef.current(sourceId, contact);
  }, []);
  const onPayError = useCallback((m: string) => setErrorMsg(m), []);
  // A wallet was tapped: Cash App may now take the buyer off-site, so save what
  // they'd typed. Read back (once) by the hydrate effect on the way in. Same
  // latest-ref trick — this identity must not change while they're typing.
  const typed = useRef({ name, pickup, tipPercent });
  useEffect(() => {
    typed.current = { name, pickup, tipPercent };
  });
  const onWalletStart = useCallback(() => {
    try {
      window.sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(typed.current));
    } catch {
      /* storage disabled — the wallet still works, the cart just won't reopen */
    }
  }, []);

  if (status === 'placed') {
    return (
      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto max-w-xl px-5 text-center sm:px-8">
          <p className="eyebrow justify-center text-brick-deep">Order received</p>
          <h2 className="mt-4 font-display text-fluid-xl text-ink">
            {/* An express order never showed the name field — the wallet's name
                (or Cash App handle) is who this is, so greet them by it. */}
            Thanks, {name.split(' ')[0] || walletName.current.split(' ')[0] || 'friend'} —
            we&apos;re on it.
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
        {/* Closed: say so up front, before anyone builds a cart they can't pay
            for. The menu and cart stay usable on purpose — the cart persists,
            so they can check out the moment we open. */}
        {closed && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-brick/35 bg-brick/10 px-5 py-4 lg:col-span-12"
          >
            <span className="flex items-center gap-2 font-medium text-ink">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-brick" />
              {openStatus?.label}
            </span>
            <span className="text-sm text-ink-muted">
              Online orders are off while we&apos;re closed — browse away, your
              cart is saved for when we open.
            </span>
          </div>
        )}

        {/* -------------------- MENU -------------------- */}
        {/* Bottom padding on mobile so the last items scroll clear of the
            floating "View order" bar + the global bottom tab bar. */}
        {/* min-w-0: a grid item defaults to `min-width:auto`, so the category
            rail's max-content width propagated out and stretched the whole
            page to 816px on a 390px screen. */}
        <div className="min-w-0 pb-28 lg:col-span-7 lg:pb-0 xl:col-span-8">
          <p className="eyebrow text-brick-deep">Build your order</p>

          {/* 39 items across 8 sections. Without this rail, reaching
              "Sandwiches" on a phone means scrolling past everything else. */}
          <OrderChips
            sections={orderMenu.map((c) => ({ id: c.id, heading: c.heading }))}
          />

          <div className="mt-8 flex flex-col gap-12">
            {orderMenu.map((cat) => (
              <div
                key={cat.id}
                id={cat.id}
                // Clears the hide-on-scroll top bar + the chip rail when a rail
                // tap jumps here. Same value /menu uses; zero at lg, where
                // there is no rail and no jump.
                className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] lg:scroll-mt-0"
              >
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
                    // ONE wrapper per item, holding both renderings. Putting
                    // the two rows in the list directly would make `divide-y`
                    // draw a rule between them — and give the desktop row a top
                    // border the original never had.
                    <div key={item.id}>
                      <MenuRowMobile
                        item={item}
                        onOpen={openItemSheet}
                        onQuickAdd={(it) => addToCart(it, [], 1)}
                      />
                      <MenuRowDesktop
                        item={item}
                        onAdd={(modifiers) =>
                          dispatch({ type: 'add', item, modifiers, qty: 1 })
                        }
                      />
                    </div>
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
            // Offset from --tabbar-h rather than a hardcoded 5.25rem, so the
            // pill can't drift out of sync with the bar it floats above.
            className="fixed inset-x-3 bottom-[calc(var(--tabbar-h)+0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-full bg-brick px-5 py-3.5 text-cream shadow-lg shadow-black/30 transition-transform active:scale-[0.99] motion-reduce:active:scale-100 lg:hidden"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium">
              <span
                // Re-keyed on the count so React remounts the node and the bump
                // replays on every add — this is the confirmation that
                // something actually landed in the order.
                key={itemCount}
                className="flex h-6 min-w-6 animate-cart-bump items-center justify-center rounded-full bg-cream/20 px-1.5 text-xs tabular-nums motion-reduce:animate-none"
              >
                {itemCount}
              </span>
              View order
            </span>
            <span className="text-sm font-semibold tabular-nums">{formatCents(dueCents)}</span>
          </button>
        )}

        {/* The pill is visual-only feedback; without this a screen reader gets
            no confirmation that anything was added. */}
        <p aria-live="polite" className="sr-only">
          {lastAdded
            ? `${lastAdded.name} added. ${itemCount} ${
                itemCount === 1 ? 'item' : 'items'
              } in your order, ${formatCents(dueCents)}.`
            : ''}
        </p>

        {/* Scrim behind the mobile sheet */}
        <div
          aria-hidden
          onClick={closeCart}
          className={`fixed inset-0 z-[58] touch-none bg-black/55 backdrop-blur-[2px] transition-opacity duration-500 ease-drawer motion-reduce:transition-none lg:hidden ${
            cartOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />

        <aside
          id="cart"
          ref={cartPanelRef}
          data-sheet-panel
          role={isDesktop ? undefined : 'dialog'}
          aria-label="Your order"
          aria-modal={cartOpen && !isDesktop ? true : undefined}
          // Below lg a closed cart is parked off-screen at translate-y-full,
          // but every control in it stayed tabbable. Inert it once hydrated —
          // never on the server, so a no-JS desktop still gets a live aside.
          // @ts-expect-error — `inert` is missing from React 18's DOM typings
          inert={mounted && !isDesktop && !cartOpen ? '' : undefined}
          className={`sheet-max-h z-[59] flex flex-col overflow-hidden border-ink/10 bg-cream-deep fixed inset-x-0 bottom-0 rounded-t-2xl border-t shadow-[0_-20px_60px_-12px_rgba(60,38,20,0.45)] transition-transform duration-500 ease-drawer motion-reduce:transition-none ${
            cartOpen ? 'translate-y-0' : 'translate-y-full'
          } lg:sticky lg:top-24 lg:z-50 lg:col-span-5 lg:inset-x-auto lg:bottom-auto lg:max-h-[calc(100vh-7rem)] lg:translate-y-0 lg:self-start lg:rounded-2xl lg:border lg:shadow-none xl:col-span-4`}
          style={cartDragStyle}
        >
          {/* Header — does not scroll. Below lg it doubles as the drag handle:
              the gesture is scoped here so it never fights the list's scroll. */}
          <div
            {...cartDragHandlers}
            className="flex-none touch-none border-b border-ink/10 px-6 py-4 lg:touch-auto lg:py-5"
          >
            <div aria-hidden className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-ink/15 lg:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink">Your order</h2>
                <p className="mt-1 text-sm text-ink-muted">Pickup at 207 East Main St.</p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close order"
                className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/10 hover:text-ink lg:h-10 lg:w-10 lg:hidden"
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
                            {line.modifiers
                              .map((m) =>
                                m.priceCents
                                  ? `${m.value} +${formatCents(m.priceCents)}`
                                  : m.value,
                              )
                              .join(' · ')}
                          </p>
                        )}
                        {/* 44px targets below lg (the Apple HIG minimum, and
                            these were 32px); the original discs return at lg. */}
                        <div className="mt-2 inline-flex items-center gap-3 rounded-full border border-ink/15 px-1">
                          <button
                            type="button"
                            aria-label={
                              line.qty === 1
                                ? `Remove ${line.name}`
                                : `Remove one ${line.name}`
                            }
                            onClick={() => dispatch({ type: 'dec', key: line.key })}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-ink transition-colors hover:bg-ink/10 lg:h-8 lg:w-8"
                          >
                            {/* At one, "−" already deletes the line — say so
                                with a bin instead of leaving a stray X floating
                                in the price column. Desktop keeps its separate
                                remove button, so it stays on "−" throughout. */}
                            {line.qty === 1 ? (
                              <>
                                <Trash className="h-[18px] w-[18px] lg:hidden" />
                                <span aria-hidden className="hidden lg:inline">
                                  −
                                </span>
                              </>
                            ) : (
                              '−'
                            )}
                          </button>
                          <span className="min-w-4 text-center text-sm tabular-nums text-ink">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            aria-label={`Add one ${line.name}`}
                            onClick={() => dispatch({ type: 'inc', key: line.key })}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-ink transition-colors hover:bg-ink/10 lg:h-8 lg:w-8"
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
                          // Desktop only: on a phone the stepper's bin does
                          // this job, and a second remove control left a
                          // stray X floating in the price column.
                          className="hidden text-ink-muted transition-colors hover:text-brick lg:block"
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
                        className={`min-h-[44px] flex-1 rounded-full border px-2 py-2 text-sm tabular-nums transition-colors lg:min-h-0 ${
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
                <div data-fields className="mt-5 flex flex-col gap-3">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Name for the order</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={onFieldEnter}
                      placeholder="First name"
                      autoComplete="given-name"
                      // The only text field here, so Done means done: close the
                      // keyboard rather than jumping focus into the pickup
                      // select, which would pop a picker straight back open.
                      enterKeyHint="done"
                      className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-3 text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brick lg:py-2.5"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Pickup</span>
                    <select
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-3 text-ink outline-none transition-colors focus:border-brick lg:py-2.5"
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
                {closed || status === 'closed' ? (
                  <div className="rounded-lg border border-brick/40 bg-brick/10 px-4 py-4 text-sm text-ink">
                    <p className="font-medium">
                      {openStatus?.label ?? "We're closed right now"}
                    </p>
                    <p className="mt-1 text-ink-muted">
                      We can only take orders while the shop is open. Your cart
                      is saved — check out when we open.
                    </p>
                  </div>
                ) : status === 'not_configured' ? (
                  <div className="rounded-lg border border-oak/60 bg-oak/15 px-4 py-4 text-sm text-ink">
                    <p className="font-medium">Almost there — payment isn&apos;t switched on yet.</p>
                    <p className="mt-1 text-ink-muted">
                      The order flow is ready; the last step (Square taking the
                      card) turns on once the shop&apos;s Square keys are connected.
                      Your cart is saved.
                    </p>
                  </div>
                ) : status === 'price_changed' ? (
                  <div className="rounded-lg border border-oak/60 bg-oak/15 px-4 py-4 text-sm text-ink">
                    <p className="font-medium">Prices changed while you shopped.</p>
                    <ul className="mt-2 flex flex-col gap-1 text-ink-muted">
                      {repriced.map((c) => (
                        <li key={`${c.name}-${c.fromCents}`}>
                          {c.name} —{' '}
                          {c.toCents === null ? (
                            <>no longer on the menu, removed</>
                          ) : (
                            <>
                              was{' '}
                              <span className="tabular-nums line-through">
                                {formatCents(c.fromCents)}
                              </span>
                              , now{' '}
                              <span className="tabular-nums text-ink">
                                {formatCents(c.toCents)}
                              </span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-ink-muted">
                      Nothing was charged. Your total is now{' '}
                      <span className="tabular-nums text-ink">{formatCents(dueCents)}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRepriced([]);
                        setStatus('idle');
                      }}
                      className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-full bg-brick px-5 text-sm font-medium text-cream transition-colors hover:bg-[#9b4128] lg:min-h-0 lg:py-2.5"
                    >
                      Got it — continue
                    </button>
                  </div>
                ) : status === 'unconfirmed' ? (
                  <div className="rounded-lg border border-brick/40 bg-brick/10 px-4 py-4 text-sm text-ink">
                    <p className="font-medium">We couldn&apos;t confirm that payment.</p>
                    <p className="mt-1 text-ink-muted">
                      Your card may already have been charged, so don&apos;t start
                      over — checking again is safe and can&apos;t charge you twice.
                      {site.phone
                        ? ` If it keeps failing, call us at ${site.phone} before retrying.`
                        : ' If it keeps failing, give us a call before retrying.'}
                    </p>
                    <button
                      type="button"
                      onClick={retryUnconfirmed}
                      className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-full bg-brick px-5 text-sm font-medium text-cream transition-colors hover:bg-[#9b4128] lg:min-h-0 lg:py-2.5"
                    >
                      Check again
                    </button>
                  </div>
                ) : status === 'paying' ? (
                  <div className="animate-fade-up motion-reduce:animate-none">
                    {/* Express checkout, then the card. Isolated: if no wallet
                        is available this renders nothing and the card form
                        below stands alone. Same onPaid → same charge. */}
                    <WalletButtons
                      appId={SQ_APP_ID as string}
                      locationId={SQ_LOCATION_ID as string}
                      env={SQ_ENV}
                      amountCents={dueCents}
                      onPaid={onPaid}
                      onError={onPayError}
                      onWalletStart={onWalletStart}
                      dividerLabel="or pay with card"
                    />
                    <SquareCard
                      appId={SQ_APP_ID as string}
                      locationId={SQ_LOCATION_ID as string}
                      env={SQ_ENV}
                      amountLabel={formatCents(dueCents)}
                      onPaid={onPaid}
                      onError={onPayError}
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
                    disabled={status === 'submitting' || !name.trim() || itemCount === 0}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-brick py-4 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-[#9b4128] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {status === 'submitting'
                      ? 'Processing…'
                      : `Continue to payment · ${formatCents(dueCents)}`}
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                )}
                {!name.trim() &&
                  !closed &&
                  status !== 'closed' &&
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

      {/* The customization surface (< lg). One instance for the whole page —
          it renders whichever item was tapped. */}
      <ItemSheet
        item={sheetItem}
        open={sheetOpen}
        onClose={closeSheet}
        onAdd={addFromSheet}
      />
    </section>
  );
}

// ---- Menu rows -----------------------------------------------------------
//
// Two renderings of the same item, one per breakpoint. They are separate
// components rather than one responsive row because the DOM genuinely differs:
// the mobile row is a single tap target holding no form controls at all, and
// the desktop row is the original inline-dropdown layout, frozen.

/** Disclosure chevron — this row opens something rather than acting. */
function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

/** Bin — the stepper's "−" turns into this at a quantity of one. */
function Trash({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
    </svg>
  );
}

function Check({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m5 12.5 5 5L19 7" />
    </svg>
  );
}

/**
 * The phone row: sketch, name, price, a two-line blurb, one action glyph.
 * The whole row is the tap target. 39 of these have to be skimmable, so
 * nothing in here opens a picker or holds a form control — that work moved to
 * ItemSheet. Rows went from 245–348px tall to ~90px.
 */
function MenuRowMobile({
  item,
  onOpen,
  onQuickAdd,
}: {
  item: OrderItem;
  onOpen: (item: OrderItem) => void;
  onQuickAdd: (item: OrderItem) => void;
}) {
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<number>();
  const specimen = specimenFor(item.name);
  const customizable = (item.modifiers?.length ?? 0) > 0;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function act() {
    if (customizable) {
      onOpen(item);
      return;
    }
    // Nothing to choose — a bagel goes straight in and the row acknowledges
    // it. No sheet, no second tap.
    onQuickAdd(item);
    setJustAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(false), 1100);
  }

  return (
    <button
      type="button"
      onClick={act}
      aria-haspopup={customizable ? 'dialog' : undefined}
      aria-label={
        customizable
          ? `${item.name}, ${formatCents(item.priceCents)} — choose options`
          : `Add ${item.name}, ${formatCents(item.priceCents)}`
      }
      className={`flex w-full items-start gap-3 py-3.5 text-left transition-colors duration-200 active:bg-ink/[0.04] motion-reduce:transition-none lg:hidden ${
        justAdded ? 'animate-row-flash motion-reduce:animate-none' : ''
      }`}
    >
      {specimen && (
        <span aria-hidden className="mt-0.5 h-10 w-10 shrink-0 opacity-90">
          {specimen}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 font-display text-[1.0625rem] leading-snug text-ink">
            {item.name}
          </span>
          <span className="shrink-0 text-sm tabular-nums text-ink-muted">
            {formatCents(item.priceCents)}
          </span>
        </span>
        {item.description && (
          <span className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-muted">
            {item.description}
          </span>
        )}
      </span>
      {/* One glyph, two honest meanings: a chevron opens the build sheet, a
          plus puts the item straight into the order. */}
      <span
        aria-hidden
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
          justAdded ? 'border-sage bg-sage text-cream' : 'border-ink/15 text-ink-muted'
        }`}
      >
        {justAdded ? (
          <Check className="h-4 w-4" />
        ) : customizable ? (
          <Chevron className="h-4 w-4" />
        ) : (
          <span className="text-lg leading-none">+</span>
        )}
      </span>
    </button>
  );
}

/**
 * The desktop row — the original inline-dropdown layout, unchanged. Only its
 * `display` is gated (`hidden … lg:flex`); every other utility is exactly what
 * it was, so the `lg` rendering stays byte-identical.
 */
function MenuRowDesktop({
  item,
  onAdd,
}: {
  item: OrderItem;
  onAdd: (modifiers: CartModifier[]) => void;
}) {
  // Selected modifier values default to the first option of each group — which
  // is always the free one, so the shown price is what you pay until you change
  // something.
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (item.modifiers ?? []).map((g) => [g.id, g.options[0].value]),
    ),
  );
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<number>();
  // The item's hand-drawn specimen sketch, matched by exact name — the same
  // drawings the /menu summer cards carry. null for everything unillustrated,
  // which is every regular-menu item today.
  const specimen = specimenFor(item.name);
  // What THIS build costs right now — the row price tracks the dropdowns, so an
  // oat-milk upcharge is visible before the item is ever added to the cart.
  const upcharge = (item.modifiers ?? []).reduce((sum, g) => {
    const value = selection[g.id] ?? g.options[0].value;
    return sum + (g.options.find((o) => o.value === value)?.priceCents ?? 0);
  }, 0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function add() {
    // "No milk" / "No flavor" / "No extra shot" are dropped here, so the cart
    // line and the barista's note only carry choices that were actually made.
    const modifiers: CartModifier[] = (item.modifiers ?? [])
      .map((g) => {
        const value = selection[g.id] ?? g.options[0].value;
        return { group: g, opt: g.options.find((o) => o.value === value) };
      })
      .filter((p): p is { group: typeof p.group; opt: OrderModifierOption } =>
        Boolean(p.opt) && !p.opt!.noop,
      )
      .map(({ group, opt }) => ({
        groupId: group.id,
        label: group.label,
        value: opt.value,
        priceCents: opt.priceCents ?? 0,
      }));
    onAdd(modifiers);
    setJustAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(false), 1100);
  }

  return (
    <div className="hidden flex-wrap items-start justify-between gap-x-4 gap-y-3 py-4 lg:flex">
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
              {formatCents(item.priceCents + upcharge)}
              {upcharge > 0 && (
                <span className="ml-1.5 text-xs text-brick">
                  +{formatCents(upcharge)}
                </span>
              )}
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
                      <option key={opt.value} value={opt.value}>
                        {(opt.display ?? opt.value) +
                          (opt.priceCents ? ` +${formatCents(opt.priceCents)}` : '')}
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
