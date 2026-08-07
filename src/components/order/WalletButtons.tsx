'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { normalizeStateCode } from '@/lib/shop';

// ============================================================
// Express checkout — the three one-tap wallets, in this order:
//
//   1. Apple Pay      — Safari / iOS, registered domain only
//   2. Google Pay     — any HTTPS host
//   3. Cash App Pay   — any HTTPS host (this is Square's OWN wallet; the Web
//                       Payments SDK has no separate "Square Pay" method, so
//                       Cash App Pay is what "pay with Square" resolves to)
//
// This sits ABOVE the checkout form, on the cart itself: the whole point of an
// express wallet is that the customer never types anything. Each wallet
// tokenizes on the device and hands back a payment token PLUS the buyer's
// contact details, which stand in for the form — name for a café order, name +
// email + delivery address for merch. The token then goes to the SAME onPaid()
// the card form uses, so the server charge (functions/api/checkout.ts) is
// unchanged; it just gets a different source_id.
//
// SAFETY: every wallet is initialized in its own try/catch. If a wallet is
// unavailable (wrong device/browser) or errors, it's silently skipped — it can
// NEVER break the form below it. If no wallet is available, this renders
// nothing and the ordinary checkout stands alone.
//
// ⚠️ Apple Pay only appears in Safari/iOS AND only once the live domain is
// registered for Apple Pay in Square (a post-domain-flip step). Google Pay and
// Cash App Pay work on any HTTPS host.
//
// CASH APP ON MOBILE leaves the site: it deep-links into the Cash App and
// sends the buyer back to `redirectURL`, and only then does `ontokenization`
// fire. That means this component has to be MOUNTED again when they land back.
// It is — it lives on the cart, and the cart survives in localStorage. What the
// pages add on top is `onWalletStart`, fired the moment a wallet is tapped, so
// they can note that a round trip is in flight and reopen the cart on return
// instead of dropping the customer on the menu.
//
// UNIFORM BUTTONS: all three vendors render their own artwork at their own size
// (Apple 44px, Google 40px, Cash App 48px, three different corner radii). Each
// is dropped into a fixed 48px pill "slot" that clips it to one shape, and the
// CSS below forces the vendor markup to fill that slot. Restyling their marks
// any further than size/shape is against all three brand guidelines.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Square?: any;
  }
}

/**
 * What a wallet told us about the buyer, flattened into the shape the checkout
 * forms use. Every field can be empty — how much a wallet returns depends on
 * the wallet, the device, and what we asked for. Callers must treat it as a
 * best effort and fall back to their own form.
 */
export type WalletContact = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  /** Cash App only: "$cashtag". A usable order name when nothing else is. */
  cashtag: string;
};

const EMPTY_CONTACT: WalletContact = {
  name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  cashtag: '',
};

/**
 * Flatten a Square TokenDetails into a WalletContact.
 *
 * Address fields come from ONE source — the shipping contact if it carries
 * street lines, otherwise the billing contact — because merging a shipping city
 * with a billing postcode invents an address nobody lives at. Name, email and
 * phone can come from either, since those don't have to agree to be right.
 */
export function walletContact(details: any): WalletContact {
  if (!details) return EMPTY_CONTACT;
  const shipping = details.shipping?.contact ?? null;
  const billing = details.billing ?? null;
  const hasLines = (c: any) => Array.isArray(c?.addressLines) && c.addressLines.length > 0;
  const addr = hasLines(shipping) ? shipping : hasLines(billing) ? billing : null;
  const lines: string[] = (addr?.addressLines ?? []).filter(Boolean);
  const either = (key: string) =>
    String(shipping?.[key] ?? billing?.[key] ?? '').trim();

  const cashtag = String(details.cashAppPay?.cashtag ?? '').trim();
  const given = either('givenName');
  const family = either('familyName');
  const name = [given, family].filter(Boolean).join(' ').trim();

  return {
    // The cashtag is a real, human-readable handle — a better name to shout
    // across the bar than nothing at all.
    name: name || cashtag,
    email: either('email'),
    phone: either('phone'),
    line1: (lines[0] ?? '').trim(),
    line2: lines.slice(1).join(', ').trim(),
    city: String(addr?.city ?? '').trim(),
    // Wallets return either "IL" or "Illinois" depending on the platform; the
    // checkout (and Square) want the two-letter code.
    state: normalizeStateCode(String(addr?.state ?? '')),
    postalCode: String(addr?.postalCode ?? '').trim(),
    cashtag,
  };
}

