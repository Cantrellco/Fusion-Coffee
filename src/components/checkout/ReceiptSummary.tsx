'use client';

import { formatCents } from '@/lib/order';

// ============================================================
// The order summary on the payment step, drawn as a till receipt.
//
// Two research findings shaped this (Baymard's checkout studies):
//
//   1. On the payment step the summary should be COLLAPSED by default —
//      item count + total, one tap to expand. What earns the screen space
//      there is the payment methods, not a second copy of the cart.
//   2. But it must stay present and one tap away: making the buyer navigate
//      BACK to check what they're paying for is a real dropout risk.
//
// Native <details>/<summary> gives the collapse for free — keyboard and
// screen-reader behavior included, and no state to manage or reset between
// visits to the step.
//
// The receipt styling (paper card, dashed rules, tabular figures, serrated
// bottom edge) is the one decorative flourish of the whole checkout. It earns
// its place by saying something true: this is the moment the order stops being
// a cart and becomes a bill.
// ============================================================

export type ReceiptLine = {
  key: string;
  label: string;
  /** Small print under the label — modifiers, variation, etc. */
  detail?: string;
  qty: number;
  /** Line total (unit × qty), in cents. */
  amountCents: number;
};

export type ReceiptExtra = {
  label: string;
  /** Preformatted — "Free" is a value here, so cents alone can't cover it. */
  value: string;
};

// The receipt paper. Warmer-white than the sheet's cream so it reads as a
// separate object lying on the counter, not another panel.
const PAPER = '#FDFAF3';

export default function ReceiptSummary({
  lines,
  extras = [],
  totalCents,
  note,
}: {
  lines: ReceiptLine[];
  extras?: ReceiptExtra[];
  totalCents: number;
  note?: string;
}) {
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <div>
      <style>{`
        /* Sawtooth bottom edge: one downward tooth per 12px tile. The cone
           opens upward from the bottom-center of each tile, so adjacent teeth
           meet exactly at the top and the strip welds seamlessly to the card. */
        .receipt-teeth {
          height: 6px;
          background: conic-gradient(from -45deg at 50% 100%, ${PAPER} 90deg, transparent 0)
            0 0 / 12px 6px repeat-x;
        }
        .receipt-summary::-webkit-details-marker { display: none; }
        details[open] .receipt-chevron { transform: rotate(180deg); }
      `}</style>

      <details className="group">
        <summary
          className="receipt-summary flex cursor-pointer list-none items-center justify-between gap-3 rounded-t-xl border border-b-0 border-ink/10 px-4 py-3"
          style={{ backgroundColor: PAPER }}
        >
          <span className="flex items-center gap-2 text-sm text-ink">
            <span className="font-medium">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="receipt-chevron h-3.5 w-3.5 text-ink-muted transition-transform duration-200"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
          <span className="text-sm font-medium tabular-nums text-ink">
            {formatCents(totalCents)}
          </span>
        </summary>

        <div
          className="border border-y-0 border-ink/10 px-4 pb-3"
          style={{ backgroundColor: PAPER }}
        >
          <ul className="flex flex-col gap-2 border-t border-dashed border-ink/15 pt-3 text-sm">
            {lines.map((l) => (
              <li key={l.key} className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-ink">
                  <span className="tabular-nums text-ink-muted">{l.qty}×</span>{' '}
                  {l.label}
                  {l.detail && (
                    <span className="block text-xs text-ink-muted">{l.detail}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-ink">
                  {formatCents(l.amountCents)}
                </span>
              </li>
            ))}
          </ul>
          {extras.length > 0 && (
            <dl className="mt-2 flex flex-col gap-1 border-t border-dashed border-ink/15 pt-2 text-sm text-ink-muted">
              {extras.map((x) => (
                <div key={x.label} className="flex justify-between">
                  <dt>{x.label}</dt>
                  <dd className="tabular-nums">{x.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {note && <p className="mt-2 text-xs text-ink-muted">{note}</p>}
        </div>

        {/* The bottom of the receipt while it's open. When collapsed, the
            summary row above carries the teeth instead (its border-b is off,
            and the strip below renders in both states). */}
      </details>
      <div aria-hidden className="receipt-teeth" />
    </div>
  );
}
