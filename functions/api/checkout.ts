// ============================================================
// Cloudflare Pages Function — POST /api/checkout
//
// This is the ONE piece that must run server-side: it holds the shop's Square
// secret access token and turns the cart the browser sends into a real Square
// Order + Payment. It deploys alongside the static site on Cloudflare Pages, so
// everything still lives on fusioncoffeeshop.com — one host, one domain.
//
// It serves TWO carts:
//
//   kind: 'cafe'  (default)  — /order. Drinks and food, PICKUP at the counter,
//                              optional tip, refused while the shop is closed.
//   kind: 'shop'             — /merch. Physical goods. The customer chooses
//                              SHIPMENT (address + flat-rate postage) or PICKUP
//                              (collect on Main Street, no postage); a gift card
//                              in the bag forces PICKUP. No tip, orderable
//                              around the clock.
//
// STATUS: until the Square keys are set as encrypted Pages secrets, this
// returns HTTP 501 { error: 'not_configured' }, which both pages show as a
// friendly "payment isn't switched on yet" panel. The moment the secrets exist,
// the real Orders + Payments flow below runs.
//
// Required Pages secrets (Cloudflare dashboard → Settings → Environment
// variables, encrypted), from the client's Square Developer app:
//   SQUARE_ACCESS_TOKEN   — secret; sandbox token to build, production at launch
//   SQUARE_LOCATION_ID    — the shop's location id
//   SQUARE_ENVIRONMENT    — "sandbox" | "production" (defaults to sandbox)
//
// PIPELINE (Orders API + Payments API, both plain HTTPS REST so no SDK needed
// on the Workers runtime):
//   0. Validate  — see PRICE INTEGRITY below. Nothing is created until the
//                  money the customer was shown is proven correct.
//   1. CreateOrder  — line items from the cart (real catalog object ids for
//                     merch; ad-hoc name+price lines for the café menu until
//                     its catalog is wired), fulfillment, tip/shipping as
//                     service charges.
//   2. CreatePayment— charge the Web Payments SDK card token against the order.
// The order then appears on the shop's Square POS / Order Manager exactly like
// any other online order, and decrements the same inventory as the register.
//
// ── PRICE INTEGRITY ─────────────────────────────────────────────────────────
// The browser sends what it DISPLAYED. It is never trusted to say what things
// cost — a hand-rolled POST could otherwise buy a $60 hoodie for a penny.
// Every line is re-priced here, against a source the customer cannot touch:
//
//   shop lines — priced by Square itself. We send `catalog_object_id` and let
//                the Orders API apply the catalog's own price and tax. Before
//                that, the variation is fetched from the Catalog API and
//                compared to the displayed price; a mismatch stops the order
//                with 409 `price_changed` instead of quietly charging a
//                different number than the one on screen.
//   café lines — recomputed from src/lib/order.ts, the same module the page
//                builds its menu from, including modifier upcharges. A line
//                that disagrees is rejected with 409 `price_changed`.
//
// Shipping is computed here too, from src/lib/shop.ts — the browser's figure is
// display-only.
//
// ── PRINTFUL / FULFILMENT ───────────────────────────────────────────────────
// The five apparel pieces are print-on-demand: when SHIPPED, Printful prints
// them and posts them straight to the customer and the shop never touches them.
// Everything else on /merch (stickers, tote, beans, tea, gift card) is the
// shop's own stock.
//
// But WHO fulfils a line depends on HOW the order is fulfilled, because
// Printful only ever drop-ships — it cannot deliver to the counter. So a
// COLLECTED order is entirely the shop's job, apparel included, pulled off the
// rack in store. `resolveFulfilledBy()` in src/lib/shop.ts owns that rule and
// is the only place it is decided; the split below runs through it. Reading
// `shipsFrom` directly would route a picked-up hoodie to Printful and have it
// printed and posted to someone standing at the counter waiting for it.
//
// ⚠️ UNVERIFIED, AND IT MATTERS: Printful learns about orders through its
// SQUARE ONLINE integration — it imports orders placed on the connected Square
// Online storefront. This endpoint creates orders through the Square ORDERS API
// instead, which is a different path. If Printful does not poll the Orders API,
// apparel orders taken here will be PAID but never printed, and nothing in
// Square will look wrong. That is a silent failure, so it must be proven on the
// shop's production account before launch:
//
//   1. Connect the production Square keys.
//   2. Buy one apparel item through /merch for real.
//   3. Check the Printful dashboard. If it appears, this is done.
//      If it does NOT, switch to calling Printful's own Orders API from here
//      (a Printful "manual order / API store" token plus a Square-variation →
//      Printful-variant map) — that removes the dependency on Square Online
//      entirely and also gives real shipping quotes instead of the flat rate.
//
// To give the existing integration the best chance, merch line items are sent
// as a bare catalog_object_id + quantity — no name, no price, no note — so they
// match the variants Printful synced into the Square catalog exactly. The split
// summary rides on the order's metadata and the shipment note instead.
//
// CLOSED-SHOP GATE: café orders are rejected outside opening hours with HTTP
// 409 { error: 'closed' }. The /order page hides checkout when closed too, but
// that gate is client-side and can be skipped by POSTing here directly — this
// is the one that counts. No order is created and no card is charged, so a card
// token sent at 3am simply goes unused. Merch is deliberately NOT gated: a
// shipped hoodie does not care that the espresso machine is off, and refusing
// it would just lose the sale.
// ============================================================