const SDK_SRC = {
  sandbox: 'https://sandbox.web.squarecdn.com/v1/square.js',
  production: 'https://web.squarecdn.com/v1/square.js',
} as const;

function loadSquare(env: 'sandbox' | 'production'): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.Square) return resolve(window.Square);
    const src = SDK_SRC[env];
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Square));
      existing.addEventListener('error', () => reject(new Error('sdk')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(window.Square);
    s.onerror = () => reject(new Error('sdk'));
    document.head.appendChild(s);
  });
}

export default function WalletButtons({
  appId,
  locationId,
  env,
  amountCents,
  onPaid,
  onError,
  onWalletStart,
  referenceId = 'fusion-coffee-order',
  requestShippingContact = false,
  breakdown,
  label = 'Express checkout',
  footnote,
  dividerLabel,
}: {
  appId: string;
  locationId: string;
  env: 'sandbox' | 'production';
  amountCents: number;
  /**
   * A wallet paid. `contact` is whatever the wallet knew about the buyer —
   * possibly nothing. MUST be a stable identity (useCallback with no changing
   * deps, or a latest-value ref), or every parent render tears the wallets down
   * and re-attaches them.
   */
  onPaid: (sourceId: string, contact: WalletContact) => void;
  onError: (message: string) => void;
  /** A wallet was tapped — the buyer may now leave the page (Cash App). */
  onWalletStart?: () => void;
  /** Rides along to Square so café and merch orders are told apart. */
  referenceId?: string;
  /**
   * Cost rows mirrored into the wallet's own sheet (Apple HIG: cost rows
   * only, never a product list). When present, the Face ID sheet shows the
   * exact Subtotal / Tip / Tax the page's receipt shows — the strongest
   * trust signal available, and free.
   */
  breakdown?: { subtotalCents: number; tipCents: number; taxCents: number };
  /** Ask the wallet for a delivery address. Merch shipments only. */
  requestShippingContact?: boolean;
  label?: string;
  /** Small print under the buttons, e.g. what the wallet will fill in. */
  footnote?: string;
  /**
   * Rule + caption separating the wallets from the manual checkout. Rendered
   * here rather than by the page because only this component knows whether any
   * wallet actually turned up — a divider under nothing is a dangling line.
   */
  dividerLabel?: string;
}) {
  const applePay = useRef<any>(null);
  // One tap = one token. Without this a double-tap on Google Pay can tokenize
  // twice, and the second token would ride a fresh idempotency key.
  const tokenizing = useRef(false);
  // Square's attach() takes a CSS selector, so the two containers need ids that
  // are unique per instance — /order and /merch both mount this component, and
  // a duplicate id would attach the second page's wallet to the first's div.
  // useId() emits characters that are illegal in a selector (":" / "«»").
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gpayId = `wallet-gpay-${uid}`;
  const cashId = `wallet-cashapp-${uid}`;
  // Primitives, not the object: a fresh `breakdown` literal on an unrelated
  // parent render (an error message appearing, say) must not tear down and
  // re-attach every wallet mid-payment. Only the NUMBERS changing matters.
  const bSub = breakdown?.subtotalCents ?? -1;
  const bTip = breakdown?.tipCents ?? -1;
  const bTax = breakdown?.taxCents ?? -1;
  const [avail, setAvail] = useState({ apple: false, google: false, cashapp: false });
  // True once every wallet has had its turn to initialize.
  //
  // Until then NOTHING here may be display:none. Google Pay measures its
  // container during attach() and renders nothing into a hidden one — which is
  // exactly what an `avail.google ? ... : 'hidden'` class does on the first
  // render, before attach has told us google is available. The containers stay
  // in the flow, empty and zero-height, and only collapse once the answer is in.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    const amount = (amountCents / 100).toFixed(2);

    (async () => {
      let Square: any;
      try {
        Square = await loadSquare(env);
      } catch {
        return; // SDK failed — no wallets; the ordinary checkout still works.
      }
      if (cancelled || !Square) return;
      const payments = Square.payments(appId, locationId);
      // A fresh paymentRequest per wallet, built for the current total. Square
      // requires rebuilding the request whenever the amount changes.
      //
      // requestBillingContact is what makes the wallet hand back a name — the
      // one thing the café checkout cannot do without. requestShippingContact
      // additionally makes it collect a delivery address, which is only honest
      // to ask for when something is actually being posted.
      const money = (cents: number) => (cents / 100).toFixed(2);
      const req = () =>
        payments.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: { amount, label: 'Fusion Coffee' },
          ...(bSub >= 0
            ? {
                lineItems: [
                  { label: 'Subtotal', amount: money(bSub) },
                  ...(bTip > 0 ? [{ label: 'Tip', amount: money(bTip) }] : []),
                ],
                ...(bTax > 0
                  ? { taxLineItems: [{ label: 'Tax', amount: money(bTax) }] }
                  : {}),
              }
            : {}),
          requestBillingContact: true,
          ...(requestShippingContact ? { requestShippingContact: true } : {}),
        });

      // ---- Apple Pay (Safari/iOS + registered domain only) ----
      try {
        const ap = await payments.applePay(req());
        applePay.current = ap;
        cleanups.push(() => {
          applePay.current = null;
          void ap.destroy?.();
        });
        if (!cancelled) setAvail((a) => ({ ...a, apple: true }));
      } catch {
        /* not available */
      }

      // ---- Google Pay ----
      try {
        const gp = await payments.googlePay(req());
        const el = document.getElementById(gpayId);
        if (el) {
          await gp.attach(`#${gpayId}`, {
            buttonColor: 'black',
            buttonType: 'pay',
            // 'fill' lets the button take the size of the slot instead of
            // Google's own 40px default, which is how it ends up the same
            // height as the other two.
            buttonSizeMode: 'fill',
          });
          const handler = async (event: Event) => {
            event.preventDefault();
            if (tokenizing.current) return;
            tokenizing.current = true;
            onWalletStart?.();
            try {
              const r = await gp.tokenize();
              if (r.status === 'OK') {
                onPaid(r.token as string, walletContact(r.details));
                return; // token spent — stay locked, this instance is done.
              }
              tokenizing.current = false;
            } catch {
              tokenizing.current = false;
              onError('Google Pay could not be completed. Try a card instead.');
            }
          };
          el.addEventListener('click', handler);
          cleanups.push(() => {
            el.removeEventListener('click', handler);
            void gp.destroy?.();
            el.innerHTML = '';
          });
          if (!cancelled) setAvail((a) => ({ ...a, google: true }));
        }
      } catch {
        /* not available */
      }

      // ---- Cash App Pay (Square's own wallet) ----
      try {
        const cap = await payments.cashAppPay(req(), {
          // Where the Cash App sends a MOBILE buyer back to. Same URL, so the
          // page reloads into a restored cart and this listener is live again
          // when the token arrives.
          redirectURL: window.location.href,
          referenceId,
        });
        cap.addEventListener('ontokenization', (event: any) => {
          const tr = event?.detail?.tokenResult;
          if (tr?.status === 'OK') {
            if (tokenizing.current) return;
            tokenizing.current = true;
            onPaid(tr.token as string, walletContact(tr.details));
          }
        });
        const el = document.getElementById(cashId);
        if (el) {
          await cap.attach(`#${cashId}`, { shape: 'round', width: 'full' });
          const started = () => onWalletStart?.();
          // CAPTURE phase, deliberately. On the way down this always runs
          // before Cash App's own handler; on the way up it can lose — a
          // tokenization that fires synchronously unmounts this component
          // mid-propagation, and the cleanup below then removes this very
          // listener before the event ever reaches it.
          el.addEventListener('click', started, true);
          cleanups.push(() => {
            el.removeEventListener('click', started, true);
            try {
              void cap.destroy?.();
            } catch {
              /* already gone */
            }
          });
          if (!cancelled) setAvail((a) => ({ ...a, cashapp: true }));
        }
      } catch {
        /* not available */
      }

      if (!cancelled) setSettled(true);
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
    };
  }, [
    appId,
    locationId,
    env,
    amountCents,
    bSub,
    bTip,
    bTax,
    referenceId,
    requestShippingContact,
    gpayId,
    cashId,
    onPaid,
    onError,
    onWalletStart,
  ]);

  async function payApple() {
    if (!applePay.current || tokenizing.current) return;
    tokenizing.current = true;
    onWalletStart?.();
    try {
      const r = await applePay.current.tokenize();
      if (r.status === 'OK') {
        onPaid(r.token as string, walletContact(r.details));
        return;
      }
      tokenizing.current = false;
    } catch {
      tokenizing.current = false;
      onError('Apple Pay could not be completed. Try a card instead.');
    }
  }

  const any = avail.apple || avail.google || avail.cashapp;
  /** Sized pill once the wallet is in; out of the layout once we know it isn't. */
  const slot = (ok: boolean) => (ok ? 'wallet-slot' : settled ? 'hidden' : undefined);

  return (
    <div className={settled && !any ? 'hidden' : undefined}>
      {/* Each vendor draws its own mark at its own size. `.wallet-slot` clips
          all three to one 48px pill so the row reads as one control group. */}
      <style>{`
        .wallet-slot {
          height: 3rem;
          border-radius: 9999px;
          overflow: hidden;
        }
        .wallet-slot > *,
        .wallet-slot > * > * { height: 100%; }
        .apple-pay-button {
          -webkit-appearance: -apple-pay-button;
          -apple-pay-button-type: plain;
          -apple-pay-button-style: black;
          height: 3rem;
          width: 100%;
          border-radius: 9999px;
          cursor: pointer;
        }
        .wallet-slot .gpay-button {
          height: 3rem !important;
          width: 100% !important;
          border-radius: 9999px !important;
        }
        .wallet-slot .gpay-button-fill,
        .wallet-slot #cash_app_pay_v1_element,
        .wallet-slot #cash_app_pay_v1_element > div {
          height: 100% !important;
        }
        .wallet-slot #cash_app_pay_v1_element button,
        .wallet-slot #cash_app_pay_v1_element iframe {
          height: 3rem !important;
          border-radius: 9999px !important;
        }
      `}</style>

      <div className="mb-2 flex items-center gap-2">
        <Bolt className="h-3.5 w-3.5 text-brick" />
        <p className="text-sm font-medium text-ink">{label}</p>
      </div>

      {/* The gap only arrives with `settled`, so the empty pre-attach
          containers don't push a stripe of dead space through the cart. */}
      <div className={`flex flex-col ${settled ? 'gap-2' : ''}`}>
        {avail.apple && (
          <div className="wallet-slot">
            <button
              type="button"
              onClick={payApple}
              aria-label="Pay with Apple Pay"
              className="apple-pay-button"
            />
          </div>
        )}
        {/* Google Pay and Cash App Pay attach their own buttons straight into
            these — the slot class goes ON the container rather than around it,
            so there is no hidden ancestor at attach time. */}
        <div id={gpayId} className={slot(avail.google)} />
        <div id={cashId} className={slot(avail.cashapp)} />
      </div>

      {/* Cash App Pay leaves the site (deep-links into the Cash App on a
          phone). Baymard's no-surprise-redirects rule: say so before the tap,
          not after. */}
      {avail.cashapp && (
        <p className="mt-1.5 text-center text-[11px] text-ink-muted">
          Cash App Pay opens the Cash App to approve.
        </p>
      )}

      {footnote && (
        <p className="mt-2 text-center text-xs text-ink-muted">{footnote}</p>
      )}

      {dividerLabel && (
        <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-mega text-ink-muted">
          <span className="h-px flex-1 bg-ink/10" />
          {dividerLabel}
          <span className="h-px flex-1 bg-ink/10" />
        </div>
      )}
    </div>
  );
}

function Bolt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 2 4 13.5h6L9.5 22 20 10.5h-6.5L13.5 2z" />
    </svg>
  );
}
