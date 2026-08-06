'use client';

import { useState } from 'react';
import { cardLabel, cardExpired, type SavedCard } from '@/lib/savedCard';

// ============================================================
// The one-tap "pay with the card this device remembered" block.
//
// Sits at the top of the payment step, above the wallets. No Square SDK is
// involved: the card already lives at Square, so paying is a single POST to
// /api/checkout carrying the card id and this device's handle. The server
// re-proves the card belongs to that handle before it charges — see
// functions/api/_cards.ts.
//
// Expired cards are shown but not spendable. Square keeps listing a card past
// its expiry date, and silently offering one would turn a fast checkout into a
// decline at the worst moment.
// ============================================================

function Lock({ className = '' }: { className?: string }) {
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
      <rect x="4" y="10.5" width="16" height="10" rx="2.2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cream/40 border-t-cream" />
  );
}

export default function SavedCardBlock({
  card,
  amountLabel,
  busy,
  onPay,
  onForget,
  onUseAnother,
}: {
  card: SavedCard;
  amountLabel: string;
  busy: boolean;
  onPay: () => void;
  onForget: () => void;
  onUseAnother: () => void;
}) {
  const [forgetting, setForgetting] = useState(false);
  const expired = cardExpired(card);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-sage" />
        <p className="text-sm font-medium text-ink">Your saved card</p>
      </div>

      <div className="rounded-xl border border-ink/12 bg-cream/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm tabular-nums text-ink">{cardLabel(card)}</span>
          <span className="text-xs text-ink-muted">
            {expired
              ? 'Expired'
              : card.expMonth
                ? `Exp ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`
                : ''}
          </span>
        </div>
      </div>

      {expired ? (
        <p className="mt-2 text-center text-xs text-brick">
          That card has expired — enter a new one below.
        </p>
      ) : (
        <button
          type="button"
          onClick={onPay}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brick py-4 text-sm font-medium tracking-wide text-cream transition-[background-color,transform] duration-300 ease-out-expo hover:bg-[#9b4128] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:active:scale-100"
        >
          {busy ? (
            <>
              <Spinner />
              Processing…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Pay {amountLabel}
            </>
          )}
        </button>
      )}

      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-ink-muted">
        <button
          type="button"
          onClick={onUseAnother}
          disabled={busy}
          className="underline underline-offset-2 transition-colors hover:text-ink disabled:opacity-50"
        >
          Use a different card
        </button>
        <span aria-hidden>·</span>
        <button
          type="button"
          disabled={busy || forgetting}
          onClick={() => {
            setForgetting(true);
            onForget();
          }}
          className="underline underline-offset-2 transition-colors hover:text-brick disabled:opacity-50"
        >
          {forgetting ? 'Forgetting…' : 'Forget this card'}
        </button>
      </div>

      <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-mega text-ink-muted">
        <span className="h-px flex-1 bg-ink/10" />
        or
        <span className="h-px flex-1 bg-ink/10" />
      </div>
    </div>
  );
}
