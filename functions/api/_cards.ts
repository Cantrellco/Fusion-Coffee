// ============================================================
// Saved cards — the Square half of "remember my card on this device".
//
// Shared by /api/checkout (saves and spends) and /api/saved-card (shows and
// forgets). Underscore-prefixed so Cloudflare Pages treats it as a module and
// not as a route of its own.
//
// ── HOW A DEVICE IS IDENTIFIED ──────────────────────────────────────────────
// There are no accounts on this site. The browser generates one opaque random
// handle, keeps it in localStorage, and sends it up; Square itself stores the
// mapping, as a Customer whose `reference_id` IS that handle. No database, on
// either Cloudflare account.
//
// ⚠️ THE HANDLE IS A CREDENTIAL. Anyone holding it can charge the card behind
// it — that is the accepted trade of "no login". It is deliberately bounded:
//
//   * café orders only. /merch ships goods to an address and is not offered
//     this; a stolen handle there would be worth stealing.
//   * SAVED_CARD_MAX_CENTS caps what one may charge, so the worst case is a
//     few drinks and not an open bar tab.
//   * the card id from the browser is never trusted on its own — it is checked
//     against the cards Square lists for THAT handle's customer before any
//     charge (see resolveSavedCard).
//   * the handle is random, from crypto.getRandomValues, and never derived
//     from an email or phone number that someone could guess.
//
// ── WHY THE CARD IS SAVED FROM THE PAYMENT, NOT THE TOKEN ───────────────────
// A Web Payments SDK token is single use: spend it on the payment and it can't
// also create a card. CreateCard accepts "a card nonce or a payment id", so we
// charge first and then hand Square the finished payment's id. That ordering is
// the safety property that matters — saving a card happens strictly AFTER the
// money is taken, so any failure to save can never cost a sale.
// ============================================================

export const SQUARE_VERSION = '2025-10-16';

/** The most a remembered card may be charged in one go, in cents. */
export const SAVED_CARD_MAX_CENTS = 10000;

export type SquareCtx = {
  base: string;
  headers: Record<string, string>;
};

export type SavedCardSummary = {
  cardId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

type SquareCard = {
  id?: string;
  card_brand?: string;
  last_4?: string;
  exp_month?: number;
  exp_year?: number;
  enabled?: boolean;
  customer_id?: string;
};

/**
 * A device handle has to look like something we minted. Rejecting anything
 * else keeps junk out of the seller's Customer Directory — a search endpoint
 * fed arbitrary strings is a free way to make a mess of it.
 */
export function validHandle(handle: unknown): handle is string {
  return typeof handle === 'string' && /^fc_[0-9a-f]{32,64}$/.test(handle);
}

/** The Square customer this device handle belongs to, or null if it's new. */
export async function findCustomerId(
  sq: SquareCtx,
  handle: string,
): Promise<string | null> {
  const res = await fetch(`${sq.base}/v2/customers/search`, {
    method: 'POST',
    headers: sq.headers,
    body: JSON.stringify({
      limit: 1,
      query: { filter: { reference_id: { exact: handle } } },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { customers?: { id?: string }[] };
  return data.customers?.[0]?.id ?? null;
}

/** Find the device's customer, creating one the first time. */
export async function ensureCustomerId(
  sq: SquareCtx,
  handle: string,
  displayName: string,
): Promise<string | null> {
  const existing = await findCustomerId(sq, handle);
  if (existing) return existing;

  const res = await fetch(`${sq.base}/v2/customers`, {
    method: 'POST',
    headers: sq.headers,
    body: JSON.stringify({
      idempotency_key: `cust-${handle}`.slice(0, 45),
      reference_id: handle,
      given_name: displayName.slice(0, 60) || 'Website guest',
      note: 'Created by fusioncoffeeshop.com so this device could save a card.',
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { customer?: { id?: string } };
  return data.customer?.id ?? null;
}

/** Every enabled card Square holds for a customer, newest last. */
export async function listCards(
  sq: SquareCtx,
  customerId: string,
): Promise<SavedCardSummary[]> {
  const res = await fetch(
    `${sq.base}/v2/cards?customer_id=${encodeURIComponent(customerId)}`,
    { headers: sq.headers },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { cards?: SquareCard[] };
  return (data.cards ?? [])
    .filter((c) => c.enabled !== false && typeof c.id === 'string')
    .map((c) => ({
      cardId: c.id as string,
      brand: c.card_brand ?? 'CARD',
      last4: c.last_4 ?? '••••',
      expMonth: c.exp_month ?? 0,
      expYear: c.exp_year ?? 0,
    }));
}

/**
 * Prove a card id the BROWSER sent really belongs to the device that sent it.
 *
 * Without this the saved-card path would charge any card id handed to it, and
 * a card id is exactly the sort of thing that leaks. Returns the customer id to
 * charge against, or null — and null must mean "fall back to asking for a
 * card", never "charge it anyway".
 */
export async function resolveSavedCard(
  sq: SquareCtx,
  handle: string,
  cardId: string,
): Promise<{ customerId: string; card: SavedCardSummary } | null> {
  const customerId = await findCustomerId(sq, handle);
  if (!customerId) return null;
  const card = (await listCards(sq, customerId)).find((c) => c.cardId === cardId);
  return card ? { customerId, card } : null;
}

/**
 * Store the card that just paid, against this device's customer.
 *
 * Returns the masked summary, or null if anything at all went wrong. EVERY
 * caller must treat null as "the order still succeeded, we just won't offer
 * this card next time" — this runs after the money is taken and must never
 * turn a completed sale into an error.
 */
export async function saveCardFromPayment(
  sq: SquareCtx,
  handle: string,
  paymentId: string,
  cardholderName: string,
): Promise<SavedCardSummary | null> {
  try {
    const customerId = await ensureCustomerId(sq, handle, cardholderName);
    if (!customerId) return null;

    const res = await fetch(`${sq.base}/v2/cards`, {
      method: 'POST',
      headers: sq.headers,
      body: JSON.stringify({
        // Keyed on the payment: a retried request cannot mint a second copy of
        // the same card.
        idempotency_key: `card-${paymentId}`.slice(0, 45),
        source_id: paymentId,
        card: {
          customer_id: customerId,
          ...(cardholderName ? { cardholder_name: cardholderName.slice(0, 96) } : {}),
        },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { card?: SquareCard };
    const c = data.card;
    if (!c?.id) return null;
    return {
      cardId: c.id,
      brand: c.card_brand ?? 'CARD',
      last4: c.last_4 ?? '••••',
      expMonth: c.exp_month ?? 0,
      expYear: c.exp_year ?? 0,
    };
  } catch {
    return null;
  }
}

/** Forget a card: disabled at Square, so the id left on the device is inert. */
export async function disableCard(sq: SquareCtx, cardId: string): Promise<boolean> {
  const res = await fetch(
    `${sq.base}/v2/cards/${encodeURIComponent(cardId)}/disable`,
    { method: 'POST', headers: sq.headers },
  );
  return res.ok;
}
