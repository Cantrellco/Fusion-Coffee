// ============================================================
// Fall menu + cart-reconciliation invariants.
//
// Runs on plain Node (node:test / node:assert) against a CommonJS compile of
// the real modules — no test-runner dependency is added to the site. Build the
// compile first, then run:
//
//   npx tsc -p tsconfig.test.json
//   node --test tests/fall.test.cjs
//
// These guard the money- and data-critical parts of the summer→fall swap:
// the exact seasonal set and prices, the per-item default modifiers (Brown Bear
// has none / no oat upcharge, the Chaider has no milk or espresso), and the
// stored-cart reconciliation that must drop retired summer lines while keeping
// and re-pricing valid regular ones.
// ============================================================

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  orderMenu,
  unitPriceCents,
  reconcileCartLine,
  reconcileCart,
  lineIsCurrent,
} = require('../.tmp-test/lib/order.js');
const {
  fallMenu,
  FALL_IMAGE_WIDTH,
  FALL_IMAGE_HEIGHT,
} = require('../.tmp-test/lib/site.js');

const byId = new Map(
  orderMenu.flatMap((c) => c.items.map((it) => [it.id, it])),
);
const item = (id) => {
  const it = byId.get(id);
  assert.ok(it, `expected order item ${id} to exist`);
  return it;
};

// ---- the seasonal set -----------------------------------------------------

test('exactly the eight fall items, in two seasonal categories', () => {
  const seasonal = orderMenu.filter((c) => c.seasonal);
  assert.deepEqual(
    seasonal.map((c) => c.id),
    ['fall-drinks', 'fall-toast'],
  );
  const ids = seasonal.flatMap((c) => c.items.map((it) => it.id));
  assert.deepEqual(ids, [
    'fall-pumpkin-spice',
    'fall-peanut-butter',
    'fall-smore',
    'fall-brown-bear-cold-brew',
    'fall-apple-chaider',
    'fall-honey-butter',
    'fall-mediterranean-toast',
    'fall-caramel-apple-toast',
  ]);
  // No summer leftovers anywhere in the order menu.
  const all = orderMenu.flatMap((c) => c.items.map((it) => it.id));
  for (const gone of [
    'blueberry-latte',
    'banana-pudding-latte',
    'root-beer-float-flash-brew',
    'cereal-milk-latte',
    'pina-colada-lemonade',
    'dragon-fruit-lemonade',
    'peach-cobbler-yogurt-bowl',
    'summer-affogato',
  ]) {
    assert.ok(!all.includes(gone), `retired summer id ${gone} must be absent`);
  }
});

test('fall ids are explicit and fall-prefixed (no collision with summer slugs)', () => {
  for (const g of fallMenu.groups) {
    for (const it of g.items) assert.ok(it.id.startsWith('fall-'), it.id);
  }
});

test('base prices match the inferred board', () => {
  assert.equal(item('fall-pumpkin-spice').priceCents, 650);
  assert.equal(item('fall-peanut-butter').priceCents, 650);
  assert.equal(item('fall-smore').priceCents, 650);
  assert.equal(item('fall-brown-bear-cold-brew').priceCents, 650);
  assert.equal(item('fall-honey-butter').priceCents, 650);
  assert.equal(item('fall-apple-chaider').priceCents, 600);
  assert.equal(item('fall-mediterranean-toast').priceCents, 1000);
  assert.equal(item('fall-caramel-apple-toast').priceCents, 900);
});

test('every fall item carries a 128px svg emblem + provenance alt', () => {
  assert.equal(FALL_IMAGE_WIDTH, 128);
  assert.equal(FALL_IMAGE_HEIGHT, 128);
  for (const g of fallMenu.groups) {
    for (const it of g.items) {
      assert.match(it.image, /^\/images\/fall\/.+\.svg$/);
      assert.ok(it.alt && it.alt.length > 10, `alt for ${it.id}`);
    }
  }
});

// ---- default modifiers per build -----------------------------------------

const groupIds = (it) => (it.modifiers ?? []).map((g) => g.id);

