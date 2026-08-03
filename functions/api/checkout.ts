// ============================================================
// Cloudflare Pages Function — POST /api/checkout
//
// This is the ONE piece that must run server-side: it holds the shop's Square
// secret access token and turns the cart the browser sends into a real Square
// Order + Payment. It deploys alongside the static site on Cloudflare Pages, so
// everything still lives on fusioncoffeeshop.com — one host, one domain.
//
// STATUS: scaffold. Until the Square keys are set as encrypted Pages secrets,
// this returns HTTP 501 { error: 'not_configured' }, which the Order page shows
// as a friendly "payment isn't switched on yet" panel. The moment the secrets
// exist, the real Orders + Payments flow below runs.
//
// Required Pages secrets (Cloudflare dashboard → Settings → Environment
// variables, encrypted), from the client's Square Developer app:
//   SQUARE_ACCESS_TOKEN   — secret; sandbox token to build, production at launch
//   SQUARE_LOCATION_ID    — the shop's location id
//   SQUARE_ENVIRONMENT    — "sandbox" | "production" (defaults to sandbox)
//
// PIPELINE (Orders API + Payments API, both plain HTTPS REST so no SDK needed
// on the Workers runtime):
//   1. CreateOrder  — line items from the cart (real catalog object ids once the
//                     catalog is wired; ad-hoc name+price lines until then),
//                     PICKUP fulfillment, tip as a service charge.
//   2. CreatePayment— charge the Web Payments SDK card token (added with the
//                     on-page card form in the next build step) against the order.
// The order then appears on the shop's Square POS / Order Manager exactly like
// any other online order, and decrements the same inventory as the register.
// ============================================================

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
  priceCents: number;
  modifiers?: { groupId: string; label: string; value: string }[];
  squareCatalogObjectId?: string | null;
};

type CheckoutBody = {
  customerName: string;
  pickup: string;
  tipCents: number;
  subtotalCents: number;
  lines: CheckoutLine[];
  // Added in the next step, when the on-page Square card form is wired in:
  sourceId?: string; // Web Payments SDK payment token (card nonce)
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function squareBase(env: Ctx['env']): string {
  return (env.SQUARE_ENVIRONMENT ?? 'sandbox') === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

export const onRequestPost = async (ctx: Ctx): Promise<Response> => {
  const { env, request } = ctx;

  // Not configured yet → tell the client to show the "ready for Square" panel.
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    return json({ error: 'not_configured' }, 501);
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  if (!body.lines?.length || !body.customerName) {
    return json({ error: 'empty_order' }, 400);
  }

  const base = squareBase(env);
  const headers = {
    'Square-Version': '2025-10-16',
    Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  // Idempotency keys prevent a retried request from double-charging. crypto is
  // available on the Workers runtime.
  const idem = crypto.randomUUID();

  // ---- 1. Create the order ------------------------------------------------
  const lineItems = body.lines.map((l) => {
    const note = l.modifiers?.map((m) => `${m.label}: ${m.value}`).join(', ');
    // Prefer the real catalog object id (inherits catalog price + tax); fall
    // back to an ad-hoc line item (name + price) until the catalog is wired.
    if (l.squareCatalogObjectId) {
      return {
        catalog_object_id: l.squareCatalogObjectId,
        quantity: String(l.qty),
        ...(note ? { note } : {}),
      };
    }
    return {
      name: l.name,
      quantity: String(l.qty),
      base_price_money: { amount: l.priceCents, currency: 'USD' },
      ...(note ? { note } : {}),
    };
  });

  const orderReq = {
    idempotency_key: idem,
    order: {
      location_id: env.SQUARE_LOCATION_ID,
      line_items: lineItems,
      fulfillments: [
        {
          type: 'PICKUP',
          state: 'PROPOSED',
          pickup_details: {
            recipient: { display_name: body.customerName },
            schedule_type: 'ASAP',
            note: body.pickup,
          },
        },
      ],
      ...(body.tipCents > 0
        ? {
            service_charges: [
              {
                name: 'Tip',
                amount_money: { amount: body.tipCents, currency: 'USD' },
                calculation_phase: 'TOTAL_PHASE',
              },
            ],
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
  // Needs the Web Payments SDK card token (body.sourceId) from the on-page card
  // form — that form is the next build step. Until it's sending a token, stop
  // here and report the order was created but payment is pending.
  if (!body.sourceId) {
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

  const amount = orderData.order.total_money?.amount ?? body.subtotalCents + body.tipCents;
  const paymentRes = await fetch(`${base}/v2/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
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

  return json({
    status: 'paid',
    orderId: orderData.order.id,
    paymentId: paymentData.payment.id,
  });
};
