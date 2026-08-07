// ============================================================
// Device-remembered ordering preferences — the "zero typing on the second
// visit" layer. Amazon's defaults-plus-Change model, scoped to one device,
// no account anywhere: name for the cup, last tip choice, last pickup slot,
// and the last completed order for one-tap reorder.
//
// Everything here is a CONVENIENCE default, never an authority: prices ride
// through the server's re-pricing on every order, tips are re-clamped
// server-side, and a stale stored order simply triggers the existing
// price_changed panel. Losing this data loses keystrokes, not money.
// ============================================================

import type { CartLine } from '@/lib/order';

const NAME_KEY = 'fusion-name-v1';
const TIP_KEY = 'fusion-tip-v1';
const PICKUP_KEY = 'fusion-pickup-v1';
const LAST_ORDER_KEY = 'fusion-last-order-v1';

/** How the customer chose to tip. `cents` covers both $-presets and custom. */
export type TipChoice =
  | { mode: 'none' }
  | { mode: 'pct'; pct: number }
  | { mode: 'cents'; cents: number };

export type LastOrder = {
  lines: CartLine[];
  tip: TipChoice;
  pickup: string;
  /** What was actually charged, for the reorder pill's label. */
  totalCents: number;
  savedAt: number;
};

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage full / disabled — defaults just won't stick */
  }
}

export function rememberedName(): string {
  return (read(NAME_KEY) ?? '').slice(0, 60);
}

export function rememberName(name: string): void {
  const clean = name.trim().slice(0, 60);
  if (clean) write(NAME_KEY, clean);
}

export function rememberedTip(): TipChoice | null {
  try {
    const raw = read(TIP_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as TipChoice;
    if (t.mode === 'none') return t;
    if (t.mode === 'pct' && Number.isFinite(t.pct) && t.pct > 0 && t.pct <= 50) return t;
    if (t.mode === 'cents' && Number.isInteger(t.cents) && t.cents > 0 && t.cents <= 50000) {
      return t;
    }
    return null;
  } catch {
    return null;
  }
}

export function rememberTip(tip: TipChoice): void {
  write(TIP_KEY, JSON.stringify(tip));
}

export function rememberedPickup(): string {
  return read(PICKUP_KEY) ?? '';
}

export function rememberPickup(pickup: string): void {
  if (pickup) write(PICKUP_KEY, pickup);
}

export function rememberedLastOrder(
  validLine: (l: unknown) => l is CartLine,
): LastOrder | null {
  try {
    const raw = read(LAST_ORDER_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as LastOrder;
    if (!Array.isArray(o.lines) || o.lines.length === 0) return null;
    if (!o.lines.every(validLine)) return null;
    if (!Number.isInteger(o.totalCents) || o.totalCents <= 0) return null;
    return o;
  } catch {
    return null;
  }
}

export function rememberLastOrder(order: LastOrder): void {
  write(LAST_ORDER_KEY, JSON.stringify(order));
}