test('espresso lattes take temp/milk/flavor/extra-shot with normal upcharges', () => {
  const pumpkin = item('fall-pumpkin-spice');
  assert.deepEqual(groupIds(pumpkin), ['temp', 'milk', 'flavor', 'shot']);
  const oat = pumpkin.modifiers
    .find((g) => g.id === 'milk')
    .options.find((o) => o.value === 'Oat');
  assert.equal(oat.priceCents, 100);
  // base + oat(+100) + flavor(+50) + extra shot(+100) = 900
  assert.equal(
    unitPriceCents(pumpkin.priceCents, [
      { groupId: 'milk', label: 'Milk', value: 'Oat', priceCents: 100 },
      { groupId: 'flavor', label: 'Flavor', value: 'Caramel', priceCents: 50 },
      { groupId: 'shot', label: 'Extra Shot', value: 'Extra Shot of Espresso', priceCents: 100 },
    ]),
    900,
  );
});

test('Brown Bear Cold Brew is grab-and-go: no modifiers, no oat upcharge', () => {
  const bear = item('fall-brown-bear-cold-brew');
  assert.deepEqual(groupIds(bear), []);
  // Nothing to add, so a build can only ever cost the base price.
  assert.equal(unitPriceCents(bear.priceCents, []), 650);
});

test('Apple Chaider has no milk and no espresso, but keeps temp + flavor', () => {
  const chaider = item('fall-apple-chaider');
  assert.deepEqual(groupIds(chaider), ['temp', 'flavor']);
  assert.ok(!groupIds(chaider).includes('milk'));
  assert.ok(!groupIds(chaider).includes('shot'));
});

test('toasts take no modifiers', () => {
  assert.deepEqual(groupIds(item('fall-mediterranean-toast')), []);
  assert.deepEqual(groupIds(item('fall-caramel-apple-toast')), []);
});

// ---- stored-cart reconciliation ------------------------------------------

const rawLine = (over) => ({
  key: 'x',
  itemId: 'latte',
  name: 'Latte',
  priceCents: 550,
  qty: 1,
  modifiers: [],
  ...over,
});

test('a retired summer line is dropped, never remapped or charged', () => {
  const summer = rawLine({ itemId: 'blueberry-latte', name: 'Blueberry Latte', priceCents: 650 });
  assert.equal(reconcileCartLine(summer), null);
  assert.ok(!lineIsCurrent(summer));
});

test('a valid regular line survives and is re-priced from canonical data', () => {
  const oatLatte = rawLine({
    itemId: 'latte',
    priceCents: 999, // stale/tampered stored price
    modifiers: [{ groupId: 'milk', label: 'Milk', value: 'Oat', priceCents: 999 }],
  });
  const fixed = reconcileCartLine(oatLatte);
  assert.ok(fixed);
  assert.equal(fixed.itemId, 'latte');
  assert.equal(fixed.priceCents, 650); // 550 + canonical oat 100... 550+100 = 650
  assert.equal(fixed.modifiers[0].priceCents, 100);
  assert.ok(!lineIsCurrent(oatLatte)); // stored price disagreed → not "current"
});

test('a fall latte line reconciles to its canonical price', () => {
  const pumpkin = rawLine({
    itemId: 'fall-pumpkin-spice',
    name: 'Pumpkin Spice',
    priceCents: 650,
    modifiers: [],
  });
  const fixed = reconcileCartLine(pumpkin);
  assert.ok(fixed);
  assert.equal(fixed.priceCents, 650);
  assert.ok(lineIsCurrent(pumpkin));
});

test('a modifier that no longer resolves drops the whole line', () => {
  const bogus = rawLine({
    modifiers: [{ groupId: 'milk', label: 'Milk', value: 'Unicorn', priceCents: 0 }],
  });
  assert.equal(reconcileCartLine(bogus), null);
});

test('a mixed cart keeps the regular line and drops the summer one', () => {
  const mixed = [
    rawLine({ itemId: 'blueberry-latte', name: 'Blueberry Latte', priceCents: 650 }),
    rawLine({ itemId: 'latte', priceCents: 550, qty: 2 }),
  ];
  const out = reconcileCart(mixed);
  assert.equal(out.length, 1);
  assert.equal(out[0].itemId, 'latte');
  assert.equal(out[0].qty, 2);
  assert.equal(out[0].priceCents, 550);
});

test('reconcileCart merges lines that collapse to the same key', () => {
  const out = reconcileCart([
    rawLine({ itemId: 'latte', priceCents: 550, qty: 1 }),
    rawLine({ itemId: 'latte', priceCents: 550, qty: 3 }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].qty, 4);
});