// Shared with the browser UI, so the two can never disagree about the hours,
// the menu prices or the shipping rate. Bundled into the Worker by the Pages
// build (esbuild follows these imports). All three are plain data modules with
// no Next-specific imports — keep them that way.
import { shopOpenStatus } from '../../src/lib/hours';
import { orderMenu, unitPriceCents, type CartModifier } from '../../src/lib/order';
import { merch } from '../../src/lib/site';
import {
  shippingCents,
  addressProblems,
  fulfillmentSplit,
  resolveFulfillment,
  productSlug,
  type Fulfillment,
  type FulfilledBy,
  type ShippingAddress,
} from '../../src/lib/shop';
import {
  SAVED_CARD_MAX_CENTS,
  resolveSavedCard,
  saveCardFromPayment,
  validHandle,
  type SavedCardSummary,
} from './_cards';

type Ctx = {
  request: Request;
  env: {
    SQUARE_ACCESS_TOKEN?: string;
    SQUARE_LOCATION_ID?: string;
    SQUARE_ENVIRONMENT?: string;
  };
};

type CheckoutLine = {
  itemId: string;
  name: string;
  qty: number;
  /** UNIT price: item base + every modifier upcharge, already summed. */
  priceCents: number;
  modifiers?: {
    groupId: string;
    label: string;
    value: string;
    priceCents?: number;
  }[];
  squareCatalogObjectId?: string | null;
  /** Merch only: the Square catalog VARIATION id that prices this line. */
  variationId?: string;
};

