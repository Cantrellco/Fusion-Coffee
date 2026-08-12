// ============================================================
// Cloudflare Pages Function — POST /api/quote
//
// The exact tax-inclusive total for a cart, BEFORE checkout. Display only: no
// order is created, no card is touched, and /api/checkout keeps charging
// Square's own computed total regardless of what this said.
//
// Why it exists: Baymard's single most-cited abandonment cause is a total that
// changes after the buyer commits, and Apple/Google require the wallet sheet to
// show the FINAL charged amount. Until now the page could only say "sales tax
// is added on the payment step" — the one number the customer never saw was the
// one their card would be charged. Square's CalculateOrder endpoint prices the
// same line items the checkout will create (same tax, same shipping) without
// creating anything.
//
// It serves BOTH carts, mirroring checkout.ts:
//
//   kind: 'cafe'  (default)  — /order. Re-priced from src/lib/order.ts, tip as
//                              a TOTAL_PHASE service charge.
//   kind: 'shop'             — /merch. Re-priced from the Square catalog, plus
//                              the flat-rate postage for the fulfillment the
//                              bag actually allows.
//
// The cart is re-priced HERE TOO (same rules as checkout.ts): a quote for a
// tampered cart would faithfully display a price the server would later refuse,
// which is just a slower way to hit the 409. Mismatches return the same
// `price_changed` shape so the page can reuse its repricing panel.
//
// The one thing this must never do is disagree with checkout.ts about money.
// Both build their line items the same way, both spread the same salesTax()
// onto the order, and both let Square do the arithmetic.
// ============================================================

import { orderMenu, unitPriceCents, type CartModifier } from '../../src/lib/order';
import { merch } from '../../src/lib/site';
import { salesTax, taxableLine } from '../../src/lib/tax';
import {
  shippingCents,
  resolveFulfillment,
  productSlug,
  type Fulfillment,
} from '../../src/lib/shop';

type Ctx = {
  request: Request;
  env: {
    SQUARE_ACCESS_TOKEN?: string;
    SQUARE_LOCATION_ID?: string;
    SQUARE_ENVIRONMENT?: string;
  };
};

type QuoteLine = {
  itemId: string;
  name: string;
  qty: number;
  priceCents: number;
  modifiers?: { groupId: string; label: string; value: string; priceCents?: number }[];
  squareCatalogObjectId?: string | null;
  /** Merch only: the Square catalog VARIATION id that prices this line. */
  variationId?: string;
};

type QuoteBody = {
  /** Omitted on the café payload for backwards compatibility. */
  kind?: 'cafe' | 'shop';
  lines: QuoteLine[];
  tipCents?: number;
  /** Merch only — what the customer picked; a gift card can override it. */
  fulfillment?: Fulfillment;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const SQUARE_VERSION = '2025-10-16';

const cafeItems = new Map(
  orderMenu.flatMap((cat) => cat.items.map((it) => [it.id, it] as const)),
);

// Same derivation as checkout.ts — from our own merch data, never the request.
const merchItems = new Map<string, { pickupOnly: boolean; taxExempt: boolean }>(
  merch.groups.flatMap((g) =>
    g.items.map(
      (i) =>
        [
          productSlug(i.name),
          { pickupOnly: i.pickupOnly ?? false, taxExempt: i.taxExempt ?? false },
        ] as const,
    ),
  ),
);

/** Same re-pricing as checkout.ts — one set of rules, applied twice. */
function repriceCafeLine(line: QuoteLine): number | null {
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

/** Merch prices come from Square's catalog, exactly as in checkout.ts. */
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
    if (d?.pricing_type === 'VARIABLE_PRICING') continue;
    if (typeof d?.price_money?.amount === 'number') {
      prices.set(o.id, d.price_money.amount);
    }
  }
  return prices;
}

