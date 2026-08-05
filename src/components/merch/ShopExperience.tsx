'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { formatCents } from '@/lib/order';
import {
  shopGroups,
  hasSellableCatalog,
  fromPriceCents,
  type ShopProduct,
} from '@/lib/catalog';
import {
  shopLineKey,
  shopSubtotalCents,
  canShip,
  resolveFulfillment,
  shippingCents,
  addressProblems,
  EMPTY_ADDRESS,
  type ShopCartLine,
  type ShippingAddress,
  type Fulfillment,
} from '@/lib/shop';
import { site } from '@/lib/site';
import { ArrowUpRight, Bag, Close } from '@/components/icons';
import { CornerBotanical, Sprig } from '@/components/Botanical';
import Reveal from '@/components/Reveal';
import SquareCard from '@/components/order/SquareCard';
import WalletButtons, { type WalletContact } from '@/components/order/WalletButtons';

/**
 * Fold what a digital wallet knows about the buyer into the delivery form.
 * The wallet wins wherever it has a value — it is the buyer's own saved,
 * verified detail — and anything already typed fills the rest.
 */
function mergeWalletAddress(
  current: ShippingAddress,
  contact: WalletContact,
): ShippingAddress {
  const pick = (fromWallet: string, typed: string) =>
    fromWallet.trim() || typed.trim();
  return {
    name: pick(contact.name, current.name),
    email: pick(contact.email, current.email),
    phone: pick(contact.phone, current.phone),
    line1: pick(contact.line1, current.line1),
    line2: pick(contact.line2, current.line2),
    city: pick(contact.city, current.city),
    state: pick(contact.state, current.state),
    postalCode: pick(contact.postalCode, current.postalCode),
  };
}

// ============================================================
// On-site merch shop — the interactive half of /merch.
//
// Everything the customer touches happens on fusioncoffeeshop.com. /merch used
// to be a wall of deep links into the Square-hosted store on that same host;
// each card now adds to a real cart and checks out through the same Cloudflare
// function /order uses (functions/api/checkout.ts), where Square's secret token
// creates the Order + Payment.
//
// PRICES ARE NOT WRITTEN HERE. Every number comes from the shop's Square
// catalog via src/lib/catalog.ts. A product the catalog doesn't price is still
// shown — the photography and copy earn their place — but it cannot be added to
// the bag, and says so. Inventing a price for a real product is the one thing
// this page will not do.
//
// The cart is a drawer rather than /order's sticky column: these sections run
// full-bleed edge to edge, and a sticky aside would fight the alternating bands.
// It behaves like the mobile sheet elsewhere on the site (scrim, Escape to
// close, body scroll locked, global tab bar tucked away via `body.sheet-open`).
// ============================================================

const CART_KEY = 'fusion-shop-v1';
// Per-TAB: which checkout step this tab was on, so a wallet that leaves the
// site (Cash App Pay on a phone) comes back to the payment screen instead of a
// closed bag. Same contract as /order's CHECKOUT_KEY. See WalletButtons.tsx.
const CHECKOUT_KEY = 'fusion-shop-checkout-v1';

const SQ_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
const SQ_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
const SQ_ENV: 'sandbox' | 'production' =
  process.env.NEXT_PUBLIC_SQUARE_ENV === 'production' ? 'production' : 'sandbox';
const SQUARE_READY = Boolean(SQ_APP_ID && SQ_LOCATION_ID);

type CartState = { lines: ShopCartLine[] };
type CartAction =
  | { type: 'hydrate'; lines: ShopCartLine[] }
  | { type: 'add'; line: ShopCartLine }
  | { type: 'inc'; key: string }
  | { type: 'dec'; key: string }
  | { type: 'remove'; key: string }
  | { type: 'clear' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'hydrate':
      return { lines: action.lines };
    case 'add': {
      const existing = state.lines.find((l) => l.key === action.line.key);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.key === action.line.key ? { ...l, qty: l.qty + 1 } : l,
          ),
        };
      }
      return { lines: [...state.lines, action.line] };
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

type Status =
  | 'idle'
  | 'paying'
  | 'submitting'
  | 'not_configured'
  | 'price_changed'
  | 'placed';

