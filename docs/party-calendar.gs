/**
 * Little Town + Fusion — one Google Calendar, three colours.
 * ---------------------------------------------------------------------------
 * Paste into Extensions → Apps Script on the bookings Sheet, set CONFIG below,
 * run `setup()` once, and every party lands on the calendar colour-coded:
 *
 *     Little Town only     BLUE
 *     Little Town + Fusion ORANGE   (the café is taken too)
 *     Fusion only          GREEN
 *
 * WHERE THE DATA COMES FROM
 *   Little Town  →  rows this Sheet receives from Shopify Flow
 *   Fusion       →  pulled live from fusioncoffeeshop.com/api/party-bookings
 *
 * Fusion is pulled rather than pushed on purpose: this script already runs as
 * the shop's own Google user, so CalendarApp works with no service account, no
 * key to store in Cloudflare, and nothing to rotate.
 *
 * SAFE TO RE-RUN. Every event carries a hidden tag like [ltp:ORDERID]; the
 * script looks for that tag before creating anything, so a booking can never
 * be added twice no matter how often the trigger fires or how many times you
 * run it by hand.
 */

const CONFIG = {
  // Leave blank to use the Google account's default calendar, or paste a
  // calendar ID (Calendar settings → Integrate calendar → Calendar ID).
  CALENDAR_ID: '',

  // Tab holding the Little Town rows Flow writes.
  SHEET_NAME: 'Bookings',

  // Fusion's private feed. The secret is set as PARTY_FEED_SECRET in
  // Cloudflare Pages → fusion-coffee → Settings → Environment variables.
  FUSION_FEED_URL: 'https://www.fusioncoffeeshop.com/api/party-bookings',
  FUSION_FEED_SECRET: 'PASTE_THE_SECRET_HERE',

  // Buyouts are two hours at both venues.
  DURATION_MINUTES: 120,

  // Don't touch anything already in the past — this only ever looks forward.
  SKIP_BEFORE_TODAY: true,
};

/** Colour per booking type. Names come from CalendarApp.EventColor. */
const COLOURS = {
  'little-town': CalendarApp.EventColor.BLUE,
  'little-town-fusion': CalendarApp.EventColor.ORANGE,
  fusion: CalendarApp.EventColor.GREEN,
};

// ===========================================================================
// Entry points
// ===========================================================================

/** Run once by hand: installs the timer. */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncBookings') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncBookings').timeBased().everyMinutes(15).create();
  syncBookings();
  Logger.log('Installed. Syncing every 15 minutes.');
}

/** What the trigger calls. Also safe to run manually any time. */
function syncBookings() {
  const cal = CONFIG.CALENDAR_ID
    ? CalendarApp.getCalendarById(CONFIG.CALENDAR_ID)
    : CalendarApp.getDefaultCalendar();
  if (!cal) throw new Error('Calendar not found — check CONFIG.CALENDAR_ID');

  let made = 0;
  made += syncLittleTown_(cal);
  made += syncFusion_(cal);
  Logger.log('Sync complete. ' + made + ' new event(s).');
}

// ===========================================================================
// Little Town — from the Sheet that Flow writes to
// ===========================================================================

function syncLittleTown_(cal) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    Logger.log('No tab named "' + CONFIG.SHEET_NAME + '" — skipping Little Town.');
    return 0;
  }

  const rows = sheet.getDataRange().getValues();
  let made = 0;

  // Row 0 is the header. Columns are documented in the README beside this file:
  // A date | B slot | C package | D customer | E order | F total
  for (let i = 1; i < rows.length; i++) {
    const [date, slot, pkg, customer, order] = rows[i];
    if (!date || !slot) continue;

    const dateKey = normaliseDate_(date);
    if (!dateKey) continue;

    // "+ Fusion" in the package name is what makes it the combo. Anything else
    // is a playhouse-only buyout.
    const isCombo = String(pkg || '').toLowerCase().indexOf('fusion') !== -1;
    const type = isCombo ? 'little-town-fusion' : 'little-town';
    const tag = 'ltp:' + (order || dateKey + '-' + slot);

    const start = parseSlotStart_(dateKey, String(slot));
    if (!start) continue;

    const title = (isCombo ? 'Little Town + Fusion' : 'Little Town') +
      ' — ' + (customer || 'Party');

    if (createIfNew_(cal, tag, title, start, type, [
      'Booking: ' + (isCombo ? 'Little Town + Fusion buyout' : 'Little Town buyout'),
      customer ? 'Name: ' + customer : '',
      order ? 'Order: ' + order : '',
      'Window: ' + slot,
    ])) made++;
  }
  return made;
}