type CheckoutBody = {
  /** Omitted on the café payload for backwards compatibility. */
  kind?: 'cafe' | 'shop';
  customerName: string;
  pickup: string;
  tipCents: number;
  subtotalCents: number;
  lines: CheckoutLine[];
  /** Web Payments SDK payment token (card nonce). */
  sourceId?: string;
  /** Merch only. */
  fulfillment?: Fulfillment;
  address?: ShippingAddress;
  /**
   * Optional client-generated key. Reusing it across a retry makes the retry
   * idempotent at Square, so a flaky connection cannot double-charge.
   */
  idempotencyKey?: string;
  /**
   * Which card attempt this is for the SAME order. Bumped by the client only
   * after a definite decline, so a second card gets a fresh payment key while
   * the order key stays stable. Square rejects a reused key whose body differs
   * (a new card token is a different body), so without this a single decline
   * would deadlock checkout for that cart.
   */
  paymentAttempt?: number;
  /**
   * Saved cards, café orders only — see functions/api/_cards.ts for the whole
   * design and its limits.
   *
   * `deviceHandle` is the opaque random string this browser keeps in
   * localStorage; Square holds the mapping as a Customer's reference_id.
   */
  deviceHandle?: string;
  /** The buyer ticked "save this card"; store it once the payment lands. */
  saveCard?: boolean;
  /**
   * Pay with an already-saved card instead of a fresh token. NEVER trusted on
   * its own: it is re-checked against the cards Square lists for deviceHandle's
   * customer before a cent moves.
   */
  savedCardId?: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    // Payment responses carry per-customer ids; same no-store convention as
    // quote.ts and saved-card.ts.
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function squareBase(env: Ctx['env']): string {
  return (env.SQUARE_ENVIRONMENT ?? 'sandbox') === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

const SQUARE_VERSION = '2025-10-16';

// ---- café price table, built once per isolate ----------------------------
//
// Flattened from the same orderMenu the page renders, so there is exactly one
// definition of what a latte costs and it is not the browser's.
const cafeItems = new Map(
  orderMenu.flatMap((cat) => cat.items.map((it) => [it.id, it] as const)),
);

// ---- who fulfills each merch product -------------------------------------
//
// Derived from the merch data, NOT from the request: the browser sends a
// product id and nothing else that matters here. Today only the five apparel
// pieces are Printful; everything else is the shop's own stock.
const merchItems = new Map<string, { shipsFrom: FulfilledBy; pickupOnly: boolean }>(
  merch.groups.flatMap((g) =>
    g.items.map(
      (i) =>
        [
          productSlug(i.name),
          { shipsFrom: i.shipsFrom ?? 'shop', pickupOnly: i.pickupOnly ?? false },
        ] as const,
    ),
  ),
);

/**
 * Re-price one café line from the server's own menu.
 * Returns the correct unit price, or null if the item/modifier isn't real.
 */
function repriceCafeLine(line: CheckoutLine): number | null {
  const item = cafeItems.get(line.itemId);
  if (!item) return null;

  const chosen: CartModifier[] = [];
  for (const m of line.modifiers ?? []) {
    const group = item.modifiers?.find((g) => g.id === m.groupId);
    if (!group) return null;
    const option = group.options.find((o) => o.value === m.value);
    if (!option) return null;
    chosen.push({
      groupId: group.id,
      label: group.label,
      value: option.value,
      priceCents: option.priceCents ?? 0,
    });
  }
  return unitPriceCents(item.priceCents, chosen);
}

/** Look up merch variation prices straight from Square's catalog. */
async function fetchVariationPrices(
  base: string,
  headers: Record<string, string>,
  ids: string[],
): Promise<Map<string, number> | null> {
  const res = await fetch(`${base}/v2/catalog/batch-retrieve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ object_ids: ids }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    objects?: {
      id: string;
      type: string;
      item_variation_data?: {
        price_money?: { amount?: number };
        pricing_type?: string;
      };
    }[];
  };
  const prices = new Map<string, number>();
  for (const o of data.objects ?? []) {
    if (o.type !== 'ITEM_VARIATION') continue;
    const d = o.item_variation_data;
    // VARIABLE_PRICING has no catalog price — it cannot be sold unattended, so
    // it is simply left out of the map and the line fails validation below.
    if (d?.pricing_type === 'VARIABLE_PRICING') continue;
    if (typeof d?.price_money?.amount === 'number') {
      prices.set(o.id, d.price_money.amount);
    }
  }
  return prices;
}

// Non-POST verbs (scanners, typed-in URLs) otherwise fall through to the
// static 404 page — 67KB of HTML from an API path. Answer in JSON instead.
export const onRequest = async (ctx: Ctx): Promise<Response> =>
  ctx.request.method === 'POST'
    ? onRequestPost(ctx)
    : json({ error: 'method_not_allowed' }, 405);

export const onRequestPost = async (ctx: Ctx): Promise<Response> => {
  const { env, request } = ctx;

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    // `null`/arrays/scalars are valid JSON but not a payload; without this,
    // `body.kind` throws and the Worker answers 500 text/plain.
    return json({ error: 'bad_request' }, 400);
  }

  const kind = body.kind === 'shop' ? 'shop' : 'cafe';

  // Closed shop → refuse before anything else happens, for café orders only.
  // The label ("Closed · opens tomorrow 6am") is computed in the SHOP's
  // timezone and handed back so the page can say exactly when to come back.
  if (kind === 'cafe') {
    const openStatus = shopOpenStatus();
    if (!openStatus.open) {
      return json({ error: 'closed', label: openStatus.label }, 409);
    }
  }

  // Not configured yet → tell the client to show the "ready for Square" panel.
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    return json({ error: 'not_configured' }, 501);
  }

  // Configured server + no card token = the BROWSER could not build a card
  // form, because the build-time NEXT_PUBLIC_SQUARE_* values are missing or
  // stale while these runtime secrets are live. (They are set in two entirely
  // different places — .env.local at build vs the Pages dashboard at runtime —
  // so the skew is a question of when, not if.)
  //
  // Continuing would create a real, UNPAYABLE order: it lands in Order Manager,
  // the bar makes the drink, and nobody is ever charged. Refuse before creating
  // anything and report the state both pages already know how to render.
  //
  // A saved card counts: it is spendable without the browser tokenizing
  // anything, so a request carrying one is not evidence of a stale build.
  const wantsSavedCard =
    kind === 'cafe' && Boolean(body.savedCardId) && validHandle(body.deviceHandle);
  if (!body.sourceId && !wantsSavedCard) {
    return json({ error: 'not_configured' }, 501);
  }

  if (!body.lines?.length || !body.customerName?.trim()) {
    return json({ error: 'empty_order' }, 400);
  }
  if (body.lines.some((l) => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 99)) {
    return json({ error: 'bad_quantity' }, 400);
  }

  const base = squareBase(env);
  const headers = {
    'Square-Version': SQUARE_VERSION,
    Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  // Idempotency keys prevent a retried request from double-charging. crypto is
  // available on the Workers runtime.
  const idem = body.idempotencyKey?.slice(0, 45) || crypto.randomUUID();

  // The customer picks, but a pickup-only line (the gift card) overrides them —
  // recomputed here rather than trusting the request, so a hand-rolled POST
  // can't get a gift card posted unactivated.
  const requested: Fulfillment =
    kind === 'shop' && body.fulfillment === 'SHIPMENT' ? 'SHIPMENT' : 'PICKUP';
  const fulfillment: Fulfillment =
    kind === 'shop'
      ? resolveFulfillment(
          body.lines.map((l) => ({
            pickupOnly: merchItems.get(l.itemId)?.pickupOnly ?? false,
          })),
          requested,
        )
      : 'PICKUP';

  // ---- 0. Validate the money ---------------------------------------------
  let lineItems: Record<string, unknown>[];
  let subtotalCents = 0;

  if (kind === 'shop') {
    // Every merch line must name a catalog variation — that is what lets Square
    // price it. A line without one is not something we know how to sell.
    const ids = body.lines.map((l) => l.variationId).filter(Boolean) as string[];
    if (ids.length !== body.lines.length) {
      return json({ error: 'unpriced_item' }, 400);
    }

    // Shipped orders need somewhere to ship to. Same validator the form uses,
    // and checked BEFORE the catalog round-trip: it costs nothing, and there is
    // no point pricing an order we already know we cannot fulfill.
    const problems = addressProblems(
      body.address ?? {
        name: '',
        email: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
      },
      fulfillment,
    );
    if (problems.length) {
      return json({ error: 'bad_address', fields: problems }, 400);
    }

    const prices = await fetchVariationPrices(base, headers, [...new Set(ids)]);
    if (!prices) return json({ error: 'catalog_unavailable' }, 502);

    const mismatched: { itemId: string; shownCents: number; actualCents: number | null }[] = [];
    for (const line of body.lines) {
      const actual = prices.get(line.variationId as string) ?? null;
      if (actual === null || actual !== line.priceCents) {
        mismatched.push({
          itemId: line.itemId,
          shownCents: line.priceCents,
          actualCents: actual,
        });
      } else {
        subtotalCents += actual * line.qty;
      }
    }
    if (mismatched.length) {
      // Someone tampered with the payload, or the catalog genuinely changed
      // under a stale tab. Either way: charge nothing, tell the page to refresh
      // its prices and show the customer the real number before they commit.
      return json({ error: 'price_changed', lines: mismatched }, 409);
    }

    // Square owns the price: we pass the variation id, not a number.
    lineItems = body.lines.map((l) => ({
      catalog_object_id: l.variationId,
      quantity: String(l.qty),
    }));
  } else {
    const mismatched: { itemId: string; shownCents: number; actualCents: number | null }[] = [];
    for (const line of body.lines) {
      const actual = repriceCafeLine(line);
      if (actual === null || actual !== line.priceCents) {
        mismatched.push({
          itemId: line.itemId,
          shownCents: line.priceCents,
          actualCents: actual,
        });
      } else {
        subtotalCents += actual * line.qty;
      }
    }
    if (mismatched.length) {
      return json({ error: 'price_changed', lines: mismatched }, 409);
    }

    lineItems = body.lines.map((l) => {
      const note = l.modifiers
        ?.map(
          (m) =>
            `${m.label}: ${m.value}` +
            (m.priceCents ? ` (+$${(m.priceCents / 100).toFixed(2)})` : ''),
        )
        .join(', ');
      // Prefer the real catalog object id (inherits catalog price + tax); fall
      // back to an ad-hoc line item (name + price) until the café catalog is
      // wired.
      //
      // A catalog id carries the catalog's own price and would DROP the modifier
      // upcharges priced here, undercharging the shop — so any line with a paid
      // modifier stays ad-hoc until the catalog's modifier lists are wired too.
      const hasPaidModifier = l.modifiers?.some((m) => (m.priceCents ?? 0) > 0);
      if (l.squareCatalogObjectId && !hasPaidModifier) {
        return {
          catalog_object_id: l.squareCatalogObjectId,
          quantity: String(l.qty),
          ...(note ? { note } : {}),
        };
      }
      return {
        name: l.name,
        quantity: String(l.qty),
        // Server-recomputed, not the browser's number.
        base_price_money: { amount: l.priceCents, currency: 'USD' },
        ...(note ? { note } : {}),
      };
    });
  }

  // Tip is café-only, and only ever a positive amount of the real subtotal.
  const tipCents =
    kind === 'cafe' && Number.isFinite(body.tipCents)
      ? Math.max(0, Math.min(Math.round(body.tipCents), subtotalCents))
      : 0;
  // Computed here from src/lib/shop.ts — never taken from the request.
  const shipCents = kind === 'shop' ? shippingCents(fulfillment, subtotalCents) : 0;

  // Who physically fulfills this order, resolved from our own merch data.
  const split =
    kind === 'shop'
      ? fulfillmentSplit(
          body.lines.map((l) => ({
            shipsFrom: merchItems.get(l.itemId)?.shipsFrom ?? 'shop',
            qty: l.qty,
          })),
          fulfillment,
        )
      : { printful: 0, shop: 0 };

  // One human-readable line for whoever opens this in Square Order Manager. A
  // mixed order (a hoodie AND a bag of beans) is a single Square order but two
  // fulfilment paths, and nothing else in Square says so.
  const splitNote =
    fulfillment === 'PICKUP'
      ? // Printful only drop-ships, so a collected order is entirely the shop's
        // job — apparel included, pulled off the rack.
        'Collect in store — pull from stock, nothing to post.'
      : split.printful > 0 && split.shop > 0
        ? `Split fulfilment: ${split.printful} via Printful, ${split.shop} packed in store.`
        : split.printful > 0
          ? `All ${split.printful} item(s) fulfilled by Printful.`
          : 'Packed in store.';

  // ---- 0b. Resolve a saved card, BEFORE anything is created ---------------
  //
  // Ownership is proved here, not taken on trust: the card id the browser sent
  // is only usable if Square lists it against the customer belonging to this
  // device handle. A failure returns 409 and creates nothing, so the page can
  // quietly fall back to asking for a card — far better than an order in Order
  // Manager that nobody can pay for.
  let savedCard: { customerId: string; card: SavedCardSummary } | null = null;
  if (wantsSavedCard) {
    const dueBeforeTax = subtotalCents + tipCents + shipCents;
    if (dueBeforeTax > SAVED_CARD_MAX_CENTS) {
      // A remembered card has no login behind it. Cap what one can spend so a
      // lost phone is worth a round of coffee, not an afternoon.
      return json({ error: 'saved_card_limit', maxCents: SAVED_CARD_MAX_CENTS }, 409);
    }
    savedCard = await resolveSavedCard(
      { base, headers },
      body.deviceHandle as string,
      body.savedCardId as string,
    );
    if (!savedCard) {
      return json({ error: 'saved_card_unavailable' }, 409);
    }
  }

  // ---- 1. Create the order ------------------------------------------------
  const serviceCharges: Record<string, unknown>[] = [];
  if (tipCents > 0) {
    serviceCharges.push({
      name: 'Tip',
      amount_money: { amount: tipCents, currency: 'USD' },
      calculation_phase: 'TOTAL_PHASE',
    });
  }
  if (shipCents > 0) {
    serviceCharges.push({
      name: 'Shipping',
      amount_money: { amount: shipCents, currency: 'USD' },
      // TOTAL_PHASE = added after tax is figured, so the shipping fee is not
      // itself taxed. If the shop's accountant wants shipping taxed (Illinois
      // treats it as part of the sale in some cases), switch this one value to
      // 'SUBTOTAL_PHASE'.
      calculation_phase: 'TOTAL_PHASE',
    });
  }

  const address = body.address;
  const fulfillmentBlock =
    fulfillment === 'SHIPMENT' && address
      ? {
          type: 'SHIPMENT',
          state: 'PROPOSED',
          shipment_details: {
            recipient: {
              display_name: address.name.trim(),
              email_address: address.email.trim(),
              ...(address.phone.trim() ? { phone_number: address.phone.trim() } : {}),
              address: {
                address_line_1: address.line1.trim(),
                ...(address.line2.trim() ? { address_line_2: address.line2.trim() } : {}),
                locality: address.city.trim(),
                administrative_district_level_1: address.state.trim().toUpperCase(),
                postal_code: address.postalCode.trim(),
                country: 'US',
              },
            },
            shipping_note: splitNote,
          },
        }
      : {
          type: 'PICKUP',
          state: 'PROPOSED',
          pickup_details: {
            recipient: {
              display_name: body.customerName.trim(),
              ...(kind === 'shop' && address?.email.trim()
                ? { email_address: address.email.trim() }
                : {}),
            },
            schedule_type: 'ASAP',
            note: kind === 'shop' ? splitNote : body.pickup,
          },
        };

  const orderReq = {
    idempotency_key: idem,
    order: {
      location_id: env.SQUARE_LOCATION_ID,
      line_items: lineItems,
      fulfillments: [fulfillmentBlock],
      ...(serviceCharges.length ? { service_charges: serviceCharges } : {}),
      // Marks these as coming from this site rather than the POS or the old
      // Square Online store, so they can be filtered in the dashboard.
      source: { name: 'fusioncoffeeshop.com' },
      // Machine-readable copy of the split. Metadata is deliberately the only
      // extra we attach to a merch order: line items stay as a bare
      // catalog_object_id + quantity so nothing interferes with Printful
      // matching them to its own synced variants.
      ...(kind === 'shop'
        ? {
            metadata: {
              channel: 'website',
              printful_items: String(split.printful),
              shop_items: String(split.shop),
            },
          }
        : {}),
    },
  };

  const orderRes = await fetch(`${base}/v2/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderReq),
  });
  const orderData = (await orderRes.json()) as {
    order?: { id: string; total_money?: { amount: number } };
    errors?: unknown;
  };
  if (!orderRes.ok || !orderData.order) {
    return json({ error: 'order_failed', detail: orderData.errors }, 502);
  }

  // ---- 2. Take the payment ------------------------------------------------
  // Needs either the Web Payments SDK card token (body.sourceId) from the
  // on-page card form, or a saved card resolved above. Without either, stop
  // here and report the order was created but payment is pending — the
  // pre-launch state both pages know how to show.
  if (!body.sourceId && !savedCard) {
    return json(
      {
        status: 'order_created_payment_pending',
        orderId: orderData.order.id,
        message:
          'Order created in Square. Add the on-page card form (Web Payments SDK) to charge it.',
      },
      200,
    );
  }

  // Square's own total is the amount charged — it includes the tax it computed
  // from the catalog, which the browser could not have known.
  const amount =
    orderData.order.total_money?.amount ?? subtotalCents + tipCents + shipCents;
  const paymentRes = await fetch(`${base}/v2/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      // Order key + attempt number: retrying a lost response reuses the key
      // (Square returns the original payment instead of charging again), while
      // a retry after a decline gets a new one.
      idempotency_key: `${idem}-pay-${
        Number.isInteger(body.paymentAttempt) ? body.paymentAttempt : 0
      }`,
      // A card on file is spent by its own id, and Square requires the customer
      // it belongs to alongside it.
      source_id: savedCard ? savedCard.card.cardId : body.sourceId,
      ...(savedCard ? { customer_id: savedCard.customerId } : {}),
      order_id: orderData.order.id,
      location_id: env.SQUARE_LOCATION_ID,
      amount_money: { amount, currency: 'USD' },
      // Gets the customer a Square receipt for a shipped order they will not
      // be standing at the counter for.
      ...(kind === 'shop' && address?.email.trim()
        ? { buyer_email_address: address.email.trim() }
        : {}),
    }),
  });
  const paymentData = (await paymentRes.json()) as {
    payment?: { id: string; status: string };
    errors?: unknown;
  };
  if (!paymentRes.ok || !paymentData.payment) {
    return json({ error: 'payment_failed', detail: paymentData.errors }, 502);
  }

  // ---- 3. Remember the card, if they asked --------------------------------
  //
  // Strictly AFTER the money is taken, and strictly best-effort. The card is
  // created from the finished PAYMENT id (a token is single use and has just
  // been spent). Anything that goes wrong here — Square refusing, a customer
  // that won't create, a network blip — leaves a paid order and no saved card,
  // which is a mild disappointment rather than a lost sale. It must never be
  // allowed to turn a completed payment into an error response.
  let stored: SavedCardSummary | null = null;
  if (
    kind === 'cafe' &&
    body.saveCard === true &&
    !savedCard &&
    body.sourceId &&
    validHandle(body.deviceHandle)
  ) {
    stored = await saveCardFromPayment(
      { base, headers },
      body.deviceHandle,
      paymentData.payment.id,
      body.customerName.trim(),
    );
  }

  return json({
    status: 'paid',
    orderId: orderData.order.id,
    paymentId: paymentData.payment.id,
    totalCents: amount,
    // Present only when a card was just remembered, so the page can show it
    // straight away instead of re-fetching.
    ...(stored ? { savedCard: stored } : {}),
  });
};