export const onRequestPost = async (ctx: Ctx): Promise<Response> => {
  const { env, request } = ctx;
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    return json({ error: 'not_configured' }, 501);
  }

  let body: QuoteBody;
  try {
    body = (await request.json()) as QuoteBody;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'bad_request' }, 400);
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 50) {
    return json({ error: 'bad_request' }, 400);
  }
  if (body.lines.some((l) => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 99)) {
    return json({ error: 'bad_request' }, 400);
  }

  const kind = body.kind === 'shop' ? 'shop' : 'cafe';
  const base =
    (env.SQUARE_ENVIRONMENT ?? 'sandbox') === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
  const headers = {
    'Square-Version': SQUARE_VERSION,
    Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Build the SAME line items checkout.ts will create, so Square applies the
  // same tax to both, and re-price them the same way it does.
  let subtotalCents = 0;
  let lineItems: Record<string, unknown>[];
  const mismatched: { itemId: string; shownCents: number; actualCents: number | null }[] = [];

  if (kind === 'shop') {
    const ids = body.lines.map((l) => l.variationId).filter(Boolean) as string[];
    if (ids.length !== body.lines.length) {
      return json({ error: 'unpriced_item' }, 400);
    }
    const prices = await fetchVariationPrices(base, headers, [...new Set(ids)]);
    if (!prices) return json({ error: 'quote_unavailable' }, 502);

    for (const line of body.lines) {
      const actual = prices.get(line.variationId as string) ?? null;
      if (actual === null || actual !== line.priceCents) {
        mismatched.push({ itemId: line.itemId, shownCents: line.priceCents, actualCents: actual });
      } else {
        subtotalCents += actual * line.qty;
      }
    }
    if (mismatched.length) {
      return json({ error: 'price_changed', lines: mismatched }, 409);
    }

    lineItems = body.lines.map((l) => ({
      catalog_object_id: l.variationId,
      quantity: String(l.qty),
      ...taxableLine(!(merchItems.get(l.itemId)?.taxExempt ?? false)),
    }));
  } else {
    for (const line of body.lines) {
      const actual = repriceCafeLine(line);
      if (actual === null || actual !== line.priceCents) {
        mismatched.push({ itemId: line.itemId, shownCents: line.priceCents, actualCents: actual });
      } else {
        subtotalCents += actual * line.qty;
      }
    }
    if (mismatched.length) {
      return json({ error: 'price_changed', lines: mismatched }, 409);
    }

    // Mirrors checkout.ts's café branch: a catalog id carries catalog tax; a
    // line with paid modifiers stays ad-hoc. Everything here is taxable.
    lineItems = body.lines.map((l) => {
      const hasPaidModifier = l.modifiers?.some((m) => (m.priceCents ?? 0) > 0);
      if (l.squareCatalogObjectId && !hasPaidModifier) {
        return {
          catalog_object_id: l.squareCatalogObjectId,
          quantity: String(l.qty),
          ...taxableLine(true),
        };
      }
      return {
        name: l.name,
        quantity: String(l.qty),
        base_price_money: { amount: l.priceCents, currency: 'USD' },
        ...taxableLine(true),
      };
    });
  }

  // Tip is café-only; shipping is merch-only. Both are computed here, from the
  // same sources checkout.ts uses — the browser's figures are display-only.
  const tipCents =
    kind === 'cafe' && Number.isFinite(body.tipCents)
      ? Math.max(0, Math.min(Math.round(body.tipCents as number), subtotalCents))
      : 0;
  const fulfillment: Fulfillment =
    kind === 'shop'
      ? resolveFulfillment(
          body.lines.map((l) => ({
            pickupOnly: merchItems.get(l.itemId)?.pickupOnly ?? false,
          })),
          body.fulfillment === 'SHIPMENT' ? 'SHIPMENT' : 'PICKUP',
        )
      : 'PICKUP';
  const shipCents = kind === 'shop' ? shippingCents(fulfillment, subtotalCents) : 0;

  // Both are TOTAL_PHASE, so Square adds them AFTER tax and neither is itself
  // taxed — same as checkout.ts, which is the point.
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
      calculation_phase: 'TOTAL_PHASE',
    });
  }

  const res = await fetch(`${base}/v2/orders/calculate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        line_items: lineItems,
        ...(serviceCharges.length ? { service_charges: serviceCharges } : {}),
        ...salesTax(),
      },
    }),
  });
  if (!res.ok) {
    // Quote unavailable is a shrug, not an error state — the page falls back
    // to subtotal + extras with the tax note, exactly what it showed before
    // this endpoint existed.
    return json({ error: 'quote_unavailable' }, 502);
  }
  const data = (await res.json()) as {
    order?: { total_money?: { amount?: number }; total_tax_money?: { amount?: number } };
  };
  const total = data.order?.total_money?.amount;
  if (typeof total !== 'number') return json({ error: 'quote_unavailable' }, 502);

  return json({
    subtotalCents,
    tipCents,
    shipCents,
    fulfillment,
    taxCents: data.order?.total_tax_money?.amount ?? 0,
    totalCents: total,
  });
};
