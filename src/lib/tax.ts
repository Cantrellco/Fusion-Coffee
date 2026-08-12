// ============================================================
// Sales tax.
//
// Until this existed the site charged NO sales tax at all. Both /order and
// /merch handed Square line items with no `taxes` on the order, and Square
// obliged: a $5.50 latte was charged $5.50. The register on Main Street was
// charging 8% the whole time, so the website was quietly under-collecting on
// every online sale.
//
// The fix is not a number in this file. The shop already has a real tax in its
// Square catalog — "Sales Tax", 8%, ADDITIVE, enabled — and that is the one the
// register applies. This module points the website at THAT object by id:
//
//   • Square's tax reports roll online and in-person sales into one "Sales Tax"
//     line, so the books reconcile instead of showing two similar taxes.
//   • When the rate changes, the shop edits it once in the Square Dashboard and
//     the website follows on the next order. No deploy, no second place to
//     forget.
//   • Referencing the same object id twice cannot stack: if the tax is ever set
//     to auto-apply in the catalog, Square still applies it once.
//
// ── WHY THE ORDERS API NEEDS THIS AT ALL ────────────────────────────────────
// Every catalog item at this shop already lists the Sales Tax in its `tax_ids`.
// That is a Square POS concept and the Orders API does NOT act on it — verified
// against the live account: a `catalog_object_id` line and an ad-hoc
// `base_price_money` line both come back with `total_tax_money: 0` unless the
// order itself declares `taxes`. So the tax must be declared per order, here.
//
// (This is doubly true for the café, whose lines are ALL ad-hoc — every
// orderMenu item carries `squareCatalogObjectId: null`, and a line with a paid
// modifier stays ad-hoc by design. Nothing about catalog tax rules would have
// reached them.)
//
// ── SCOPE: LINE_ITEM, NOT ORDER ─────────────────────────────────────────────
// An ORDER-scoped tax is one line of JSON and taxes everything. This uses
// LINE_ITEM scope instead so a line can opt OUT — which the gift card must.
// Every taxable line carries `applied_taxes`; an exempt one simply omits it.
// An order where NOTHING is taxable (a lone gift card) is fine: the declared
// tax goes unreferenced and Square returns tax 0.
//
// ── WHAT IS NOT TAXED, AND WHY ──────────────────────────────────────────────
//   Gift cards — a gift card is not a taxable sale; it is a payment instrument.
//                Tax is due when it is REDEEMED, and this shop redeems it on
//                the register, which charges tax then. Taxing it here would
//                charge the same 8% twice for one cup of coffee and would
//                over-remit. Flagged per product by `taxExempt` in site.ts.
//   Tips       — already a TOTAL_PHASE service charge in checkout.ts, which
//                Square adds AFTER tax. A tip is a gratuity, not a sale.
//   Shipping   — also TOTAL_PHASE, so postage is not itself taxed. See the note
//                at that service charge in checkout.ts if the shop's accountant
//                wants Illinois shipping treated as part of the sale instead.
// ============================================================

/**
 * The shop's own "Sales Tax" object in its production Square catalog — 8%,
 * ADDITIVE, enabled, applied by the register to every food & beverage item.
 *
 * Hardcoded rather than read from an env var on purpose. A missing environment
 * variable would fail OPEN — the order would sail through untaxed and nothing
 * would look wrong until the quarter's filing. A wrong id fails CLOSED instead:
 * Square rejects the order, checkout returns `order_failed`, and it is obvious
 * in the first minute rather than the third month.
 *
 * This id lives in the PRODUCTION catalog. Local dev pointed at the sandbox
 * (.dev.vars) has no such object, so checkout there will fail with
 * `order_failed` until a sandbox tax is created and its id swapped in — which
 * is the fail-closed behaviour working, not a bug.
 */
export const SALES_TAX_CATALOG_OBJECT_ID = 'RFQAH2BUV3435YWOGFRDQH4G';

/** Ties the order-level tax to the `applied_taxes` on each taxable line. */
export const SALES_TAX_UID = 'sales-tax';

/**
 * The rate, for COPY ONLY — never for arithmetic. Square computes every cent
 * that is actually charged; this is what the page is allowed to say out loud
 * while it waits for the quote. If the shop changes the rate in the Dashboard
 * this string is the one thing that does not follow, so keep it vague enough to
 * stay true, or update it with the Dashboard.
 */
export const SALES_TAX_LABEL = '8%';

/**
 * The `taxes` array for a Square CreateOrder / CalculateOrder request.
 *
 * Spread into the order body: `...salesTax()`. Present on every order, café and
 * merch alike, so the two endpoints cannot drift apart on whether tax exists.
 */
export function salesTax(): {
  taxes: { uid: string; catalog_object_id: string; scope: 'LINE_ITEM' }[];
} {
  return {
    taxes: [
      {
        uid: SALES_TAX_UID,
        catalog_object_id: SALES_TAX_CATALOG_OBJECT_ID,
        scope: 'LINE_ITEM',
      },
    ],
  };
}

/**
 * The `applied_taxes` fragment for ONE line item, spread into the line:
 * `{ ...taxableLine(true) }`. Exempt lines get nothing, which is what makes
 * them exempt.
 */
export function taxableLine(taxable: boolean): {
  applied_taxes?: { tax_uid: string }[];
} {
  return taxable ? { applied_taxes: [{ tax_uid: SALES_TAX_UID }] } : {};
}
