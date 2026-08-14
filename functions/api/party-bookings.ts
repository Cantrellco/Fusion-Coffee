// ============================================================
// Private feed of Fusion's party bookings.
//
// Exists so the shop's Google Calendar can show all three kinds of booking in
// one place, colour-coded: Little Town only, Little Town + Fusion, and
// Fusion only. The first two reach the calendar from Shopify (Flow writes them
// to a Google Sheet); this is where the third comes from.
//
// PULL, NOT PUSH. An Apps Script on a timer fetches this and writes the
// calendar itself. The alternative — this Worker pushing into Google — would
// mean a service-account key living in Cloudflare and a whole OAuth dance, to
// do something Apps Script already does natively as the shop's own Google user.
//
// ── WHY IT NEEDS A SECRET ───────────────────────────────────────────────────
// Unlike /api/party-availability, which deliberately exposes only dates and
// slots, this returns customer NAMES and PHONE NUMBERS. It is not public. A
// bearer token is checked before anything is fetched, and the response is
// no-store so it cannot sit in a shared cache.
//
// Square is the source of truth here, not the shared ledger: the ledger records
// only that a window is taken, which is all the other storefront needs. Who
// booked it lives on the order.
// ============================================================

type Ctx = {
  request: Request;
  env: {
    SQUARE_ACCESS_TOKEN?: string;
    SQUARE_LOCATION_ID?: string;
    SQUARE_ENVIRONMENT?: string;
    /** Shared secret the Apps Script sends as `Authorization: Bearer …`. */
    PARTY_FEED_SECRET?: string;
  };
};

const SQUARE_VERSION = '2025-10-16';

/** How far back to look. Square searches by created_at, not by party date. */
const LOOKBACK_DAYS = 400;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const squareBase = (env: Ctx['env']) =>
  (env.SQUARE_ENVIRONMENT ?? 'sandbox') === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

type SquareOrder = {
  id: string;
  state?: string;
  created_at?: string;
  total_money?: { amount?: number };
  metadata?: Record<string, string>;
  fulfillments?: {
    pickup_details?: {
      pickup_at?: string;
      recipient?: { display_name?: string; phone_number?: string };
    };
  }[];
};

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  const { env, request } = ctx;

  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  // Fail CLOSED when unconfigured. An unset secret must never mean "no auth
  // required" — that would publish customer phone numbers to anyone who
  // guessed the path.
  if (!env.PARTY_FEED_SECRET) return json({ error: 'not_configured' }, 501);

  const auth = request.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!timingSafeEqual(token, env.PARTY_FEED_SECRET)) {
    return json({ error: 'unauthorized' }, 401);
  }

  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    return json({ error: 'not_configured' }, 501);
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

  const res = await fetch(`${squareBase(env)}/v2/orders/search`, {
    method: 'POST',
    headers: {
      'Square-Version': SQUARE_VERSION,
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      location_ids: [env.SQUARE_LOCATION_ID],
      limit: 500,
      query: {
        filter: {
          date_time_filter: { created_at: { start_at: since } },
          state_filter: { states: ['OPEN', 'COMPLETED'] },
        },
        sort: { sort_field: 'CREATED_AT', sort_order: 'DESC' },
      },
    }),
  });

  if (!res.ok) return json({ error: 'square_failed' }, 502);
  const data = (await res.json()) as { orders?: SquareOrder[] };

  // Square can't filter on metadata, so the party orders are picked out here.
  // `kind: 'party'` is stamped by party-checkout.ts on every booking it makes.
  const bookings = (data.orders ?? [])
    .filter((o) => o.metadata?.kind === 'party')
    .map((o) => {
      const pickup = o.fulfillments?.[0]?.pickup_details;
      return {
        orderId: o.id,
        // Machine-readable date + slot, same strings as the shared ledger.
        date: o.metadata?.party_date ?? '',
        slot: o.metadata?.party_slot ?? '',
        // Exact start instant, already converted to the café's wall clock at
        // checkout — the calendar can use this directly.
        startsAt: pickup?.pickup_at ?? '',
        name: pickup?.recipient?.display_name ?? '',
        phone: pickup?.recipient?.phone_number ?? '',
        totalCents: o.total_money?.amount ?? 0,
        bookedAt: o.created_at ?? '',
      };
    })
    .filter((b) => b.date);

  return json({ venue: 'fusion', count: bookings.length, bookings });
};

/**
 * Constant-time-ish compare so a wrong token can't be discovered a character at
 * a time by measuring how fast we say no.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
