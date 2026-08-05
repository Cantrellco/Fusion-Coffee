// ============================================================
// Merch cart + fulfillment rules.
//
// Imported by BOTH the browser UI (src/components/merch/ShopExperience.tsx)
// and the Cloudflare checkout Worker (functions/api/checkout.ts), so the two
// can never disagree about what shipping costs or how an order is fulfilled.
// Keep this module free of anything Next-specific — the Worker bundles it.
//
// The browser's numbers are for DISPLAY ONLY. Every figure that decides what a
// card is charged is recomputed server-side from these same constants and from
// Square's own catalog prices; see functions/api/checkout.ts.
// ============================================================

export type Fulfillment = 'SHIPMENT' | 'PICKUP';

/**
 * WHO physically fulfills a product — distinct from HOW it reaches the customer
 * (Fulfillment, above).
 *
 *   'printful' — print-on-demand. Printful prints and ships it directly, and
 *                the shop never touches it. Today this is the five apparel
 *                items and nothing else.
 *   'shop'     — the shop's own stock: beans, tea, stickers, the tote, and the
 *                gift card. Packed and posted (or handed over) on Main Street.
 *
 * ⚠️ Printful learns about orders through its SQUARE ONLINE integration, and
 * this site checks out through the Square ORDERS API instead. Whether Printful
 * picks these up is unverified — see the fulfilment note in
 * functions/api/checkout.ts. Until it is confirmed on the shop's production
 * account, treat every Printful line as needing a human to look at it.
 */
export type FulfilledBy = 'printful' | 'shop';

/** Slug used as a product id everywhere — cart keys, order notes, catalog join. */
export function productSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---- Shipping ----------------------------------------------------------
//
// The shop does NOT charge postage — confirmed 2026-08-05, matching their
// existing storefront, which has never charged for shipping. Postage is absorbed
// into the item price, so every shipped order is free to the customer.
//
// This is kept as a function rather than deleted so there is still exactly ONE
// place that decides postage, and the browser and the Worker keep agreeing. If
// the shop ever wants to charge, put the rate here and both sides follow.
export const SHIPPING = {
  /** Where we ship. Square wants an ISO country code. */
  country: 'US',
};

/** What postage costs. Free, always — see above. */
export function shippingCents(
  _fulfillment: Fulfillment,
  _subtotalCents: number,
): number {
  return 0;
}

// ---- Cart --------------------------------------------------------------

/**
 * One line in the merch cart.
 *
 * `variationId` is a Square CATALOG VARIATION id, and it is the whole point:
 * the Worker sends it to Square as `catalog_object_id`, so Square applies its
 * own price and its own tax. The `priceCents` carried here is what the customer
 * was SHOWN — the server compares the two and refuses the order if they differ,
 * rather than trusting the browser's number.
 */
export type ShopCartLine = {
  /** Stable key: product slug + variation id. */
  key: string;
  productId: string;
  name: string;
  /** Variation label ("Medium", "$25"). Empty when the item has one option. */
  variationName: string;
  variationId: string;
  priceCents: number;
  qty: number;
  /** Who posts it when posted. Pickup always means the shop — resolveFulfilledBy(). */
  shipsFrom: FulfilledBy;
  /** Cannot be posted at all (the gift card). */
  pickupOnly: boolean;
  image: string;
};

/**
 * Split the cart by who fulfills it. Used to annotate the Square order so shop
 * staff can see at a glance which lines they pack themselves and which ones are
 * Printful's — a mixed bag (a hoodie and a bag of beans) is one Square order but
 * two different fulfilment paths, and nothing else in Square says so.
 *
 * The browser's copy of this is for display; the Worker recomputes it from the
 * merch data before writing the note.
 */
export function fulfillmentSplit(
  lines: { shipsFrom: FulfilledBy; qty: number }[],
  fulfillment: Fulfillment,
): { printful: number; shop: number } {
  return lines.reduce(
    (acc, l) => {
      acc[resolveFulfilledBy(l, fulfillment)] += l.qty;
      return acc;
    },
    { printful: 0, shop: 0 },
  );
}

/**
 * Who ACTUALLY fulfills one line, given how the order is being fulfilled.
 *
 * The rule that matters: **Printful only drop-ships.** It prints to order and
 * posts straight to the customer — it has no way to deliver a hoodie to the
 * counter on Main Street. So the moment an order is collected in store, every
 * line on it is the shop's own job, pulled off the rack, regardless of
 * `shipsFrom`.
 *
 * This is the single place that decision is made. Read `shipsFrom` directly
 * anywhere else and a picked-up hoodie will get routed to Printful, which
 * would print and post a garment the customer is standing in the shop waiting
 * to collect.
 */
export function resolveFulfilledBy(
  line: { shipsFrom: FulfilledBy },
  fulfillment: Fulfillment,
): FulfilledBy {
  if (fulfillment === 'PICKUP') return 'shop';
  return line.shipsFrom;
}

/** False when something in the bag can only be collected (the gift card). */
export function canShip(lines: { pickupOnly: boolean }[]): boolean {
  return !lines.some((l) => l.pickupOnly);
}

/**
 * The fulfillment the order will actually use. The customer picks, but a
 * pickup-only item overrides the choice — everything on this site can be
 * collected, so forcing PICKUP always leaves a workable order rather than a
 * dead end where they must guess which item to remove.
 */
export function resolveFulfillment(
  lines: { pickupOnly: boolean }[],
  preferred: Fulfillment,
): Fulfillment {
  return canShip(lines) ? preferred : 'PICKUP';
}

export function shopLineKey(productId: string, variationId: string): string {
  return `${productId}__${variationId}`;
}

export function shopSubtotalCents(lines: ShopCartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}

// ---- Shipping address --------------------------------------------------

export type ShippingAddress = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

export const EMPTY_ADDRESS: ShippingAddress = {
  name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
};

const US_STATE_CODES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'puerto rico': 'PR',
};

/**
 * A two-letter state code from whatever a digital wallet handed us.
 *
 * Apple Pay and Google Pay each return the state in their own format — some
 * devices give "IL", others "Illinois" — and `addressProblems` below only
 * accepts the code. Truncating the word would turn Texas into "TE" and dead-end
 * an express checkout, so full names are looked up rather than cut. Anything
 * unrecognized comes back empty, which shows up as a normal missing-field
 * problem the customer can fix in the form.
 */
export function normalizeStateCode(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^[A-Za-z]{2}$/.test(value)) return value.toUpperCase();
  return US_STATE_CODES[value.toLowerCase()] ?? '';
}

/**
 * Which address fields are missing or malformed. Runs in the browser to gate
 * the pay button AND on the server to reject a hand-rolled POST — same rules,
 * one implementation, so a shipped order can never land without an address to
 * ship it to. Returns field keys, so the UI can mark the exact inputs.
 */
export function addressProblems(
  address: ShippingAddress,
  fulfillment: Fulfillment,
): (keyof ShippingAddress)[] {
  const problems: (keyof ShippingAddress)[] = [];
  if (!address.name.trim()) problems.push('name');
  // Intentionally permissive: "something@something.something". Anything
  // stricter rejects real addresses, and Square/the mail server is the real
  // arbiter anyway.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address.email.trim())) {
    problems.push('email');
  }
  if (fulfillment === 'PICKUP') return problems;

  if (!address.line1.trim()) problems.push('line1');
  if (!address.city.trim()) problems.push('city');
  if (!/^[A-Za-z]{2}$/.test(address.state.trim())) problems.push('state');
  if (!/^\d{5}(-\d{4})?$/.test(address.postalCode.trim())) problems.push('postalCode');
  return problems;
}
