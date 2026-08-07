// ============================================================
// Cloudflare Pages Function — POST /api/quote
//
// The exact tax-inclusive total for a café cart, BEFORE checkout. Display
// only: no order is created, no card is touched, and /api/checkout keeps
// charging Square's own computed total regardless of what this said.
//
// Why it exists: Baymard's single most-cited abandonment cause is a total
// that changes after the buyer commits, and Apple/Google require the wallet
// sheet to show the FINAL charged amount. Until now the page could only say
// "sales tax is added on the payment step" — the one number the customer
// never saw was the one their card would be charged. Square's CalculateOrder
// endpoint prices the same line items the checkout will create (catalog tax
// rules included) without creating anything.
//
// The cart is re-priced HERE TOO (same rules as checkout.ts): a quote for a
// tampered cart would faithfully display a price the server would later
// refuse, which is just a slower way to hit the 409. Mismatches return the
// same `price_changed` shape so the page can reuse its repricing panel.
// ============================================================

import { orderMenu, unitPriceCents, type CartModifier } from '../../src/lib/order';

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
};

type QuoteBody = {
  lines: QuoteLine[];
  tipCents?: number;
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

  let subtotalCents = 0;
  const mismatched: { itemId: string; shownCents: number; actualCents: number | null }[] = [];
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

  const tipCents = Number.isFinite(body.tipCents)
    ? Math.max(0, Math.min(Math.round(body.tipCents as number), subtotalCents))
    : 0;

  // Build the SAME line items checkout.ts will create, so Square applies the
  // same catalog tax rules to both. (Mirrors checkout.ts's café branch: a
  // catalog id carries catalog tax; a line with paid modifiers stays ad-hoc.)
  const lineItems = body.lines.map((l) => {
    const hasPaidModifier = l.modifiers?.some((m) => (m.priceCents ?? 0) > 0);
    if (l.squareCatalogObjectId && !hasPaidModifier) {
      return { catalog_object_id: l.squareCatalogObjectId, quantity: String(l.qty) };
    }
    return {
      name: l.name,
      quantity: String(l.qty),
      base_price_money: { amount: l.priceCents, currency: 'USD' },
    };
  });

  const base =
    (env.SQUARE_ENVIRONMENT ?? 'sandbox') === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

  const res = await fetch(`${base}/v2/orders/calculate`, {
    method: 'POST',
    headers: {
      'Square-Version': SQUARE_VERSION,
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        line_items: lineItems,
        ...(tipCents > 0
          ? {
              service_charges: [
                {
                  name: 'Tip',
                  amount_money: { amount: tipCents, currency: 'USD' },
                  calculation_phase: 'TOTAL_PHASE',
                },
              ],
            }
          : {}),
      },
    }),
  });
  if (!res.ok) {
    // Quote unavailable is a shrug, not an error state — the page falls back
    // to subtotal + tip with the tax note, exactly what it showed before this
    // endpoint existed.
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
    taxCents: data.order?.total_tax_money?.amount ?? 0,
    totalCents: total,
  });
};