export default function ShopExperience() {
  const [state, dispatch] = useReducer(cartReducer, { lines: [] });
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  // The customer's choice. Shipping is the default because most merch buyers
  // aren't in Fairfield — but plenty are, and they'd rather not pay postage to
  // collect a hoodie from a shop they're standing in.
  const [preferred, setPreferred] = useState<Fulfillment>('SHIPMENT');
  const [showErrors, setShowErrors] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // One key per checkout attempt: reusing it across a retry makes the retry
  // idempotent at Square instead of a second charge.
  const idemKey = useRef<string>('');
  // A wallet token we hold because the wallet didn't give us enough to fulfill
  // the order. Nothing has been charged; the customer completes the form and
  // the footer button spends this token instead of asking for a card.
  const heldToken = useRef<string>('');
  const [holding, setHolding] = useState(false);

  const catalogLive = useMemo(() => hasSellableCatalog(shopGroups), []);

  // Hydrate the bag, then resume the checkout step in the SAME effect — it has
  // to be read before the persist effect below can clear it, and it is only
  // worth resuming when there is a bag to pay for.
  useEffect(() => {
    let lines: ShopCartLine[] = [];
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ShopCartLine[];
        if (Array.isArray(parsed)) {
          lines = parsed;
          dispatch({ type: 'hydrate', lines });
        }
      }
    } catch {
      /* ignore malformed cache */
    }

    // Landing back from a wallet that took the buyer off-site (Cash App on a
    // phone). Reopen the bag with whatever they'd typed; the wallet's token
    // arrives moments later through WalletButtons, which is already mounted
    // because the bag above was restored.
    if (!SQUARE_READY || lines.length === 0) return;
    try {
      const raw = window.sessionStorage.getItem(CHECKOUT_KEY);
      if (!raw) return;
      // One-shot: consumed here so an ordinary refresh later doesn't keep
      // springing the drawer open.
      window.sessionStorage.removeItem(CHECKOUT_KEY);
      const saved = JSON.parse(raw) as {
        address?: ShippingAddress;
        preferred?: unknown;
      };
      const savedAddress = saved?.address;
      if (savedAddress && typeof savedAddress === 'object') setAddress(savedAddress);
      if (saved?.preferred === 'PICKUP' || saved?.preferred === 'SHIPMENT') {
        setPreferred(saved.preferred);
      }
      setOpen(true);
    } catch {
      /* ignore malformed resume state */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(state.lines));
    } catch {
      /* storage full / disabled — cart still works in-memory */
    }
  }, [state.lines]);

  // Mirror of the resume above: the payment step is the only one worth
  // returning to.
  useEffect(() => {
    try {
      if (status === 'paying') {
        window.sessionStorage.setItem(
          CHECKOUT_KEY,
          JSON.stringify({ address, preferred }),
        );
      } else {
        window.sessionStorage.removeItem(CHECKOUT_KEY);
      }
    } catch {
      /* storage disabled — wallets that redirect just won't resume */
    }
  }, [status, address, preferred]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sheet-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape backs OUT of payment first rather than binning the whole bag —
      // one keystroke should never lose a filled-in address.
      if (status === 'paying') setStatus('idle');
      else setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('sheet-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [open, status]);

  const subtotal = useMemo(() => shopSubtotalCents(state.lines), [state.lines]);
  // What they asked for vs what the bag actually allows. A gift card in the bag
  // forces collection, because it is activated on the register.
  const shippable = useMemo(() => canShip(state.lines), [state.lines]);
  const fulfillment = useMemo(
    () => resolveFulfillment(state.lines, preferred),
    [state.lines, preferred],
  );
  const shipCents = shippingCents(fulfillment, subtotal);
  const dueCents = subtotal + shipCents;
  const itemCount = state.lines.reduce((n, l) => n + l.qty, 0);
  const problems = addressProblems(address, fulfillment);
  const canPay = itemCount > 0 && problems.length === 0;

  function addProduct(product: ShopProduct, variationId: string) {
    const variation = product.variations.find((v) => v.id === variationId);
    if (!variation) return;
    dispatch({
      type: 'add',
      line: {
        key: shopLineKey(product.id, variation.id),
        productId: product.id,
        name: product.name,
        // A lone "Regular" variation is Square's default for an item with no
        // real options — showing it would just add noise to the cart line.
        variationName:
          product.variations.length > 1 || !/^regular$/i.test(variation.name)
            ? variation.name
            : '',
        variationId: variation.id,
        priceCents: variation.priceCents,
        qty: 1,
        shipsFrom: product.shipsFrom,
        pickupOnly: product.pickupOnly,
        image: product.image,
      },
    });
  }

  async function submit(sourceId?: string, contact?: WalletContact | null) {
    if (itemCount === 0) return;

    // An express wallet pays before the form is filled in, so what it knows
    // about the buyer stands in for it. The wallet wins field by field and
    // anything already typed fills the gaps.
    let useAddress = address;
    if (contact) {
      useAddress = mergeWalletAddress(address, contact);
      setAddress(useAddress);
    }

    if (addressProblems(useAddress, fulfillment).length) {
      // Not enough to fulfill. Do NOT bin the token — the customer already
      // approved this payment in their wallet; nothing has been charged, and
      // asking for the missing lines is far better than a dead end. The footer
      // button becomes "Finish payment" and re-submits with this same token.
      if (sourceId) {
        heldToken.current = sourceId;
        setHolding(true);
        setErrorMsg(
          `Your wallet didn't share ${
            fulfillment === 'SHIPMENT' ? 'a full delivery address' : 'everything we need'
          } — fill in the rest below and tap Finish payment. You haven't been charged yet.`,
        );
      }
      setShowErrors(true);
      setStatus('idle');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');
    if (!idemKey.current) {
      idemKey.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now());
    }
    const payload = {
      kind: 'shop' as const,
      customerName: useAddress.name.trim(),
      pickup:
        fulfillment === 'SHIPMENT'
          ? 'Ship to the address provided'
          : 'Pick up at 207 East Main Street',
      tipCents: 0,
      subtotalCents: subtotal,
      fulfillment,
      address: useAddress,
      sourceId,
      idempotencyKey: idemKey.current,
      lines: state.lines.map((l) => ({
        itemId: l.productId,
        name: l.name,
        qty: l.qty,
        priceCents: l.priceCents,
        variationId: l.variationId,
      })),
    };
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: string[];
      };
      if (res.status === 501) {
        setStatus('not_configured');
        return;
      }
      if (res.status === 409 && data.error === 'price_changed') {
        // Square's price no longer matches what this tab is showing. Nothing was
        // charged. Say so plainly rather than silently taking a different
        // number than the one on screen.
        setStatus('price_changed');
        return;
      }
      if (res.status === 400 && data.error === 'bad_address') {
        setShowErrors(true);
        setErrorMsg('Please check the highlighted delivery details.');
        setStatus(sourceId ? 'paying' : 'idle');
        return;
      }
      if (!res.ok) throw new Error(data.error || `Checkout failed (${res.status})`);
      dispatch({ type: 'clear' });
      idemKey.current = '';
      heldToken.current = '';
      setHolding(false);
      setOpen(false);
      setStatus('placed');
    } catch {
      if (sourceId) {
        setErrorMsg('That payment did not go through. Please try again.');
        setStatus('paying');
      } else {
        setStatus('not_configured');
      }
    }
  }

  function beginCheckout() {
    if (!canPay) {
      setShowErrors(true);
      return;
    }
    setErrorMsg('');
    // A wallet already paid, we just didn't have somewhere to send it. Finish
    // with that same token rather than asking for a card.
    if (holding && heldToken.current) {
      void submit(heldToken.current);
      return;
    }
    if (SQUARE_READY) setStatus('paying');
    else void submit();
  }

  /** Leave the payment screen with the bag and the typed address intact. */
  function backToBag() {
    setErrorMsg('');
    setStatus('idle');
  }

  // Stable identities, via a latest-value ref rather than a dependency list.
  // SquareCard and WalletButtons re-run their whole mount effect when these
  // change, which destroys and re-attaches Square's iframes — and the express
  // buttons now sit directly above the address form, so a dep on `address`
  // would rebuild all three wallets on every keystroke and reset a Cash App QR
  // mid-scan.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  const onPaid = useCallback((sourceId: string, contact?: WalletContact | null) => {
    void submitRef.current(sourceId, contact);
  }, []);
  const onPayError = useCallback((m: string) => setErrorMsg(m), []);
  // A wallet was tapped: Cash App may now take the buyer off-site, so save the
  // bag's checkout state. Read back (once) by the hydrate effect on the way in.
  const typed = useRef({ address, preferred });
  useEffect(() => {
    typed.current = { address, preferred };
  });
  const onWalletStart = useCallback(() => {
    try {
      window.sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(typed.current));
    } catch {
      /* storage disabled — the wallet still works, the bag just won't reopen */
    }
  }, []);

  const shipToLine =
    fulfillment === 'SHIPMENT'
      ? [
          address.line1.trim(),
          address.line2.trim(),
          `${address.city.trim()} ${address.state.trim().toUpperCase()} ${address.postalCode.trim()}`.trim(),
        ]
          .filter(Boolean)
          .join(', ')
      : site.address.full;

  const field = (key: keyof ShippingAddress) =>
    `mt-1.5 w-full rounded-lg border bg-cream px-3 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brick ${
      showErrors && problems.includes(key) ? 'border-brick' : 'border-ink/15'
    }`;

  return (
    <>
      {/* Catalog not connected → say it once, at the top, instead of letting
          every card explain itself. */}
      {!catalogLive && (
        <section className="bg-cream pb-2 pt-8">
          <div className="mx-auto max-w-edge px-5 sm:px-8">
            <div
              role="status"
              className="rounded-xl border border-oak/60 bg-oak/15 px-5 py-4 text-sm text-ink"
            >
              <p className="font-medium">
                Online merch checkout is switched on, but the product catalog
                isn&rsquo;t connected yet.
              </p>
              <p className="mt-1 text-ink-muted">
                Prices and sizes come straight from the shop&rsquo;s Square
                catalog — nothing here is typed by hand. Until that&rsquo;s
                linked, everything below is browsable and available in store at{' '}
                {site.address.street}. Call {site.phone} to hold something.
              </p>
            </div>
          </div>
        </section>
      )}

      {shopGroups.map((group, i) => (
        <section
          key={group.heading}
          className={`relative overflow-hidden py-14 md:py-28 ${
            i % 2 === 1 ? 'bg-cream-deep' : 'bg-cream'
          }`}
        >
          <CornerBotanical
            position={i % 2 === 0 ? 'tr' : 'bl'}
            tone="text-sage/[0.13]"
            size="h-52 w-52"
          />
          <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <Reveal>
                <h2 className="eyebrow flex items-center gap-3 text-brick">
                  <Sprig className="h-4 w-4 shrink-0 text-sage" />
                  <span className="text-ink/40">{group.index}</span>
                  <span className="h-px w-8 bg-ink/25" />
                  {group.heading}
                </h2>
              </Reveal>
              <Reveal delay={0.05}>
                <p className="max-w-md text-pretty leading-relaxed text-ink-muted md:text-right">
                  {group.blurb}
                </p>
              </Reveal>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 sm:gap-y-10 lg:grid-cols-3">
              {group.products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  i={idx}
                  onAdd={(variationId) => addProduct(product, variationId)}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Floating bag — the only way into the cart, on every breakpoint. */}
      {itemCount > 0 && !open && status !== 'placed' && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-full bg-brick px-5 py-3.5 text-cream shadow-lg shadow-black/30 transition-transform active:scale-[0.99] motion-reduce:active:scale-100 md:inset-x-auto md:bottom-8 md:right-8 md:px-6"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium">
            <Bag className="h-4 w-4 shrink-0" />
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-cream/20 px-1.5 text-xs tabular-nums">
              {itemCount}
            </span>
            View bag
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCents(dueCents)}
          </span>
        </button>
      )}

      {/* Scrim sits above the site header (z-50) and below the mobile menu
          overlay (z-[70]) — at z-40 the floating nav pill stayed lit on top of
          the dimmed page and the drawer read as half-open. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ease-out-expo motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="bag"
        role="dialog"
        aria-label="Your bag"
        aria-modal={open ? true : undefined}
        className={`fixed z-[65] flex flex-col overflow-hidden border-ink/10 bg-cream-deep transition-transform duration-300 ease-out-expo motion-reduce:transition-none inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t shadow-[0_-18px_60px_rgba(0,0,0,0.4)] ${
          open ? 'translate-y-0' : 'translate-y-full'
        } md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[26rem] md:rounded-none md:rounded-l-2xl md:border-l md:border-t-0 md:shadow-[-18px_0_60px_rgba(0,0,0,0.35)] ${
          open ? 'md:translate-x-0' : 'md:translate-y-0 md:translate-x-full'
        }`}
      >
        <div className="flex-none border-b border-ink/10 px-6 py-4 md:py-5">
          <div
            aria-hidden
            className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-ink/15 md:hidden"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              {/* Paying is its own screen, so it gets its own back control —
                  the old flow buried the only escape in a grey text link under
                  the card, which read as a dead end. */}
              {status === 'paying' && (
                <button
                  type="button"
                  onClick={backToBag}
                  aria-label="Back to bag"
                  className="-ml-2 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/10"
                >
                  <ArrowUpRight className="h-5 w-5 -rotate-[135deg]" />
                </button>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-2xl text-ink">
                  {status === 'paying' ? 'Payment' : 'Your bag'}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {status === 'paying'
                    ? `${itemCount} item${itemCount === 1 ? '' : 's'} · ${formatCents(dueCents)}`
                    : fulfillment === 'SHIPMENT'
                      ? 'Shipped to your door'
                      : `Pick up at ${site.address.street}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={status === 'paying' ? 'Close checkout' : 'Close bag'}
              className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/10 hover:text-ink"
            >
              <Close className="h-5 w-5" />
            </button>
          </div>
        </div>

        {state.lines.length === 0 ? (
          <p className="flex-1 px-6 py-12 text-center text-ink-muted">
            Your bag is empty.
          </p>
        ) : status === 'paying' ? (
          /* -------- PAYMENT SCREEN --------
             A screen of its own, not a panel wedged into the footer on top of
             the still-visible address form. You can see exactly what you are
             buying and where it is going, change either, or leave — the old
             version showed a bare card field with no context, no totals, and
             the only way out was a grey text link below the fold. */
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
            <div className="mt-1 rounded-xl border border-ink/12 bg-cream/60 p-4">
              <ul className="flex flex-col gap-2.5">
                {state.lines.map((line) => (
                  <li key={line.key} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={line.image}
                      alt=""
                      aria-hidden
                      className="h-9 w-9 shrink-0 border border-ink/10 bg-white object-contain p-0.5"
                    />
                    <span className="min-w-0 flex-1 text-sm text-ink">
                      {line.qty > 1 && (
                        <span className="text-ink-muted">{line.qty}&times; </span>
                      )}
                      {line.name}
                      {line.variationName && (
                        <span className="text-ink-muted">
                          {' '}
                          &middot; {line.variationName}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-ink">
                      {formatCents(line.priceCents * line.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 flex flex-col gap-1 border-t border-ink/10 pt-3 text-sm">
                <div className="flex justify-between text-ink-muted">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatCents(subtotal)}</dd>
                </div>
                {fulfillment === 'SHIPMENT' && (
                  <div className="flex justify-between text-ink-muted">
                    <dt>Shipping</dt>
                    <dd>Free</dd>
                  </div>
                )}
                <div className="flex justify-between font-medium text-ink">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatCents(dueCents)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-ink/12 bg-cream/60 p-4">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-ink">
                  {fulfillment === 'SHIPMENT' ? 'Ship to' : 'Pick up'}
                </p>
                <p className="mt-0.5 text-ink-muted">{address.name.trim()}</p>
                <p className="text-ink-muted">{shipToLine}</p>
                <p className="text-ink-muted">{address.email.trim()}</p>
              </div>
              <button
                type="button"
                onClick={backToBag}
                className="shrink-0 rounded-full border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brick hover:bg-brick hover:text-cream"
              >
                Edit
              </button>
            </div>

            <div className="mt-5">
              {/* Card only. The wallets were offered on the bag, before any of
                  this was typed — that's what makes them express. */}
              <SquareCard
                appId={SQ_APP_ID as string}
                locationId={SQ_LOCATION_ID as string}
                env={SQ_ENV}
                amountLabel={formatCents(dueCents)}
                onPaid={onPaid}
                onError={onPayError}
              />
            </div>

            {errorMsg && (
              <p className="mt-3 rounded-lg border border-brick/40 bg-brick/10 px-3 py-2 text-center text-sm text-ink">
                {errorMsg}
              </p>
            )}

            <button
              type="button"
              onClick={backToBag}
              className="mt-4 w-full rounded-full border border-ink/20 py-3 text-sm font-medium text-ink transition-colors hover:border-ink/40"
            >
              Back to bag
            </button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
              <ul className="flex flex-col divide-y divide-ink/10">
                {state.lines.map((line) => (
                  <li key={line.key} className="flex gap-3 py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={line.image}
                      alt=""
                      aria-hidden
                      className="h-14 w-14 shrink-0 border border-ink/10 bg-white object-contain p-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg leading-tight text-ink">
                        {line.name}
                      </p>
                      {line.variationName && (
                        <p className="mt-0.5 text-sm text-ink-muted">
                          {line.variationName}
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

              {/* Where it goes */}
              <div className="mt-1 border-t border-ink/10 pt-5">
                <p className="text-sm font-medium text-ink">How would you like it?</p>
                <div className="mt-2 flex gap-2">
                  {(
                    [
                      { key: 'SHIPMENT' as const, label: 'Ship it' },
                      { key: 'PICKUP' as const, label: 'Pick up in store' },
                    ]
                  ).map((opt) => {
                    const disabled = opt.key === 'SHIPMENT' && !shippable;
                    const active = fulfillment === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={disabled}
                        aria-pressed={active}
                        onClick={() => setPreferred(opt.key)}
                        className={`flex-1 rounded-full border px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'border-brick bg-brick text-cream'
                            : disabled
                              ? 'cursor-not-allowed border-ink/10 text-ink-muted/50'
                              : 'border-ink/15 text-ink hover:border-ink/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {!shippable ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    Gift cards are loaded on the register, so this order is
                    collected in store at {site.address.street} —{' '}
                    {site.hoursSummary}.
                  </p>
                ) : fulfillment === 'PICKUP' ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    We&rsquo;ll have it behind the counter at{' '}
                    {site.address.street} — {site.hoursSummary}. No postage.
                  </p>
                ) : null}

                {/* Totals — deliberately ABOVE the express buttons: the amount
                    a one-tap wallet is about to charge should be the last thing
                    read before tapping it. */}
                <dl className="mt-5 flex flex-col gap-1.5 border-t border-ink/10 pt-4 text-sm">
                  <div className="flex justify-between text-ink-muted">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{formatCents(subtotal)}</dd>
                  </div>
                  {fulfillment === 'SHIPMENT' && (
                    <div className="flex justify-between text-ink-muted">
                      <dt>Shipping</dt>
                      <dd>Free</dd>
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

                {/* Express checkout — before the form, which is the whole
                    point: for a shipment the wallet is asked for the delivery
                    address too, so a one-tap order needs nothing typed. If the
                    wallet comes back without enough to post to, the form below
                    takes over and the token is held, not thrown away. */}
                {SQUARE_READY && status === 'idle' && (
                  <div className="mt-5">
                    <WalletButtons
                      appId={SQ_APP_ID as string}
                      locationId={SQ_LOCATION_ID as string}
                      env={SQ_ENV}
                      amountCents={dueCents}
                      onPaid={onPaid}
                      onError={onPayError}
                      onWalletStart={onWalletStart}
                      referenceId="fusion-coffee-merch"
                      requestShippingContact={fulfillment === 'SHIPMENT'}
                      footnote={
                        fulfillment === 'SHIPMENT'
                          ? 'Your name, email and delivery address come from the wallet.'
                          : 'Your name and email come from the wallet.'
                      }
                      dividerLabel="or check out below"
                    />
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-3">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Full name</span>
                    <input
                      type="text"
                      autoComplete="name"
                      value={address.name}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, name: e.target.value }))
                      }
                      placeholder="First and last"
                      className={field('name')}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={address.email}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, email: e.target.value }))
                      }
                      placeholder="you@example.com"
                      className={field('email')}
                    />
                    <span className="mt-1 block text-xs text-ink-muted">
                      For the receipt{fulfillment === 'SHIPMENT' ? ' and tracking' : ''}.
                    </span>
                  </label>

                  {fulfillment === 'SHIPMENT' && (
                    <>
                      <label className="block">
                        <span className="text-sm font-medium text-ink">Street address</span>
                        <input
                          type="text"
                          autoComplete="address-line1"
                          value={address.line1}
                          onChange={(e) =>
                            setAddress((a) => ({ ...a, line1: e.target.value }))
                          }
                          placeholder="123 Main Street"
                          className={field('line1')}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-ink">
                          Apt, suite <span className="text-ink-muted">(optional)</span>
                        </span>
                        <input
                          type="text"
                          autoComplete="address-line2"
                          value={address.line2}
                          onChange={(e) =>
                            setAddress((a) => ({ ...a, line2: e.target.value }))
                          }
                          className={field('line2')}
                        />
                      </label>
                      <div className="grid grid-cols-6 gap-3">
                        <label className="col-span-3 block">
                          <span className="text-sm font-medium text-ink">City</span>
                          <input
                            type="text"
                            autoComplete="address-level2"
                            value={address.city}
                            onChange={(e) =>
                              setAddress((a) => ({ ...a, city: e.target.value }))
                            }
                            className={field('city')}
                          />
                        </label>
                        <label className="col-span-1 block">
                          <span className="text-sm font-medium text-ink">State</span>
                          <input
                            type="text"
                            autoComplete="address-level1"
                            maxLength={2}
                            value={address.state}
                            onChange={(e) =>
                              setAddress((a) => ({
                                ...a,
                                state: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="IL"
                            className={`${field('state')} uppercase`}
                          />
                        </label>
                        <label className="col-span-2 block">
                          <span className="text-sm font-medium text-ink">ZIP</span>
                          <input
                            type="text"
                            autoComplete="postal-code"
                            inputMode="numeric"
                            value={address.postalCode}
                            onChange={(e) =>
                              setAddress((a) => ({ ...a, postalCode: e.target.value }))
                            }
                            placeholder="62837"
                            className={field('postalCode')}
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-sm font-medium text-ink">
                          Phone <span className="text-ink-muted">(optional)</span>
                        </span>
                        <input
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          value={address.phone}
                          onChange={(e) =>
                            setAddress((a) => ({ ...a, phone: e.target.value }))
                          }
                          className={field('phone')}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

            </div>

            <div className="flex-none border-t border-ink/10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
              {status === 'not_configured' ? (
                <div className="rounded-lg border border-oak/60 bg-oak/15 px-4 py-4 text-sm text-ink">
                  <p className="font-medium">
                    Almost there — payment isn&apos;t switched on yet.
                  </p>
                  <p className="mt-1 text-ink-muted">
                    The shop flow is ready; the last step (Square taking the
                    card) turns on once the shop&apos;s Square keys are
                    connected. Your bag is saved.
                  </p>
                </div>
              ) : status === 'price_changed' ? (
                <div className="rounded-lg border border-brick/40 bg-brick/10 px-4 py-4 text-sm text-ink">
                  <p className="font-medium">Prices changed since this page loaded.</p>
                  <p className="mt-1 text-ink-muted">
                    Nothing was charged. Reload to pick up the current prices,
                    then check out again.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-3 w-full rounded-full bg-brick py-3 text-sm font-medium text-cream transition-colors hover:bg-[#9b4128]"
                  >
                    Reload prices
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={beginCheckout}
                  disabled={status === 'submitting'}
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-brick py-4 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-[#9b4128] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'submitting'
                    ? 'Processing…'
                    : holding
                      ? `Finish payment · ${formatCents(dueCents)}`
                      : `Continue to payment · ${formatCents(dueCents)}`}
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              )}
              {showErrors && problems.length > 0 && status !== 'not_configured' && (
                <p className="mt-2 text-center text-xs text-brick">
                  Add your {fulfillment === 'SHIPMENT' ? 'delivery details' : 'name and email'} to continue.
                </p>
              )}
              {errorMsg && (
                <p className="mt-2 text-center text-xs text-brick">{errorMsg}</p>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Confirmation replaces nothing on the page — it rides above it, because
          the grid behind is still the thing they were shopping. */}
      {status === 'placed' && (
        <section className="bg-espresso py-16 text-cream md:py-24">
          <div className="mx-auto max-w-xl px-5 text-center sm:px-8">
            <p className="eyebrow justify-center text-oak">Order received</p>
            <h2 className="mt-4 font-display text-fluid-xl text-cream">
              Thanks, {address.name.split(' ')[0] || 'friend'}.
            </h2>
            <p className="mt-4 text-cream/70">
              {fulfillment === 'SHIPMENT'
                ? `We're packing it up — a receipt is on its way to ${address.email}, and tracking follows when it ships.`
                : `We'll have it ready at ${site.address.street}. A receipt is on its way to ${address.email}.`}
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus('idle');
                setShowErrors(false);
              }}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3.5 text-sm font-medium text-espresso transition-colors hover:bg-white"
            >
              Keep shopping
            </button>
          </div>
        </section>
      )}
    </>
  );
}

// ---- One product card ----------------------------------------------------

function ProductCard({
  product,
  i,
  onAdd,
}: {
  product: ShopProduct;
  i: number;
  onAdd: (variationId: string) => void;
}) {
  const [variationId, setVariationId] = useState(
    () => product.variations[0]?.id ?? '',
  );
  const [justAdded, setJustAdded] = useState(false);
  const selected = product.variations.find((v) => v.id === variationId);
  const from = fromPriceCents(product);
  // A single "Regular" variation is Square's placeholder for "this item has no
  // options" — no reason to make anyone pick from a list of one.
  const showPicker = product.variations.length > 1;

  function add() {
    if (!selected) return;
    onAdd(selected.id);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1100);
  }

  return (
    <Reveal as="div" delay={(i % 3) * 0.07} y={28} className="h-full">
      <div className="flex h-full flex-col">
        <div className="overflow-hidden border border-ink/10 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.alt}
            loading="lazy"
            className="aspect-square w-full object-contain p-3"
          />
        </div>
        <div className="mt-4 flex flex-1 flex-col">
          {product.brand && (
            <p className="eyebrow text-[0.7rem] text-brick-deep md:text-[0.62rem]">
              {product.brand}
            </p>
          )}
          <h3 className="mt-1 font-display text-xl leading-tight text-ink">
            {product.name}
          </h3>
          <p className="mt-1.5 max-w-xs flex-1 text-pretty text-sm leading-relaxed text-ink-muted">
            {product.blurb}
          </p>

          {product.available ? (
            <>
              <p className="mt-3 text-sm tabular-nums text-ink">
                {selected
                  ? formatCents(selected.priceCents)
                  : from !== null && `from ${formatCents(from)}`}
              </p>
              {showPicker && (
                <label className="mt-2 block">
                  <span className="sr-only">Option for {product.name}</span>
                  <select
                    value={variationId}
                    onChange={(e) => setVariationId(e.target.value)}
                    aria-label={`Option for ${product.name}`}
                    className="w-full rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-xs text-ink outline-none transition-colors focus:border-brick"
                  >
                    {product.variations.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {formatCents(v.priceCents)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={add}
                className={`mt-3 w-full rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                  justAdded
                    ? 'border-sage bg-sage text-cream'
                    : 'border-ink/20 text-ink hover:border-brick hover:bg-brick hover:text-cream'
                }`}
              >
                {justAdded ? 'Added ✓' : 'Add to bag'}
              </button>
            </>
          ) : (
            // No catalog price → no sale. Saying "in store" is the honest
            // version of this state; a made-up number is not.
            <p className="mt-3 rounded-full border border-ink/15 px-4 py-2 text-center text-xs text-ink-muted">
              Available in store
            </p>
          )}
        </div>
      </div>
    </Reveal>
  );
}
