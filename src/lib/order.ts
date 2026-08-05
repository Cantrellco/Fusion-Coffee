// ============================================================
// Orderable menu — the data the on-site Order page (/order) runs on.
//
// It is DERIVED from `summerMenu` + `regularMenu` (the same two menus shown on
// /menu), in the same order /menu presents them — seasonal first, then drinks,
// breakfast, eats, sandwiches — so the order page can never drift from the menu
// page: one source of truth. Prices are the listed prices, converted to integer
// CENTS for exact math. (Seasonal prices are derived, not printed — see the
// SummerItem block in site.ts.)
//
// ⚠️ WIRE-UP: when the live Square catalog is connected, THIS FILE is what gets
// replaced — the build step will map Square's CatalogItem / CatalogItemVariation
// / CatalogModifierList into the exact same shape below, so none of the UI
// changes. `squareCatalogObjectId` is carried on each item/modifier for that
// day (the Orders API needs it to build a real order); it is null until then.
// ============================================================

import { regularMenu, summerMenu } from './site';

/**
 * One choice inside a modifier group. `priceCents` is an upcharge ADDED to the
 * line's unit price — omitted means free.
 */
export type OrderModifierOption = {
  /** Canonical name — what the cart, the Square note and the barista see. */
  value: string;
  /**
   * Optional label for the dropdown only. The group's name is visually hidden
   * (screen readers get it via aria-label), so a bare "None" or "Regular" in a
   * row of four dropdowns tells the customer nothing — these spell it out.
   * Never sent anywhere; `value` stays canonical.
   */
  display?: string;
  /**
   * "I didn't pick anything" — no milk, no flavor, no extra shot. These are
   * dropped from the cart line and the barista's note, so a plain latte doesn't
   * read "Iced · Regular · None". Free by definition.
   */
  noop?: boolean;
  priceCents?: number;
};

