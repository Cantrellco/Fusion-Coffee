'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import SquareCard from '@/components/order/SquareCard';
import { site } from '@/lib/site';
import { formatPrice, PARTY_PRICE_CENTS } from '@/lib/party';
import { SALES_TAX_LABEL } from '@/lib/tax';
import { ArrowUpRight } from '@/components/icons';

const SQ_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
const SQ_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
const SQ_ENV: 'sandbox' | 'production' =
  process.env.NEXT_PUBLIC_SQUARE_ENV === 'production' ? 'production' : 'sandbox';

export type PaidBooking = {
  orderId: string;
  dateKey: string;
  slot: string;
  totalCents: number;
  ledgerWritten: boolean;
};

/**
 * Payment step for a party booking.
 *
 * All sales are final, so this screen has one job beyond taking a card: making
 * sure nobody reaches the charge without having been told that, and recording
 * that they were. The acknowledgment is a hard gate on both sides — the card
 * form does not render until it is ticked, and the Worker refuses a payload
 * without it.
 */
export default function PartyCheckout({
  dateKey,
  slot,
  label,
  onPaid,
  onBack,
}: {
  dateKey: string;
  slot: string;
  label: string;
  onPaid: (booking: PaidBooking) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The order key is stable for THIS booking so a retry after a lost response
  // is idempotent at Square and cannot charge twice. The attempt counter is
  // bumped only after a definite decline: Square rejects a reused key whose
  // body differs, and a second card is a different body, so without it one
  // decline would deadlock this booking forever.
  const orderKey = useRef<string>('');
  if (!orderKey.current) {
    orderKey.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${dateKey}-${slot}-${Math.random().toString(36).slice(2)}`;
  }
  const attempt = useRef(0);

  const contactReady = name.trim().length > 1 && (phone.match(/\d/g) ?? []).length >= 10;
  const ready = contactReady && agreed;

  const configured = Boolean(SQ_APP_ID && SQ_LOCATION_ID);

  const handleToken = useCallback(
    async (sourceId: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch('/api/party-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateKey,
            slot,
            customerName: name.trim(),
            phone: phone.trim(),
            sourceId,
            acknowledged: agreed,
            idempotencyKey: orderKey.current,
            paymentAttempt: attempt.current,
          }),
        });
        const data = (await res.json()) as Record<string, unknown>;

        if (res.ok && data.status === 'paid') {
          onPaid({
            orderId: String(data.orderId),
            dateKey,
            slot,
            totalCents: Number(data.totalCents ?? PARTY_PRICE_CENTS),
            ledgerWritten: data.ledgerWritten !== false,
          });
          return;
        }

        // A declined card is the one case that needs a NEW payment key, or the
        // retry collides with the rejected one.
        if (data.error === 'payment_failed') attempt.current += 1;

        setError(messageFor(String(data.error ?? 'unknown')));
      } catch {
        // Network died mid-flight. The charge may or may not have landed, so
        // this deliberately does NOT bump the attempt counter — a retry reuses
        // the same keys and Square returns the original payment rather than
        // charging again.
        setError(
          'We could not reach the payment service. Check your connection and try once more — you will not be charged twice.',
        );
      } finally {
        setSubmitting(false);
      }
    },
    [agreed, dateKey, name, onPaid, phone, slot],
  );

  const fieldCls =
    'w-full border border-ink/20 bg-cream px-4 py-3 text-ink placeholder:text-ink/40 transition-colors focus:border-brick focus-visible:outline-none';
  const labelCls = 'mb-2 block text-xs uppercase tracking-mega text-ink/50';

  const total = useMemo(() => formatPrice(PARTY_PRICE_CENTS), []);

  return (
    // pointer-events-none while submitting is a money guard: it stops a second
    // click reaching the pay button between the request leaving and the
    // response landing. Do not remove it.
    <div className={submitting ? 'pointer-events-none opacity-60' : ''}>
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="text-xs uppercase tracking-mega text-ink/50 transition-colors hover:text-brick"
      >
        ← Change window
      </button>

      <div className="mt-5 border border-ink/12 bg-cream p-7">
        <p className="eyebrow text-ink/45">Your party</p>
        <p className="mt-3 font-display text-lg leading-snug text-ink">{label}</p>

        <div className="mt-6 flex items-baseline justify-between border-t border-ink/10 pt-5">
          <span className="text-sm text-ink-muted">Private buyout</span>
          <span className="font-display text-2xl text-ink">{total}</span>
        </div>
        <p className="mt-1 text-right text-xs text-ink-muted">plus {SALES_TAX_LABEL} sales tax</p>

        {/* Contact */}
        <div className="mt-7 grid gap-5">
          <div>
            <label htmlFor="party-name" className={labelCls}>
              Name
            </label>
            <input
              id="party-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={fieldCls}
              placeholder="Who's the party for?"
            />
          </div>
          <div>
            <label htmlFor="party-phone" className={labelCls}>
              Phone
            </label>
            <input
              id="party-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              className={fieldCls}
              placeholder="So we can reach you"
            />
          </div>
        </div>

        {/* All sales final */}
        <label className="mt-7 flex cursor-pointer items-start gap-3 border border-ink/12 bg-cream-deep/40 p-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brick"
          />
          <span className="text-sm leading-relaxed text-ink-muted">
            I understand this booking is <strong className="text-ink">final</strong> — the
            date and time are held for me and the payment is not refundable.
          </span>
        </label>

        {/* Card */}
        <div className="mt-7">
          {!configured ? (
            <p className="border border-ink/12 bg-cream-deep/40 p-4 text-sm leading-relaxed text-ink-muted">
              Card payment isn&rsquo;t switched on yet. Email{' '}
              <a href={`mailto:${site.email}`} className="text-brick-deep underline">
                {site.email}
              </a>{' '}
              and we&rsquo;ll book you in.
            </p>
          ) : !ready ? (
            <p className="text-sm leading-relaxed text-ink-muted">
              {contactReady
                ? 'Tick the box above to continue to payment.'
                : 'Add your name and phone number to continue.'}
            </p>
          ) : (
            <SquareCard
              appId={SQ_APP_ID!}
              locationId={SQ_LOCATION_ID!}
              env={SQ_ENV}
              amountLabel={`Pay ${total}`}
              onPaid={handleToken}
              onError={setError}
            />
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 border border-brick/30 bg-brick/[0.06] p-4 text-sm leading-relaxed text-brick-deep"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** Worker error codes → something a customer can act on. */
function messageFor(code: string): string {
  switch (code) {
    case 'slot_taken':
      // Covers a real edge as well as the obvious one. If a payment succeeded
      // but its response was lost in transit, the retry finds the window taken
      // — by the customer's own booking. Telling them only "someone else took
      // it" would leave them believing they were not booked when they were
      // charged, and there is no receipt email to check because booking
      // collects a phone number, not an address.
      return 'That window is no longer available. If you just submitted a payment, call us before trying again — it may have gone through and this could be your own booking.';
    case 'availability_unavailable':
      return 'We could not confirm that window is still free, so we have not charged you. Try again in a moment.';
    case 'payment_failed':
      return 'That card was declined. Try another card — you have not been charged.';
    case 'not_acknowledged':
      return 'Please tick the box confirming the booking is final.';
    case 'missing_contact':
    case 'bad_phone':
      return 'We need a name and a phone number we can reach you on.';
    case 'too_soon':
      return 'That date is no longer bookable. Pick another.';
    case 'not_configured':
      return 'Card payment is temporarily unavailable. Nothing has been charged.';
    default:
      return 'Something went wrong and you have not been charged. Try again, or call us and we will book you in.';
  }
}
