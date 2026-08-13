// ============================================================
// Private party checkout.
//
// Sells ONE thing: a two-hour buyout of the whole café, flat price, paid in
// full, all sales final. No cart, no tip, no shipping, no saved cards.
//
// Deliberately a separate Worker from checkout.ts rather than a third `kind`
// on it. That file moves real café and merch money every day and has shipped
// broken once; a booking flow with an entirely different shape has no business
// sharing its branches. What MUST NOT drift — the sales tax object and the
// idempotency contract — is imported and mirrored rather than re-invented.
//
// ── THE ORDER OF OPERATIONS IS THE DESIGN ───────────────────────────────────
//   1. validate everything, server-side, trusting nothing from the client
//   2. read the shared ledger; refuse if it cannot be read
//   3. create the Square order
//   4. take the payment
//   5. append to the ledger — best effort, AFTER the money
//
// Step 5 cannot be allowed to fail the response: the card has already been
// charged, and answering with an error would tell a paying customer their
// party did not book. It reports `ledgerWritten: false` instead, which is the
// one case staff must fix by hand.
// ============================================================

import {
  PARTY_PRICE_CENTS,
  parseLedger,
  slotStartISO,
  validateBooking,
} from '../../src/lib/party';
import { salesTax, taxableLine } from '../../src/lib/tax';
import { appendLedger, readLedger, shopifyConfigured, type ShopifyEnv } from './_shopify';

type Ctx = {
  request: Request;
  env: ShopifyEnv & {
    SQUARE_ACCESS_TOKEN?: string;
    SQUARE_LOCATION_ID?: string;
    SQUARE_ENVIRONMENT?: string;
    /** Sandbox-only override; unset means the production tax object. */
    SQUARE_TAX_OBJECT_ID?: string;
  };
};

type PartyBody = {
  /** `YYYY-MM-DD`. */
  dateKey?: string;
  /** Must match a slot label this weekday actually offers. */
  slot?: string;
  customerName?: string;
  phone?: string;
  /** Web Payments SDK card token. */
  sourceId?: string;
  /** Reused across a retry so a flaky connection cannot double-charge. */
  idempotencyKey?: string;
  /** Bumped only after a definite decline, so a second card gets a fresh key. */
  paymentAttempt?: number;
  /** The customer ticked the all-sales-final box. Recorded on the order. */
  acknowledged?: boolean;
};

const SQUARE_VERSION = '2025-10-16';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const squareBase = (env: Ctx['env']) =>
  (env.SQUARE_ENVIRONMENT ?? 'sandbox') === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

export const onRequest = async (ctx: Ctx): Promise<Response> =>
  ctx.request.method === 'POST' ? onRequestPost(ctx) : json({ error: 'method_not_allowed' }, 405);

