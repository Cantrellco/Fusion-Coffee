// ============================================================
// Square catalog → the shop grid on /merch.
//
// Two sources, each owning what it is actually good at:
//
//   src/lib/site.ts        — names, copy, photography, grouping, order.
//                            Ours. The listing photos in Square are worse
//                            than the ones shot for this site.
//   square-catalog.json    — PRICES, sizes, variation ids, availability.
//                            Square's. Never hand-edited, never guessed.
//
// This module joins the two by NAME and produces the ShopProduct list the
// page renders. A curated item with no catalog match is still SHOWN (the
// photography and copy are worth keeping on the page) but is not purchasable
// — `available: false`. We would rather say "ask in store" than invent a
// price for a real product.
//
// The snapshot is refreshed by `npm run sync:catalog`, then committed. A price
// edited in Square reaches the site on the next sync + deploy.
//
// A stale snapshot cannot cause a wrong charge: /api/checkout re-fetches every
// variation price from Square before it creates an order, and stops with
// `price_changed` if the displayed price no longer matches. The worst a stale
// snapshot can do is show an old number and refuse the sale — never take the
// wrong amount. (If same-day price edits ever matter, the upgrade is a live
// /api/catalog passthrough feeding buildShopGroups() on mount; it is not worth
// duplicating the mapper for today.)
// ============================================================

import snapshot from './square-catalog.json';
import { merch } from './site';
import { productSlug, type FulfilledBy } from './shop';

// ---- the shape sync-square-catalog.mjs writes ----

export type CatalogVariation = {
  id: string;
  name: string;
  priceCents: number | null;
  sku: string | null;
  ordinal: number;
  variablePricing: boolean;
};

export type CatalogProduct = {
  squareItemId: string;
  name: string;
  description: string | null;
  categories: string[];
  images: string[];
  variations: CatalogVariation[];
  modifierListIds: string[];
  sellable: boolean;
};

export type CatalogSnapshot = {
  syncedAt: string;
  environment: string;
  products: CatalogProduct[];
  modifierLists: {
    id: string;
    name: string;
    selectionType: string;
    modifiers: { id: string; name: string; priceCents: number; ordinal: number }[];
  }[];
};

// ---- what the page renders ----

/** One buyable option. `id` is the Square VARIATION id — the price key. */
export type ShopVariation = {
  id: string;
  name: string;
  priceCents: number;
};

export type ShopProduct = {
  /** Our own slug. Stable across catalog churn, so cart keys survive a re-sync. */
  id: string;
  name: string;
  brand?: string;
  blurb: string;
  image: string;
  alt: string;
  group: string;
  /** Who posts it when posted; pickup is always the shop. */
  shipsFrom: FulfilledBy;
  /** Cannot be posted — must be collected in store (the gift card). */
  pickupOnly: boolean;
  /** Empty when the catalog has no priced match for this item. */
  variations: ShopVariation[];
  /** True only when Square gave us at least one real, fixed price. */
  available: boolean;
  squareItemId: string | null;
};

export type ShopGroup = {
  heading: string;
  index: string;
  blurb: string;
  products: ShopProduct[];
};

/**
 * Match key for joining our names to Square's. Case, punctuation and spacing
 * are all noise — "Support Your Local Hoodie" and "support your local hoodie"
 * are the same product. Deliberately NOT fuzzy beyond that: a substring match
 * would happily pair "Fusion Staple Hoodie" with "Fusion Staple Sticker" and
 * sell a $6 sticker at hoodie money (or the reverse). When a catalog name
 * genuinely differs, set `squareName` on the item in site.ts — the sync script
 * prints every catalog name to copy from.
 */
function matchKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Only variations that can actually be charged: a real, fixed, positive price. */
function sellableVariations(product: CatalogProduct): ShopVariation[] {
  return product.variations
    .filter(
      (v): v is CatalogVariation & { priceCents: number } =>
        !v.variablePricing && typeof v.priceCents === 'number' && v.priceCents > 0,
    )
    .map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents }));
}

/**
 * Join the curated merch groups to a catalog snapshot. Pass null (or a
 * snapshot with no products) and every product comes back unavailable, which
 * is exactly what the page shows before the shop's production catalog is
 * connected.
 */
export function buildShopGroups(catalog: CatalogSnapshot | null): ShopGroup[] {
  // The live catalog carries DUPLICATE entries under the same name — a legacy
  // "Regular" one-price row alongside the current sized row (both "Fusion
  // Staple Hoodie", one with S–3XL and one without). Picking the wrong twin
  // would sell a hoodie with no size choice, so the tiebreak is explicit:
  //
  //   1. more sellable variations wins — the sized row beats the legacy row;
  //   2. then the LOWER starting price wins — if two rows are equally detailed
  //      we never surprise anyone with the dearer one.
  //
  // Deterministic either way, so the same snapshot always builds the same shop.
  const byKey = new Map<string, CatalogProduct>();
  for (const p of catalog?.products ?? []) {
    const key = matchKey(p.name);
    const incoming = sellableVariations(p);
    if (!incoming.length) continue;
    const held = byKey.get(key);
    if (!held) {
      byKey.set(key, p);
      continue;
    }
    const current = sellableVariations(held);
    const better =
      incoming.length !== current.length
        ? incoming.length > current.length
        : Math.min(...incoming.map((v) => v.priceCents)) <
          Math.min(...current.map((v) => v.priceCents));
    if (better) byKey.set(key, p);
  }

  return merch.groups.map((group) => ({
    heading: group.heading,
    index: group.index,
    blurb: group.blurb,
    products: group.items.map((item) => {
      const match = byKey.get(matchKey(item.squareName ?? item.name));
      const variations = match ? sellableVariations(match) : [];
      return {
        id: productSlug(item.name),
        name: item.name,
        ...(item.brand ? { brand: item.brand } : {}),
        blurb: item.blurb,
        image: item.image,
        alt: item.alt,
        group: group.heading,
        shipsFrom: item.shipsFrom ?? 'shop',
        pickupOnly: item.pickupOnly ?? false,
        variations,
        available: variations.length > 0,
        squareItemId: match?.squareItemId ?? null,
      };
    }),
  }));
}

/** The build-time snapshot, as committed. */
export const catalogSnapshot = snapshot as CatalogSnapshot;

/** Static default the page renders on first paint. */
export const shopGroups: ShopGroup[] = buildShopGroups(catalogSnapshot);

/** True when the connected catalog can actually sell at least one thing. */
export function hasSellableCatalog(groups: ShopGroup[]): boolean {
  return groups.some((g) => g.products.some((p) => p.available));
}

/** Cheapest variation — what the grid shows as "from $X". */
export function fromPriceCents(product: ShopProduct): number | null {
  if (!product.variations.length) return null;
  return Math.min(...product.variations.map((v) => v.priceCents));
}
