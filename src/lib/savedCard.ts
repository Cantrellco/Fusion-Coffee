// ============================================================
// Saved cards — the browser half of "remember my card on this device".
//
// The server half, and the whole reasoning behind the design, lives in
// functions/api/_cards.ts. The short version: there are no accounts on this
// site, so a device identifies itself with one opaque random handle kept in
// localStorage. Square holds the mapping.
//
// ⚠️ The handle is a credential — whoever has this browser can spend the card
// behind it. That is why it is only ever offered on café orders (pickup, and
// capped server-side), never on /merch, and why "Forget this card" disables the
// card at Square rather than just deleting the local copy. Clearing the handle
// alone would leave a live card on file that the customer thinks they removed.
// ============================================================

const HANDLE_KEY = 'fusion-device-v1';

export type SavedCard = {
  cardId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

/**
 * This device's handle, minted on first use.
 *
 * `crypto.getRandomValues`, not Math.random or a timestamp: this string is the
 * only thing standing between a stranger and someone's saved card, so it must
 * not be guessable from when the visit happened.
 */
export function deviceHandle(): string {
  try {
    const existing = window.localStorage.getItem(HANDLE_KEY);
    if (existing && /^fc_[0-9a-f]{32,64}$/.test(existing)) return existing;
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const handle = `fc_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
    window.localStorage.setItem(HANDLE_KEY, handle);
    return handle;
  } catch {
    // Private mode, or storage disabled. Saving a card can't work without
    // somewhere to keep the handle, so callers treat '' as "not available".
    return '';
  }
}

/** The card this device saved, or null. Never throws — this is decoration. */
export async function fetchSavedCard(handle: string): Promise<SavedCard | null> {
  if (!handle) return null;
  try {
    const res = await fetch(`/api/saved-card?h=${encodeURIComponent(handle)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { card?: SavedCard | null };
    return data.card ?? null;
  } catch {
    return null;
  }
}

/** Disable the card at Square. Local state should only clear if this succeeds. */
export async function forgetSavedCard(
  handle: string,
  cardId: string,
): Promise<boolean> {
  try {
    const res = await fetch('/api/saved-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ h: handle, cardId }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { forgotten?: boolean };
    return data.forgotten === true;
  } catch {
    return false;
  }
}

const BRAND_LABELS: Record<string, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMERICAN_EXPRESS: 'Amex',
  DISCOVER: 'Discover',
  DISCOVER_DINERS: 'Diners',
  JCB: 'JCB',
  CHINA_UNIONPAY: 'UnionPay',
  SQUARE_GIFT_CARD: 'Gift card',
};

/** "Visa ···· 4242" — what the customer recognises, and nothing more. */
export function cardLabel(card: SavedCard): string {
  const brand = BRAND_LABELS[card.brand] ?? 'Card';
  return `${brand} ···· ${card.last4}`;
}

/** True once the month has fully passed. Square keeps expired cards listed. */
export function cardExpired(card: SavedCard, now = new Date()): boolean {
  if (!card.expYear || !card.expMonth) return false;
  const lastValid = new Date(card.expYear, card.expMonth, 1);
  return now >= lastValid;
}