export const onRequestPost = async (ctx: Ctx): Promise<Response> => {
  const { env, request } = ctx;

  let body: PartyBody;
  try {
    body = (await request.json()) as PartyBody;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'bad_request' }, 400);
  }

  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    return json({ error: 'not_configured' }, 501);
  }

  // Configured server + no card token means the browser could not build a card
  // form — the build-time NEXT_PUBLIC_SQUARE_* values are missing or stale
  // while these runtime secrets are live. Continuing would create a real,
  // UNPAYABLE booking that blocks a date nobody paid for. Same guard, and same
  // reasoning, as checkout.ts.
  if (!body.sourceId) return json({ error: 'not_configured' }, 501);

  const name = (body.customerName ?? '').trim();
  const phone = (body.phone ?? '').trim();
  if (!name || !phone) return json({ error: 'missing_contact' }, 400);
  // Not a format check — just enough digits to be a real callback number.
  if ((phone.match(/\d/g) ?? []).length < 10) return json({ error: 'bad_phone' }, 400);

  // All sales are final, so the acknowledgment is the shop's evidence the
  // customer was told before the card was charged. No tick, no sale.
  if (body.acknowledged !== true) return json({ error: 'not_acknowledged' }, 400);

  const dateKey = (body.dateKey ?? '').trim();
  const slotLabel = (body.slot ?? '').trim();

  // ---- Availability -------------------------------------------------------
  // The ledger is the ONLY record of what is already sold, so a sale cannot be
  // made without reading it. `null` means the read failed, which is not the
  // same as "nothing is booked" — fail closed. A customer seeing "try again in
  // a moment" is recoverable; two parties holding the same room is not.
  if (!shopifyConfigured(env)) return json({ error: 'not_configured' }, 501);
  const ledgerRaw = await readLedger(env);
  if (ledgerRaw === null) return json({ error: 'availability_unavailable' }, 503);

  const check = validateBooking(dateKey, slotLabel, parseLedger(ledgerRaw));
  if (!check.ok) {
    // `slot_taken` is a 409 because it is a real race the customer can act on
    // (pick another window); the rest are 400s because only a broken or
    // hand-rolled client sends them.
    return json({ error: check.reason }, check.reason === 'slot_taken' ? 409 : 400);
  }

  const base = squareBase(env);
  const headers = {
    'Square-Version': SQUARE_VERSION,
    Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  const idem = body.idempotencyKey?.slice(0, 45) || crypto.randomUUID();

  // ---- 1. The order -------------------------------------------------------
  // Price comes from the server constant, never the request. The window is in
  // the line item NAME so it lands on the Square receipt and in Order Manager,
  // where staff actually look — not buried in metadata.
  const windowLabel = `${dateKey} · ${check.slot.label}`;

  // Square rejects a SCHEDULED pickup without one, and it is the field that
  // makes the booking show up in Order Manager AT the party time rather than
  // as a nondescript ASAP order. Converted from the café's wall clock, not the
  // Worker's UTC — see slotStartISO.
  const pickupAt = slotStartISO(dateKey, check.slot);
  if (!pickupAt) return json({ error: 'bad_slot' }, 400);
  const orderRes = await fetch(`${base}/v2/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      idempotency_key: idem,
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        line_items: [
          {
            name: `Private party buyout — ${windowLabel}`,
            quantity: '1',
            base_price_money: { amount: PARTY_PRICE_CENTS, currency: 'USD' },
            ...taxableLine(true),
          },
        ],
        fulfillments: [
          {
            type: 'PICKUP',
            state: 'PROPOSED',
            pickup_details: {
              recipient: { display_name: name, phone_number: phone },
              schedule_type: 'SCHEDULED',
              pickup_at: pickupAt,
              note: `PARTY BOOKING · ${windowLabel} · ${name} · ${phone}`,
            },
          },
        ],
        ...salesTax(env.SQUARE_TAX_OBJECT_ID),
        source: { name: 'fusioncoffeeshop.com' },
        metadata: {
          channel: 'website',
          kind: 'party',
          party_date: dateKey,
          party_slot: check.slot.label,
          // Which version of the terms was accepted, and that it was.
          terms: 'all-sales-final',
        },
      },
    }),
  });
  const orderData = (await orderRes.json()) as {
    order?: { id: string; total_money?: { amount: number } };
    errors?: unknown;
  };
  if (!orderRes.ok || !orderData.order) {
    return json({ error: 'order_failed', detail: orderData.errors }, 502);
  }

  // ---- 2. The payment -----------------------------------------------------
  // Square's own total is the charged amount — it carries the tax Square
  // computed, which the browser could not have known.
  const amount = orderData.order.total_money?.amount ?? PARTY_PRICE_CENTS;
  const paymentRes = await fetch(`${base}/v2/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      idempotency_key: `${idem}-pay-${
        Number.isInteger(body.paymentAttempt) ? body.paymentAttempt : 0
      }`,
      source_id: body.sourceId,
      order_id: orderData.order.id,
      location_id: env.SQUARE_LOCATION_ID,
      amount_money: { amount, currency: 'USD' },
    }),
  });
  const paymentData = (await paymentRes.json()) as {
    payment?: { id: string; status: string };
    errors?: unknown;
  };
  if (!paymentRes.ok || !paymentData.payment) {
    return json({ error: 'payment_failed', detail: paymentData.errors }, 502);
  }

  // ---- 3. Block the window ------------------------------------------------
  // Strictly after the money, strictly best-effort. If this fails the customer
  // is booked and paid but the room still looks free to both storefronts, so
  // the flag below is the shop's cue to block it by hand. Never turn a taken
  // payment into an error response.
  const ledgerWritten = await appendLedger(env, dateKey, check.slot.label);

  return json({
    status: 'paid',
    orderId: orderData.order.id,
    paymentId: paymentData.payment.id,
    totalCents: amount,
    dateKey,
    slot: check.slot.label,
    ledgerWritten,
  });
};
