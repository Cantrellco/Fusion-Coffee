// ============================================================
// Orderable menu — the data the on-site Order page (/order) runs on.
//
// It is DERIVED from `regularMenu` (the same in-shop menu shown on /menu),
// so the order page can never drift from the menu page: one source of truth.
// Prices are the real listed prices, converted to integer CENTS for exact math.
//
// ⚠️ WIRE-UP: when the live Square catalog is connected, THIS FILE is what gets
// replaced — the build step will map Square's CatalogItem / CatalogItemVariation
// / CatalogModifierList into the exact same shape below, so none of the UI
// changes. `squareCatalogObjectId` is carried on each item/modifier for that
// day (the Orders API needs it to build a real order); it is null until then.
// Modifier upcharges are $0 here (the shop lists flavors as free add-ons); real
// modifier pricing will arrive from the Square catalog.
// ============================================================

import { regularMenu } from './site';

export type OrderModifierGroup = {
  id: string;
  label: string;
  /** When true the customer must pick one; we default to the first option. */
  required?: boolean;
  options: string[];
};

export type OrderItem = {
  id: string;
  name: string;
  priceCents: number;
  description?: string;
  modifiers?: OrderModifierGroup[];
  /** Square Catalog object id — filled in at catalog wire-up, null until then. */
  squareCatalogObjectId?: string | null;
};

export type OrderCategory = {
  id: string;
  heading: string;
  note?: string;
  items: OrderItem[];
};

/** "$5.50" -> 550. Tolerant of stray characters. */
function toCents(price: string): number {
  return Math.round(parseFloat(price.replace(/[^0-9.]/g, '')) * 100) || 0;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Milk + flavor mirror the real menu, where flavors are free add-ons
// ("Add to any drink") — so no upcharge is invented here.
const MILK: OrderModifierGroup = {
  id: 'milk',
  label: 'Milk',
  required: true,
  options: ['Whole', '2%', 'Oat', 'Almond', 'Nonfat'],
};

const FLAVOR: OrderModifierGroup = {
  id: 'flavor',
  label: 'Flavor',
  options: ['None', ...regularMenu.flavors],
};

export const orderMenu: OrderCategory[] = [
  // Drinks: coffee + non-coffee get milk & flavor; tea keeps flavor only.
  ...regularMenu.drinks.map((group) => ({
    id: slug(group.heading),
    heading: group.heading,
    items: group.items.map((it) => ({
      id: slug(it.name),
      name: it.name,
      priceCents: toCents(it.price),
      modifiers: group.heading === 'Tea' ? [FLAVOR] : [MILK, FLAVOR],
      squareCatalogObjectId: null,
    })),
  })),
  {
    id: 'breakfast',
    heading: 'Breakfast Sandwiches',
    note: regularMenu.breakfastSandwiches.note,
    items: regularMenu.breakfastSandwiches.items.map((it) => ({
      id: slug(it.name),
      name: it.name,
      priceCents: toCents(it.price),
      description: it.description,
      squareCatalogObjectId: null,
    })),
  },
  {
    id: 'eats',
    heading: 'Eats',
    items: regularMenu.eats.map((it) => ({
      id: slug(it.name),
      name: it.name,
      priceCents: toCents(it.price),
      squareCatalogObjectId: null,
    })),
  },
  {
    id: 'sandwiches',
    heading: 'Sandwiches',
    items: regularMenu.sandwiches.map((it) => ({
      id: slug(it.name),
      name: it.name,
      priceCents: toCents(it.price),
      squareCatalogObjectId: null,
    })),
  },
];

/** 550 -> "$5.50". */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---- Cart line shape (shared by the UI and the checkout payload) ----

export type CartModifier = { groupId: string; label: string; value: string };

export type CartLine = {
  /** Stable key = item id + chosen modifiers, so identical builds stack. */
  key: string;
  itemId: string;
  name: string;
  priceCents: number;
  qty: number;
  modifiers: CartModifier[];
  squareCatalogObjectId?: string | null;
};

export function lineKey(itemId: string, modifiers: CartModifier[]): string {
  const mods = modifiers
    .filter((m) => m.value && m.value !== 'None')
    .map((m) => `${m.groupId}:${m.value}`)
    .sort()
    .join('|');
  return mods ? `${itemId}__${mods}` : itemId;
}
