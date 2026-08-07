// ============================================================
// Cloudflare Pages Function — /api/saved-card
//
//   GET  ?h=<deviceHandle>   → the card this device remembered, masked
//   POST { h, cardId }       → forget it (disabled at Square)
//
// The counterpart to the saving half in /api/checkout. Everything about the
// device-handle model, and what it deliberately does NOT protect against, is
// documented in functions/api/_cards.ts — read that first.
//
// This endpoint returns a MASK and nothing else: brand, last four, expiry, and
// the card id. The card id is only spendable alongside the same handle that
// produced it (checkout re-checks ownership before charging), and the handle
// never leaves the device that minted it except in these requests.
// ============================================================

import {
  SQUARE_VERSION,
  disableCard,
  findCustomerId,
  listCards,
  validHandle,
} from './_cards';

type Ctx = {
  request: Request;
  env: {
    SQUARE_ACCESS_TOKEN?: string;
    SQUARE_LOCATION_ID?: string;
    SQUARE_ENVIRONMENT?: string;
  };
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // A saved card is per-device state; an intermediary caching it and
      // handing it to the next visitor would be the whole bug.
      'Cache-Control': 'no-store',
    },
  });

function squareCtx(env: Ctx['env']) {
  return {
    base:
      (env.SQUARE_ENVIRONMENT ?? 'sandbox') === 'production'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com',
    headers: {
      'Square-Version': SQUARE_VERSION,
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
}

export const onRequestGet = async (ctx: Ctx): Promise<Response> => {
  const { env, request } = ctx;
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    // Not an error the customer needs to see — there is simply no saved card
    // to offer, and checkout already has its own "not configured" panel.
    return json({ card: null });
  }

  const handle = new URL(request.url).searchParams.get('h');
  if (!validHandle(handle)) return json({ card: null });

  const sq = squareCtx(env);
  const customerId = await findCustomerId(sq, handle);
  if (!customerId) return json({ card: null });

  const cards = await listCards(sq, customerId);
  // The most recently added card wins — someone who saves a second card meant
  // to replace the first, not to be asked which every time.
  return json({ card: cards.length ? cards[cards.length - 1] : null });
};

export const onRequestPost = async (ctx: Ctx): Promise<Response> => {
  const { env, request } = ctx;
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    return json({ error: 'not_configured' }, 501);
  }

  let body: { h?: unknown; cardId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'bad_request' }, 400);
  }

  const handle = body.h;
  const cardId = body.cardId;
  if (!validHandle(handle) || typeof cardId !== 'string' || !cardId) {
    return json({ error: 'bad_request' }, 400);
  }

  // Same rule as spending it: a card id is only actionable by the device that
  // owns it. Otherwise anyone could disable anyone else's card.
  const sq = squareCtx(env);
  const customerId = await findCustomerId(sq, handle);
  if (!customerId) return json({ forgotten: true });
  const owned = (await listCards(sq, customerId)).some((c) => c.cardId === cardId);
  if (!owned) return json({ forgotten: true });

  const ok = await disableCard(sq, cardId);
  return ok ? json({ forgotten: true }) : json({ error: 'forget_failed' }, 502);
};