export type OrderModifierGroup = {
  id: string;
  label: string;
  /** When true the customer must pick one; we default to the first option. */
  required?: boolean;
  /** First option is the default the UI preselects — always keep it free. */
  options: OrderModifierOption[];
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
  /** Limited-time section — the UI badges it like the /menu seasonal chip. */
  seasonal?: boolean;
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

// ---- Modifier groups + real upcharges (confirmed by the shop 2026-08-03) ----
//
// Every group leads with a FREE option, because the UI preselects the first
// one: nobody is ever charged for a modifier they did not actively pick.
//
// NOTE: the flavor list here is the ORDERING list, which is shorter than the
// printed in-shop board (`regularMenu.flavors` — that one also carries Maple
// and Brown Sugar (SF)). /menu still shows the full board; only these five are
// orderable online. Add the other two here if the shop wants them online.

const MILK: OrderModifierGroup = {
  id: 'milk',
  label: 'Milk',
  options: [
    { value: 'Whole', display: 'Whole milk' },
    { value: 'Skim', display: 'Skim milk' },
    { value: 'Oat', display: 'Oat milk', priceCents: 100 },
    { value: 'Almond', display: 'Almond milk', priceCents: 100 },
    { value: 'None', display: 'No milk', noop: true },
  ],
};

const FLAVOR: OrderModifierGroup = {
  id: 'flavor',
  label: 'Flavor',
  options: [
    { value: 'None', display: 'No flavor', noop: true },
    { value: 'Caramel', priceCents: 50 },
    { value: 'Mocha', priceCents: 50 },
    { value: 'Honey Cinnamon', priceCents: 50 },
    { value: 'Cuban', priceCents: 50 },
    { value: 'Vanilla', priceCents: 50 },
    { value: 'Maple', priceCents: 50 },
    // Named exactly as the printed board spells it, so the barista ticket and
    // the wall menu agree. `display` spells out the abbreviation, because "(SF)"
    // in a dropdown is not obvious to anyone who has not read the board.
    {
      value: 'Brown Sugar (SF)',
      display: 'Brown sugar — sugar free',
      priceCents: 50,
    },
  ],
};

const EXTRA_SHOT: OrderModifierGroup = {
  id: 'shot',
  label: 'Extra Shot',
  options: [
    { value: 'Regular', display: 'No extra shot', noop: true },
    { value: 'Extra Shot of Espresso', display: 'Extra shot', priceCents: 100 },
  ],
};

const TEMP: OrderModifierGroup = {
  id: 'temp',
  label: 'Hot or Iced',
  options: [{ value: 'Iced' }, { value: 'Hot' }],
};

// Which groups an item gets. Milk and Extra Shot cost money now, so they are
// kept off drinks they make no sense on — a $1.00 oat-milk upcharge on a
// lemonade would be a real overcharge, not just an odd option.
const isLemonade = (name: string) => /lemonade/i.test(name);
/** Espresso- or brew-based, so an extra shot is a real thing to sell. */
const takesEspresso = (name: string, blurb = '') =>
  /espresso|brew|latte|americano|cortado|cappuccino|macchiato/i.test(
    `${name} ${blurb}`,
  );

function drinkModifiers(name: string, blurb = ''): OrderModifierGroup[] {
  // Plain milk (the $2.50 carton) is a drink, not a build — no options on it,
  // so it never asks "what milk?" about a glass of milk.
  if (name === 'Milk') return [];
  const groups: OrderModifierGroup[] = [TEMP];
  if (!isLemonade(name)) groups.push(MILK);
  groups.push(FLAVOR);
  if (takesEspresso(name, blurb)) groups.push(EXTRA_SHOT);
  return groups;
}

export const orderMenu: OrderCategory[] = [
  // Seasonal first — /menu leads with the Summer Menu, so /order does too.
  // Its two groups (Drinks, Food) stay separate exactly as they read on /menu;
  // the drinks take the same milk + flavor options as the regular bar, the
  // food takes none. Blurbs carry over as the item description, and each item
  // keeps its hand-drawn specimen sketch (matched by name in SummerSpecimens).
  ...summerMenu.groups.map((group) => ({
    id: `summer-${slug(group.heading)}`,
    heading: `Summer ${group.heading}`,
    note: summerMenu.eyebrow,
    seasonal: true,
    items: group.items.map((it) => ({
      id: slug(it.name),
      name: it.name,
      priceCents: toCents(it.price),
      description: it.blurb,
      ...(/drink/i.test(group.heading)
        ? { modifiers: drinkModifiers(it.name, it.blurb) }
        : {}),
      squareCatalogObjectId: null,
    })),
  })),

  // Drinks: same rules as the seasonal bar — temperature on everything, milk
  // and an extra shot only where they apply, flavor everywhere.
  ...regularMenu.drinks.map((group) => ({
    id: slug(group.heading),
    heading: group.heading,
    items: group.items.map((it) => ({
      id: slug(it.name),
      name: it.name,
      priceCents: toCents(it.price),
      modifiers:
        group.heading === 'Tea' ? [TEMP, FLAVOR] : drinkModifiers(it.name),
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

export type CartModifier = {
  groupId: string;
  label: string;
  value: string;
  /** Upcharge for this choice, already folded into the line's priceCents. */
  priceCents: number;
};

export type CartLine = {
  /** Stable key = item id + chosen modifiers, so identical builds stack. */
  key: string;
  itemId: string;
  name: string;
  /** UNIT price: the item's base price plus every modifier upcharge. */
  priceCents: number;
  qty: number;
  modifiers: CartModifier[];
  squareCatalogObjectId?: string | null;
};

/** Base price + every chosen upcharge = what one of this build costs. */
export function unitPriceCents(
  basePriceCents: number,
  modifiers: CartModifier[],
): number {
  return modifiers.reduce((sum, m) => sum + (m.priceCents || 0), basePriceCents);
}

export function lineKey(itemId: string, modifiers: CartModifier[]): string {
  const mods = modifiers
    .filter((m) => m.value && m.value !== 'None')
    .map((m) => `${m.groupId}:${m.value}`)
    .sort()
    .join('|');
  return mods ? `${itemId}__${mods}` : itemId;
}