// ===========================================================================
// Fusion — pulled from the site
// ===========================================================================

function syncFusion_(cal) {
  if (!CONFIG.FUSION_FEED_SECRET || CONFIG.FUSION_FEED_SECRET.indexOf('PASTE') === 0) {
    Logger.log('Fusion feed secret not set — skipping Fusion.');
    return 0;
  }

  const res = UrlFetchApp.fetch(CONFIG.FUSION_FEED_URL, {
    headers: { Authorization: 'Bearer ' + CONFIG.FUSION_FEED_SECRET },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    Logger.log('Fusion feed returned ' + res.getResponseCode() + ' — skipping.');
    return 0;
  }

  const bookings = (JSON.parse(res.getContentText()).bookings) || [];
  let made = 0;

  bookings.forEach(function (b) {
    // startsAt is an exact instant the Worker already converted from the
    // café's wall clock, so it needs no timezone handling here.
    const start = b.startsAt ? new Date(b.startsAt) : parseSlotStart_(b.date, b.slot);
    if (!start) return;

    if (createIfNew_(cal, 'ltp:' + b.orderId, 'Fusion — ' + (b.name || 'Party'), start, 'fusion', [
      'Booking: Fusion café buyout',
      b.name ? 'Name: ' + b.name : '',
      b.phone ? 'Phone: ' + b.phone : '',
      'Window: ' + b.slot,
      b.totalCents ? 'Paid: $' + (b.totalCents / 100).toFixed(2) : '',
    ])) made++;
  });
  return made;
}

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Create the event unless one carrying this tag already exists.
 *
 * The tag is written into the description because Apps Script has no reliable
 * way to search custom properties. Scanning a one-day window keeps it cheap.
 */
function createIfNew_(cal, tag, title, start, type, descLines) {
  if (CONFIG.SKIP_BEFORE_TODAY) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) return false;
  }

  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existing = cal.getEvents(dayStart, dayEnd);
  for (let i = 0; i < existing.length; i++) {
    if ((existing[i].getDescription() || '').indexOf('[' + tag + ']') !== -1) return false;
  }

  const end = new Date(start.getTime() + CONFIG.DURATION_MINUTES * 60000);
  const description = descLines.filter(String).join('\n') + '\n\n[' + tag + ']';
  const ev = cal.createEvent(title, start, end, { description: description });

  const colour = COLOURS[type];
  if (colour) ev.setColor(colour);
  return true;
}

/** Sheet dates arrive as a Date or a string; normalise to YYYY-MM-DD. */
function normaliseDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * "2026-09-20" + "1:00–3:00 PM" → a Date at the START of that window.
 *
 * Both venues write the slot with an EN-DASH. A hyphen is accepted too so a
 * hand-typed row still works. The meridiem is only stated once at the end of
 * the label, so it applies to the start time as well — "1:00–3:00 PM" starts at
 * 1pm, not 1am.
 */
function parseSlotStart_(dateKey, slot) {
  const m = /^(\d{1,2}):(\d{2})\s*[–-]\s*\d{1,2}:\d{2}\s*(AM|PM)$/i.exec(String(slot).trim());
  if (!m || !dateKey) return null;

  let hour = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') hour += 12;

  const parts = dateKey.split('-');
  return new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10),
    hour,
    parseInt(m[2], 10),
    0
  );
}
