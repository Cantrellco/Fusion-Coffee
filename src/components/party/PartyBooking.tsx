'use client';

import { useCallback, useEffect, useState } from 'react';
import PartyCalendar from './PartyCalendar';
import PartyCheckout, { type PaidBooking } from './PartyCheckout';
import { site } from '@/lib/site';
import { formatPrice } from '@/lib/party';

type Stage =
  | { name: 'picking' }
  | { name: 'paying'; dateKey: string; slot: string; label: string }
  | { name: 'done'; booking: PaidBooking; label: string };

/**
 * Owns the whole booking flow: availability → pick → pay → confirmed.
 *
 * Availability is fetched client-side rather than baked in, because this is a
 * static export — anything rendered at build time would be as stale as the last
 * deploy. Until it arrives the calendar shows every window as open, which is
 * safe: the Worker re-reads the ledger and refuses a taken slot before a cent
 * moves, so the worst case is being told "just taken" at the payment step
 * rather than seeing it greyed out a moment earlier.
 */
export default function PartyBooking() {
  const [ledgerRaw, setLedgerRaw] = useState('');
  const [stage, setStage] = useState<Stage>({ name: 'picking' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/party-availability');
        if (!res.ok) return;
        const data = (await res.json()) as { available?: boolean; ledger?: string };
        // `available: false` means the bridge could not answer. Leave the
        // ledger empty rather than guessing — see the note above.
        if (!cancelled && data.available && typeof data.ledger === 'string') {
          setLedgerRaw(data.ledger);
        }
      } catch {
        /* offline or blocked — calendar still works, server still guards */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCheckout = useCallback(
    (booking: { dateKey: string; slot: string; label: string }) => {
      setStage({ name: 'paying', ...booking });
      // The payment panel replaces the summary in place; on a phone that is
      // below the fold at the moment it appears.
      requestAnimationFrame(() => {
        document.getElementById('party-pay')?.scrollIntoView({ block: 'nearest' });
      });
    },
    [],
  );

  const handlePaid = useCallback(
    (booking: PaidBooking) => {
      setStage((prev) => ({
        name: 'done',
        booking,
        label: prev.name === 'paying' ? prev.label : `${booking.dateKey} · ${booking.slot}`,
      }));
    },
    [],
  );

  if (stage.name === 'done') {
    return <Confirmation booking={stage.booking} label={stage.label} />;
  }

  if (stage.name === 'paying') {
    return (
      <div id="party-pay" className="mx-auto max-w-md scroll-mt-28">
        <PartyCheckout
          dateKey={stage.dateKey}
          slot={stage.slot}
          label={stage.label}
          onPaid={handlePaid}
          onBack={() => setStage({ name: 'picking' })}
        />
      </div>
    );
  }

  return <PartyCalendar ledgerRaw={ledgerRaw} onCheckout={handleCheckout} />;
}

function Confirmation({ booking, label }: { booking: PaidBooking; label: string }) {
  return (
    <div className="mx-auto max-w-xl animate-fade-up border border-ink/12 bg-cream p-8 text-center sm:p-12">
      <p className="eyebrow text-brick-deep">You&rsquo;re booked</p>
      <h3 className="mt-4 text-balance font-display text-fluid-lg leading-tight text-ink">
        The café is yours.
      </h3>
      <p className="mt-4 font-display text-lg text-ink">{label}</p>

      <dl className="mx-auto mt-8 max-w-xs divide-y divide-ink/10 border-y border-ink/10 text-left">
        <div className="flex items-baseline justify-between py-3">
          <dt className="text-sm text-ink-muted">Paid</dt>
          <dd className="font-display text-lg text-ink">{formatPrice(booking.totalCents)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-sm text-ink-muted">Order</dt>
          <dd className="break-all text-right text-xs text-ink-muted">{booking.orderId}</dd>
        </div>
      </dl>

      {/* Deliberately does NOT promise a receipt email: booking collects a name
          and a phone number only, so Square has no address to send one to.
          Saying otherwise sends people hunting through their inbox. */}
      <p className="mx-auto mt-6 max-w-md text-pretty text-sm leading-relaxed text-ink-muted">
        Keep this order number for your records. Your barista will have the bar
        ready — we&rsquo;ll call before the day to sort drinks and anything you
        want set up.
      </p>

      {/* The one case staff must fix by hand: the payment landed but the window
          did not get blocked, so both storefronts still think it is free. Told
          plainly rather than hidden — the customer is booked either way, and
          knowing lets them chase it if nobody calls. */}
      {!booking.ledgerWritten && (
        <p className="mx-auto mt-6 max-w-md border border-brick/30 bg-brick/[0.06] p-4 text-left text-sm leading-relaxed text-brick-deep">
          Your payment went through and your date is held, but our calendar
          didn&rsquo;t update automatically. Please{' '}
          <a href={`mailto:${site.email}`} className="underline">
            email us
          </a>{' '}
          or call {site.phone} so we can confirm it by hand.
        </p>
      )}
    </div>
  );
}
