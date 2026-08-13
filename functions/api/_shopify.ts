// ============================================================
// The Little Town bridge.
//
// Fusion's café can be booked from two places: this site, and Little Town
// Playhouse next door, whose Shopify store sells a "Little Town + Fusion"
// buyout that opens this room with a barista. Two storefronts selling one room
// need one list of when it is taken.
//
// That list is a Shopify SHOP METAFIELD on Little Town's store:
//
//     lt_booking.fusion_taken   →  "2026-09-13|1:00–3:00 PM;2026-10-11|4:00–6:00 PM"
//
// Both sides read it and both sides write it. Fusion writes on checkout here;
// Little Town writes via a Shopify Flow action on orders containing the Fusion
// variant. Same string format their existing calendar already uses.
//
// ── WHY NOT `lt_booking.taken` ──────────────────────────────────────────────
// Little Town's own ledger, `lt_booking.taken`, records date + slot but NOT
// which variant was bought — a $185 playhouse-only party and a $295 combo look
// identical in it. Reading it would black out a Fusion date every time the
// playhouse alone was booked, costing sales for no reason. So this module
// touches ONLY `fusion_taken`, and never reads or writes `taken`.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
// Shopify retired admin-created custom apps on 2026-01-01; there is no
// long-lived `shpat_` token to paste anywhere. The app holds a client id and
// secret, and mints a 24-hour token through the client credentials grant. We
// keep the minted token in module scope and reuse it until it is nearly
// expired, so a burst of page views costs one token call, not one each.
//
// Verified against the live store 2026-08-13: shop metafields READ with an
// EMPTY scope string. `productByHandle` by contrast refuses without
// `read_products`. So this module deliberately touches nothing but metafields.
// ============================================================

export type ShopifyEnv = {
  SHOPIFY_STORE?: string;
  SHOPIFY_CLIENT_ID?: string;
  SHOPIFY_CLIENT_SECRET?: string;
};

/** Namespace/key of the shared "café is taken" ledger. */
export const LEDGER_NAMESPACE = 'lt_booking';
export const LEDGER_KEY = 'fusion_taken';

const API_VERSION = '2026-04';

export function shopifyConfigured(env: ShopifyEnv): boolean {
  return Boolean(env.SHOPIFY_STORE && env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET);
}

// ---- token -----------------------------------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Mint (or reuse) an Admin API token.
 *
 * Cached in module scope, which on Workers lives as long as the isolate — long
 * enough to matter under load, short enough that nothing goes stale. The 60s
 * safety margin means a token can never expire mid-request.
 */
async function getToken(env: ShopifyEnv): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;

  const res = await fetch(`https://${env.SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.SHOPIFY_CLIENT_ID ?? '',
      client_secret: env.SHOPIFY_CLIENT_SECRET ?? '',
    }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  cachedToken = {
    value: data.access_token,
    // Square's docs pin this at 86399; default defensively rather than trust it.
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function graphql<T>(
  env: ShopifyEnv,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T | null> {
  const token = await getToken(env);
  if (!token) return null;

  const res = await fetch(`https://${env.SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, ...(variables ? { variables } : {}) }),
  });
  if (!res.ok) return null;

  const body = (await res.json()) as { data?: T; errors?: unknown };
  // A GraphQL 200 can still carry errors; treat a partial answer as no answer
  // rather than letting `undefined` read as "nothing is booked".
  if (body.errors || !body.data) return null;
  return body.data;
}

// ---- ledger ----------------------------------------------------------------

/**
 * Read the shared ledger string.
 *
 * `null` means WE DO NOT KNOW — Shopify was unreachable, unconfigured, or
 * errored. That is deliberately distinct from `''`, which means "asked, and
 * nothing is booked". Callers must not conflate them: treating an outage as an
 * empty ledger would put every window back on sale.
 *
 * NOTE — "nothing booked" is an ABSENT metafield, never an empty one. Verified
 * against the live store 2026-08-13: writing `""` to a `single_line_text_field`
 * is rejected with `Value can't be blank.` (INVALID_VALUE). So the ledger can
 * only ever be cleared by DELETING the metafield (`metafieldsDelete`), not by
 * blanking it. Nothing here writes an empty value — `appendLedger` only ever
 * appends — but anyone adding a cancellation path needs to know.
 */
export async function readLedger(env: ShopifyEnv): Promise<string | null> {
  if (!shopifyConfigured(env)) return null;

  const data = await graphql<{ shop: { metafield: { value: string } | null } }>(
    env,
    `{ shop { metafield(namespace: "${LEDGER_NAMESPACE}", key: "${LEDGER_KEY}") { value } } }`,
  );
  if (!data) return null;
  // A metafield that has never been written comes back null — that IS an
  // answer ("nothing booked"), unlike a failed request.
  return data.shop.metafield?.value ?? '';
}

/**
 * Append one booking to the ledger, read-modify-write.
 *
 * Returns false on any failure so the caller can decide what that means. It is
 * never fatal at the checkout callsite: by the time this runs the card has been
 * charged, and refusing the response would tell a paying customer their booking
 * failed when it did not.
 *
 * RACE: two bookings landing inside the same read-modify-write window can lose
 * one write. Shopify Flow has the identical race on Little Town's side and has
 * run that way in production at ~3 slots/week. Same shape, same exposure.
 */
export async function appendLedger(
  env: ShopifyEnv,
  dateKey: string,
  slot: string,
): Promise<boolean> {
  if (!shopifyConfigured(env)) return false;

  const shop = await graphql<{ shop: { id: string; metafield: { value: string } | null } }>(
    env,
    `{ shop { id metafield(namespace: "${LEDGER_NAMESPACE}", key: "${LEDGER_KEY}") { value } } }`,
  );
  if (!shop) return false;

  const existing = shop.shop.metafield?.value ?? '';
  const entry = `${dateKey}|${slot}`;
  // Idempotent: a retry that already landed must not append a duplicate.
  if (existing.split(/[;\n]+/).some((e) => e.trim() === entry)) return true;
  const next = existing ? `${existing};${entry}` : entry;

  const result = await graphql<{
    metafieldsSet: { userErrors: { message: string }[] };
  }>(
    env,
    `mutation($m:[MetafieldsSetInput!]!){
       metafieldsSet(metafields:$m){ metafields { id } userErrors { field message code } }
     }`,
    {
      m: [
        {
          ownerId: shop.shop.id,
          namespace: LEDGER_NAMESPACE,
          key: LEDGER_KEY,
          type: 'single_line_text_field',
          value: next,
        },
      ],
    },
  );
  return Boolean(result && result.metafieldsSet.userErrors.length === 0);
}
