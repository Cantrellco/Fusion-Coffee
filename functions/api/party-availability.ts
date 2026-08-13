// ============================================================
// What the party calendar reads.
//
// Hands the browser the shared "café is taken" ledger as the same plain string
// Little Town's own storefront uses, so /party can grey out windows that are
// already sold — whether they were sold here or next door.
//
// Cached briefly at the edge. The page is public and every visitor asks the
// same question, so without this a busy afternoon would be one Shopify Admin
// API call per page view. 60s is short enough that a window disappears from
// the calendar almost immediately after it sells, and the ledger is re-read
// server-side at checkout anyway — this cache can only ever cause someone to
// be told "just taken" one step later, never to actually double-book.
// ============================================================

import { readLedger, shopifyConfigured, type ShopifyEnv } from './_shopify';

type Ctx = {
  request: Request;
  env: ShopifyEnv;
};

const CACHE_SECONDS = 60;

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  if (ctx.request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Not wired up yet → say so plainly rather than returning an empty ledger.
  // An empty ledger means "nothing is booked", and the calendar would put
  // every window on sale.
  if (!shopifyConfigured(ctx.env)) {
    return new Response(JSON.stringify({ available: false, reason: 'not_configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const ledger = await readLedger(ctx.env);
  if (ledger === null) {
    // Upstream failed. Same distinction: unknown is not empty.
    return new Response(JSON.stringify({ available: false, reason: 'upstream_error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  return new Response(JSON.stringify({ available: true, ledger }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=15, s-maxage=${CACHE_SECONDS}`,
    },
  });
};
