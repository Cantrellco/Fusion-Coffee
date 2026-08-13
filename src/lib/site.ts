// ============================================================
// Fusion Coffee — single source of truth for site content.
// Real shop details carried over from the original site.
// ============================================================

// Hours live in their own module (src/lib/hours.ts) because the Cloudflare
// checkout function imports them too — it refuses orders while the shop is
// closed. Re-exported below so the rest of the site keeps importing everything
// from '@/lib/site' as before.
import { TIMEZONE, hours, to24h } from './hours';

// Base URL of the OLD Square-hosted store. Only one thing still derives from
// it — `site.orderUrl`, the unused link-out fallback below. Ordering (/order)
// and merch (/merch) are both bought on this site now, so no customer-facing
// link points here any more.
//
// ⚠️ CUTOVER: today that Square store lives on www.fusioncoffeeshop.com — the
// SAME host this site takes over. They cannot coexist. Anything still pointing
// here 404s the moment DNS flips, which is exactly why the merch grid stopped
// deep-linking to it. If the fallback is ever needed, repoint this at the
// store's post-cutover subdomain (branded `order.fusioncoffeeshop.com` on a
// paid Square plan, or the free `<something>.square.site`).
//
// Do NOT confuse this with SITE_URL (bottom of file) — that is THIS site's own
// domain (canonical, JSON-LD, OG) and stays https://www.fusioncoffeeshop.com.
const SQUARE_STORE = 'https://www.fusioncoffeeshop.com';

export const site = {
  name: 'Fusion Coffee',
  legalName: 'Fusion Coffee LLC',
  tagline: 'Skip the line.',
  shortPitch: 'A curated coffee experience in the heart of downtown Fairfield.',
  city: 'Fairfield, Illinois',
  // The shop opened in 2022 (ESTD 2022 on the merch). Used in the hero eyebrow
  // and the LocalBusiness structured data.
  established: 2022,
  // Coffee + light bites — the $$ band Google expects on the local panel.
  priceRange: '$$',
  // IANA zone — every "open now" calculation is done in the shop's own time,
  // never the visitor's browser locale.
  timezone: TIMEZONE,

  address: {
    street: '207 East Main Street',
    city: 'Fairfield',
    state: 'IL',
    zip: '62837',
    full: '207 East Main Street, Fairfield, IL 62837',
  },

  geo: { lat: 38.37978, lng: -88.35849 },

  email: 'fusioncoffeellc@gmail.com',
  // Verified against the shop's live Google/Yelp listings (June 2026).
  phone: '(618) 599-1678' as string | null,
  phoneHref: 'tel:+16185991678',

  // Mon–Fri 6:00 AM – 6:00 PM, Sat 6:00 AM – 4:00 PM, Sunday closed.
  // The table itself is in ./hours — edit it there and the pill, this list,
  // the JSON-LD and the checkout gate all move together.
  hours,
  hoursSummary: 'Mon–Fri 6am–6pm · Sat 6am–4pm',

  social: {
    instagram: { handle: '@fusioncoffee_', url: 'https://www.instagram.com/fusioncoffee_/' },
    facebook: { handle: 'fusioncoffee2022', url: 'https://www.facebook.com/fusioncoffee2022' },
    email: 'fusioncoffeellc@gmail.com',
  },

  // Internal on-site ordering — every "Order" CTA routes here to /order, the
  // custom cart + checkout built on this site (Square runs invisibly behind it
  // via a serverless function). This is the single value the CTAs point at.
  orderPath: '/order/',

  // The Square-hosted ordering page (kept as a fallback / for the link-out
  // approach). Derived from SQUARE_STORE (top of file) so cutover is a single
  // edit. No longer wired to the CTAs now that /order handles ordering on-site.
  orderUrl: `${SQUARE_STORE}/s/order`,

  // Owned-channel signup. Paste the shop's Square Marketing (or Mailchimp)
  // hosted form action here to POST subscribers straight in; while it's empty
  // the inline form gracefully falls back to a pre-filled email to the shop.
  newsletterAction: '' as string,

  // Private party booking requests. Paste a hosted form endpoint (Square,
  // Formspree, etc.) to POST requests straight in; while it's empty the /party
  // form gracefully falls back to a pre-filled email to the shop, so the
  // control always works on the static export.
  bookingAction: '' as string,

  // Verbatim brand story from the original site.
  about:
    'Fusion Coffee provides a curated coffee experience in the heart of Downtown Fairfield, Illinois. Our process fuses our expansive knowledge of coffee and fine ingredients to create one of a kind products in a modern, welcoming space. At Fusion Coffee, we hope you will find more than just a coffee shop, but a space to be connected to friends, family and community.',
};

// "Order" is intentionally not a nav item — the always-visible "Order now"
// button (header + hero) routes straight to the live ordering experience.
export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Menu', href: '/menu/' },
  { label: 'About', href: '/about/' },
  { label: 'Shop', href: '/merch/' },
  { label: 'Parties', href: '/party/' },
  { label: 'Contact', href: '/contact/' },
];

// The wood-dowel board mounted on the shop wall — names only, just like in store.
export const drinkBoard = [
  'Drip',
  'Pour Over',
  'Espresso',
  'Cortado',
  'Cappuccino',
  'Latte',
  'Americano',
  'Cold Brew',
  'Matcha',
  'Tea',
];

// ============================================================
// Private party bookings — reserve the shop for a group outside
// regular service. The windows below are the single source of
// truth for the /party page and the booking request form. Bookings
// are by request (the shop confirms details), not instant: the
// form emails the shop until a hosted endpoint (site.bookingAction)
// is wired in. Intentionally free of invented policy (no minimums,
// deposits or pricing) — those are settled in the follow-up.
// ============================================================
export type BookingSlot = { day: string; short: string; start: string; end: string };

export const partyBooking: {
  eyebrow: string;
  title: string;
  intro: string;
  slots: BookingSlot[];
  includes: { title: string; body: string }[];
} = {
  eyebrow: 'Private bookings',
  title: 'Book the shop for your party.',
  intro:
    'Birthdays, showers, team mornings and small celebrations — reserve a window and we’ll open the space just for your group, with drinks and bites made to order.',
  // Hosted windows: Saturday evening (after regular service) and two Sunday
  // blocks (the shop is otherwise closed Sundays).
  //
  // These mirror SLOTS_BY_DOW in lib/party.ts, which is what the calendar
  // actually sells from — kept in step so nothing here can advertise a window
  // the booking engine won't offer. Change both together.
  slots: [
    { day: 'Saturday', short: 'Sat', start: '4:30 PM', end: '6:30 PM' },
    { day: 'Sunday', short: 'Sun', start: '1:00 PM', end: '3:00 PM' },
    { day: 'Sunday', short: 'Sun', start: '4:00 PM', end: '6:00 PM' },
  ],
  includes: [
    {
      title: 'The whole space',
      body: 'The café is yours for the window — exposed brick, trailing greenery and the glow of the neon, set for your group.',
    },
    {
      title: 'Made to order',
      body: 'A full bar of espresso, matcha and seasonal drinks, plus bowls and bites, prepared fresh for everyone through your booking.',
    },
    {
      title: 'Simple to plan',
      body: 'Send the date, headcount and the occasion. We’ll follow up to confirm the details and take care of the rest.',
    },
  ],
};

// ============================================================
// Summer Menu — seasonal, limited-time. Featured on the home
// page directly under the hero and at the top of /menu.
// Source photo: /Fusion Images/menu-summer.jpeg.
//
// PRICES: the shop's seasonal board carries no printed prices, so
// /menu and the home page deliberately show names + descriptions
// only — unchanged. The `price` below exists purely so /order can
// put these in a cart, and it is the ONE place to correct them.
//
// CONFIRMED BY THE SHOP 2026-08-03 — these are the real seasonal
// prices, no longer derived from regular-menu analogs. They run
// $1.00 over the comparable regular drink ($6.50 vs the $5.50 latte,
// $5.00 vs the $4.00 lemonade), which is why the earlier guesses read
// low. Square catalog sync will eventually own these.
// ============================================================
export type SummerItem = { name: string; blurb: string; price: string };
export type SummerGroup = { heading: string; items: SummerItem[] };

export const summerMenu: {
  eyebrow: string;
  title: string;
  intro: string;
  groups: SummerGroup[];
} = {
  eyebrow: 'Limited time',
  title: 'The Summer Menu is on.',
  intro:
    'Seasonal lattes, fresh-squeezed lemonades and a couple of sweet bites — here while the sun is.',
  groups: [
    {
      heading: 'Drinks',
      items: [
        {
          name: 'Blueberry Latte',
          price: '$6.50',
          blurb:
            'House-made blueberry syrup + milk of choice, topped with espresso or matcha.',
        },
        {
          name: 'Banana Pudding Latte',
          price: '$6.50',
          blurb:
            'House-made banana syrup + milk of choice + espresso, finished with banana cold foam and wafer crumble.',
        },
        {
          name: 'Root Beer Float Flash Brew',
          price: '$6.50',
          blurb:
            'House-made root beer reduction + flash brew, topped with a vanilla cream float.',
        },
        {
          name: 'Cereal Milk Latte',
          price: '$6.00',
          blurb: 'Fruity Pebbles–infused oat milk + espresso.',
        },
        {
          name: 'Piña Colada Lemonade',
          price: '$5.00',
          blurb:
            'Fresh-squeezed lemonade mixed with a house-made coconut pineapple syrup.',
        },
        {
          name: 'Dragon Fruit Lemonade',
          price: '$5.00',
          blurb:
            'Fresh-squeezed lemonade mixed with a house-made dragon fruit coconut syrup.',
        },
      ],
    },
    {
      heading: 'Food',
      items: [
        {
          name: 'Peach Cobbler Yogurt Bowl',
          price: '$7.50',
          blurb:
            'Honey Greek yogurt + house-made brown sugar cinnamon peaches + house-made streusel topping.',
        },
        {
          name: 'Summer Affogato',
          price: '$6.75',
          blurb:
            'Vanilla ice cream topped with “Feels Like Summer” blend espresso, roasted by Methodical Coffee.',
        },
      ],
    },
  ],
};

// ============================================================
// Regular menu — transcribed from the laminated in-shop menus.
// Source photos kept in /Fusion Images: menu-main-priced.jpeg
// (coffee, non-coffee, tea, flavors, eats, sandwiches, breakfast)
// and menu-breakfast-sandwiches.jpeg (sandwich descriptions).
// Verified against those photos. Flavors are add-ons (no
// individual price). Breakfast sandwiches are served 6–11am.
// ============================================================
export type PricedItem = { name: string; price: string };
export type BreakfastSandwich = { name: string; price: string; description: string };
export type MenuGroup = { heading: string; items: PricedItem[] };

export const regularMenu: {
  drinks: MenuGroup[];
  flavors: string[];
  breakfastSandwiches: { note: string; items: BreakfastSandwich[] };
  eats: PricedItem[];
  sandwiches: PricedItem[];
} = {
  drinks: [
    {
      heading: 'Coffee',
      items: [
        { name: 'Espresso', price: '$3.00' },
        { name: 'Single Origin', price: '$4.00' },
        { name: 'Cortado', price: '$4.50' },
        { name: 'Cappuccino', price: '$5.00' },
        { name: 'Latte', price: '$5.50' },
        { name: 'Cold Brew', price: '$5.50' },
        { name: 'Americano', price: '$4.00' },
        { name: 'Drip', price: '$4.00' },
        { name: 'Pour Over', price: '$5.50' },
      ],
    },
    {
      heading: 'Non-Coffee',
      items: [
        { name: 'Matcha', price: '$5.50' },
        { name: 'Chai', price: '$5.00' },
        { name: 'Blueberry Basil Lemonade', price: '$4.00' },
        { name: 'Strawberry Lemonade', price: '$4.00' },
        { name: 'Hot Chocolate', price: '$4.00' },
        { name: 'Milk', price: '$2.50' },
      ],
    },
    {
      heading: 'Tea',
      items: [
        { name: 'Jasmine Peach', price: '$4.50' },
        { name: 'Blend 333', price: '$4.50' },
        { name: 'English Breakfast', price: '$4.50' },
        { name: 'Earl Grey', price: '$4.50' },
        { name: 'King Crimson', price: '$4.50' },
      ],
    },
  ],

  // Add to any drink.
  flavors: ['Caramel', 'Cuban', 'Vanilla', 'Maple', 'Mocha', 'Brown Sugar (SF)', 'Honey Cinnamon'],

  breakfastSandwiches: {
    note: 'Served 6–11am',
    items: [
      {
        name: 'The Bee Sting',
        price: '$10.00',
        description:
          'Cheddar bagel, sriracha, cream cheese, bacon, egg, colby jack cheese, hot honey drizzle.',
      },
      {
        name: 'The Fresh Garden',
        price: '$10.00',
        description:
          'Cheddar bagel, herbed cream cheese, egg, smoked gouda, avocado, tomato, arugula.',
      },
      {
        name: 'The Classic',
        price: '$10.00',
        description: 'Cheddar bagel, bacon, egg, colby jack cheese.',
      },
    ],
  },

  eats: [
    { name: 'Açaí Bowl OG', price: '$10.50' },
    { name: 'Açaí Bowl Pro', price: '$10.50' },
    { name: 'Avocado Toast', price: '$9.00' },
    { name: 'Yogurt Bowl', price: '$7.50' },
  ],

  sandwiches: [
    { name: 'Chipotle Chicken', price: '$11.00' },
    { name: 'B.L.T.', price: '$11.00' },
    { name: 'Turkey Pesto', price: '$11.00' },
    { name: '3-Cheese Grilled Cheese', price: '$10.00' },
  ],
};

export type Signature = {
  name: string;
  blurb: string;
  image: string;
  alt: string;
  tag: string;
};

// Signature builds, described honestly from the shop's own photos (no prices —
// the live menu carries pricing).
export const signatures: Signature[] = [
  {
    name: 'Strawberry Matcha',
    tag: 'House favorite',
    blurb:
      'Whisked matcha poured over cold strawberry milk — a layered green-to-pink fade, finished with a fresh berry.',
    image: '/images/strawberry-matcha.jpg',
    alt: 'Layered strawberry matcha latte in a branded Fusion Coffee glass with a fresh strawberry on top.',
  },
  {
    name: 'Açaí Bowl',
    tag: 'All day',
    blurb:
      'Thick-blended açaí under granola, banana, strawberry, blueberry and toasted coconut. Built to order.',
    image: '/images/acai-bowls.jpg',
    alt: 'Two açaí bowls topped with granola, banana, strawberry and blueberry held up beneath the neon sign.',
  },
  {
    name: 'Iced Strawberry Latte',
    tag: 'Espresso',
    blurb:
      'Double shot pulled over milk and house strawberry, garnished with a fresh-cut berry. Bright and creamy.',
    image: '/images/drink-strawberry-latte.jpg',
    alt: 'Iced strawberry latte with a strawberry garnish on a wood slice against an exposed brick wall.',
  },
  {
    name: 'Cold Brew',
    tag: 'Slow steeped',
    blurb:
      'Steeped low and slow for a smooth, low-acid cup. Served black or sweet in our branded can glass.',
    image: '/images/cans-pair.jpg',
    alt: 'Two Fusion Coffee branded can glasses — a creamy latte and a dark cold brew — on an oak table.',
  },
  {
    name: 'Seasonal Latte',
    tag: 'Barista series',
    blurb:
      'Rotating espresso features with proper latte art and a seasonal garnish — toasted marshmallow to gingerbread.',
    image: '/images/latte-marshmallow-mums.jpg',
    alt: 'Hot latte with rosetta latte art topped with a toasted marshmallow, set against autumn mums.',
  },
  {
    name: 'Berry Refresher',
    tag: 'Iced & fruity',
    blurb:
      'A crisp, fruit-forward iced refresher for the back half of the day. Light, not sweet, all sparkle.',
    image: '/images/drink-red-brick.jpg',
    alt: 'Tall iced berry refresher on a wood slice in front of an exposed brick wall.',
  },
];

// ============================================================
// Merch — real, in-stock goods. Names, photos, copy and grouping are
// ours (the art direction here beats Square's listing photos); PRICES
// AND SIZES ARE NOT. Those come from the shop's live Square catalog,
// matched to these entries by name — see src/lib/catalog.ts.
//
// Nothing on this page links out any more. /merch used to deep-link
// every card to the Square-hosted store on www.fusioncoffeeshop.com —
// the same host this site takes over, so those links break at cutover
// and route customers to the old site until then. Merch is now bought
// on-site, through the same Square-backed checkout /order uses.
//
// `squareName` is the escape hatch for when the catalog spells an item
// differently from the way we want to show it. Leave it off and the
// display name is used for matching.
//
// Beans are guest roasters we pour and bag; tea is Kilogram Tea.
// ============================================================
export type MerchItem = {
  name: string;
  brand?: string;
  blurb: string;
  image: string;
  alt: string;
  /** Catalog item name, when it differs from the display name above. */
  squareName?: string;
  /**
   * True when this product CANNOT be posted and must be collected in store.
   * Only the gift card: it is activated on the register, so one dropped in a
   * envelope would arrive worthless. Defaults to false.
   */
  pickupOnly?: boolean;
  /**
   * True when this product must NOT be charged sales tax. Only the gift card:
   * selling one is not a taxable sale, it is loading a payment instrument, and
   * the tax falls due when it is spent — which happens on the register, where
   * it IS taxed. Charging 8% here as well would bill the same tax twice for one
   * cup of coffee and over-remit to the state. Defaults to false.
   *
   * src/lib/tax.ts is what acts on this; see its header for the whole rule.
   */
  taxExempt?: boolean;
  /**
   * Who ships it WHEN IT IS SHIPPED — 'printful' means print-on-demand, made
   * and posted by Printful straight to the customer. Defaults to 'shop'.
   *
   * Note the "when shipped" carefully: this is NOT a fixed property of the
   * product. Printful only ever drop-ships, so an item COLLECTED IN STORE is
   * always the shop's own job, pulled off the rack, no matter what this says.
   * `resolveFulfilledBy()` in src/lib/shop.ts is what applies that rule — do
   * not read this field directly to decide where an order goes.
   *
   * Confirmed by the shop 2026-08-04: ONLY the five apparel pieces are
   * Printful. Stickers, the tote, beans, tea and the gift card are all the
   * shop's own stock — do not assume "merch" means "print-on-demand".
   */
  shipsFrom?: 'printful' | 'shop';
};
export type MerchGroup = {
  heading: string;
  index: string;
  blurb: string;
  items: MerchItem[];
};

export const merch: {
  roasters: string[];
  groups: MerchGroup[];
} = {
  // Rotating roasters we feature and bag — all sold on the live shop. Includes
  // the two currently pictured (Onyx, Heart) so the roll-call and the grid agree.
  roasters: [
    'Onyx',
    'Heart',
    'Black & White',
    'Little Wolf',
    'Sweet Bloom',
    'Methodical',
  ],
  groups: [
    {
      heading: 'Apparel',
      index: '01',
      blurb: 'Hoodies, crews and tees in our warm, earthy palette — printed in small runs.',
      items: [
        {
          name: 'Fusion Staple Hoodie',
          blurb:
            'Our downtown storefront, drawn in brick-and-navy across the back. Soft, heavyweight, year-round.',
          image: '/images/merch/merch-fusion-staple-hoodie.webp',
          alt: 'Sand-colored Fusion Coffee pullover hoodie with a back print of the brick storefront and navy “Fusion Coffee” sign, ESTD 2022.',
          shipsFrom: 'printful',
        },
        {
          name: 'Support Your Local Hoodie',
          blurb:
            'A retro mascot and a message we stand by, in deep navy. Heavy blend, made to live in.',
          image: '/images/merch/merch-support-your-local-hoodie.webp',
          alt: 'Navy Fusion Coffee hoodie reading “Support Your Local Coffee Shop” around a retro smiling coffee-cup mascot, Fairfield, Illinois.',
          shipsFrom: 'printful',
        },
        {
          name: 'Fusion Coffee Crewneck',
          blurb: 'The name, five times over, on a soft olive crew. Quietly loud.',
          image: '/images/merch/merch-fusion-coffee-crewneck.jpg',
          alt: 'Olive-green crewneck sweatshirt with “Fusion Coffee” repeated five times, the center line in solid white.',
          shipsFrom: 'printful',
        },
        {
          name: 'Support Your Local Crewneck',
          blurb: 'The same retro mascot on a sage-green crew. Support starts at home.',
          image: '/images/merch/merch-support-your-local-crewneck.webp',
          alt: 'Sage-green crewneck reading “Support Your Local Coffee Shop” around a retro coffee-cup mascot, Fairfield, Illinois.',
          shipsFrom: 'printful',
        },
        {
          name: 'Fusion Golden Bear Tee',
          blurb: 'A little golden bear and a Fusion cup, on a soft, garment-dyed cotton tee.',
          image: '/images/merch/merch-fusion-golden-bear-tee.jpg',
          alt: 'Natural cotton tee with a cartoon teddy bear hugging a black Fusion Coffee to-go cup.',
          shipsFrom: 'printful',
        },
      ],
    },
    {
      heading: 'Stickers & carry',
      index: '02',
      blurb: 'Little things for your laptop and your weekend bag.',
      // No can glass here on purpose — the shop discontinued it (2026-08-04).
      // /images/merch/merch-glass.jpg is kept but unused; the glass still shows
      // up as the vessel in drink photography and the Cold Brew blurb, which is
      // about what we pour into on bar, not something for sale.
      items: [
        {
          name: 'The Storefront Sticker',
          blurb: 'The 207 East Main storefront, shrunk to laptop size.',
          image: '/images/merch/merch-fusion-staple-sticker.jpg',
          alt: 'Sticker of the Fusion Coffee brick storefront with the navy sign, ESTD 2022, 207 East Main Street, Fairfield, IL.',
          squareName: 'Fusion Staple Sticker',
        },
        {
          name: 'Support Your Local Badge',
          blurb: 'Our round “support your local” badge — flexing cup included.',
          image: '/images/merch/merch-support-your-local-sticker.jpg',
          alt: 'Round black-and-cream badge sticker reading “Support Your Local Coffee Shop” around a flexing coffee-cup mascot.',
          squareName: 'Support Your Local Sticker',
        },
        {
          name: 'Pour-Over Sticker',
          blurb: 'A hand-drawn pour-over, kettle and coffee branch. Slow mornings, illustrated.',
          image: '/images/merch/merch-sticker.jpg',
          alt: 'Hand-drawn sticker of a pour-over Chemex and gooseneck kettle with a coffee branch reading “Support Your Local Coffee Shop, Fusion Coffee.”',
          squareName: 'Sticker',
        },
        {
          name: 'Canvas Tote',
          blurb: 'Hand-made-goods canvas for beans, books and the farmers-market haul.',
          image: '/images/merch/merch-tote-bag.webp',
          alt: 'Natural canvas tote printed “Support Your Local Coffee Shop” over a coffee-cup mascot, Fusion Coffee, Fairfield, IL.',
          squareName: 'Tote Bag',
        },
      ],
    },
    {
      heading: 'Coffee, by the bag',
      index: '03',
      blurb: 'Whole-bean bags from the roasters we feature on bar — to brew the shop at home.',
      items: [
        {
          name: 'Southern Weather',
          brand: 'Onyx Coffee Lab',
          blurb: 'Milk chocolate, plum and candied walnuts. Juicy, with a twist of citrus oil.',
          image: '/images/merch/merch-onyx-southern-weather.jpg',
          alt: 'Onyx Coffee Lab “Southern Weather” bean box in charcoal with embossed botanical artwork.',
          squareName: 'Onyx Southern Weather',
        },
        {
          name: 'Tropical Weather',
          brand: 'Onyx Coffee Lab',
          blurb: 'Mixed berries, sweet tea, raw honey and plum. Bright and easy-drinking.',
          image: '/images/merch/merch-onyx-tropical-weather.jpg',
          alt: 'Onyx Coffee Lab “Tropical Weather” bean box in lavender with embossed botanical artwork.',
          squareName: 'Onyx Tropical Weather',
        },
        {
          name: 'Stereo Blend',
          brand: 'Heart Coffee Roasters',
          blurb: 'A seasonal blend — tasting notes shift with the harvest. Whole bean, 16 oz.',
          image: '/images/merch/merch-stereo-blend.jpg',
          alt: 'Silver foil bag of Heart Coffee Roasters “Stereo Blend” whole-bean coffee, 16 oz.',
        },
      ],
    },
    {
      heading: 'Tea, loose leaf',
      index: '04',
      blurb: 'Organic loose-leaf from Kilogram Tea — the same ones we steep on bar.',
      items: [
        {
          name: 'Organic Blend 333',
          brand: 'Kilogram Tea',
          blurb: 'A caffeine-free herbal tisane — peppermint, lavender and chamomile.',
          image: '/images/merch/merch-organic-blend-333-box.jpg',
          alt: 'Kilogram Tea “Organic Blend 333” loose-leaf herbal tisane in purple packaging.',
          squareName: 'Organic Blend 333 Box',
        },
        {
          name: 'Organic Earl Grey',
          brand: 'Kilogram Tea',
          blurb: 'Loose-leaf black tea — malty and balanced with the citrus of bergamot.',
          image: '/images/merch/merch-organic-earl-grey-box.jpg',
          alt: 'Kilogram Tea “Organic Earl Grey” loose-leaf black tea in red packaging.',
          squareName: 'Organic Earl Grey Box',
        },
        {
          name: 'Organic Jasmine Peach',
          brand: 'Kilogram Tea',
          blurb: 'Loose-leaf white tea with jasmine and ripe peach. Soft and floral.',
          image: '/images/merch/merch-organic-jasmine-peach.jpg',
          alt: 'Kilogram Tea “Organic Jasmine Peach” loose-leaf white tea in blue packaging.',
        },
      ],
    },
    {
      // Sold as an ordinary product, picked up at the counter: the customer
      // pays here, staff load the card on the register when they collect it.
      //
      // This is deliberate, not a shortcut. Square's eGift checkout CANNOT run
      // on a custom domain — it only lives on a *.square.site host — so the
      // only way to keep the whole purchase on fusioncoffeeshop.com is to sell
      // the physical card. Denominations come from the catalog like every other
      // price, so the shop controls which amounts are offered.
      heading: 'Gift cards',
      index: '05',
      blurb:
        'Good for everything on this page and every drink on the board. Pick it up at the counter and we’ll load it while you wait.',
      items: [
        {
          name: 'Fusion Gift Card',
          blurb:
            'Choose an amount — $10 to $100 — pay here, and collect the card at the shop. We activate it at the register.',
          image: '/images/merch/merch-gift-card.jpg',
          alt: 'Fusion Coffee gift card — charcoal logo panel beside a “a gift for you” card — propped on a saucer on the counter.',
          pickupOnly: true,
          // Not a taxable sale — the 8% lands when the card is SPENT at the
          // register. See MerchItem.taxExempt above.
          taxExempt: true,
        },
      ],
    },
  ],
};

// Photography library, named for intent.
export const photos = {
  // Greenery-enriched brick interior — the homepage hero.
  hero: '/images/hero-brick-greenery.jpg',
  heroAlt: '/images/hero-brick-greenery-alt.jpg',
  interior: '/images/interior-brick-tables.jpg',
  // The 207 East Main Street frontage — the lead image on /about. Regraded
  // from the shop's own midday photo to the site's warm, low-contrast palette.
  storefront: '/images/storefront.jpg',
  // The brick-wall room on /party, styled for a booking. The room, furniture
  // and shelving are the real space; the garland, string lights, balloons and
  // table settings were added in post to show what a party in it looks like.
  partySpace: '/images/party-space.jpg',
  // Two regulars under the neon, on /contact. Retouched only around them —
  // the sign's power cord taken off the wall and greenery added. The people
  // themselves are exactly as photographed and must stay that way.
  contactLounge: '/images/contact-lounge.jpg',
  loungeNeon: '/images/lounge-neon.jpg',
  barWindow: '/images/bar-window.jpg',
  barEspresso: '/images/bar-espresso-flowers.jpg',
  // Greener version of the wood-dowel menu wall, used on the home page.
  menuBoard: '/images/menu-board-greenery.jpg',
  menuBoardOriginal: '/images/menu-board-wall.jpg',
  merchRack: '/images/merch-rack.jpg',
  latteArt: '/images/latte-art-gingerbread.jpg',
  flight: '/images/drink-flight.jpg',
  cans: '/images/cans-pair.jpg',
  acai: '/images/acai-bowls.jpg',
  strawberryMatcha: '/images/strawberry-matcha.jpg',
};

export const logo = {
  // 300px WebP (20KB) — the PNG original was 540px/154KB for a logo that
  // renders at 58-150px.
  neon: '/logo/fusion-neon.webp',
  neonSquare: '/logo/fusion-neon-square.jpg',
};

// ============================================================
// Time helpers + "open now" logic — all of it now lives in ./hours
// (the checkout Worker imports that module too, so it must stay free
// of anything Next-specific). Re-exported here so existing callers
// keep importing from '@/lib/site'. All reasoning is in the shop's
// local time (site.timezone), never the visitor's.
// ============================================================
export { parseClock, to24h, openStatusFor, nowInShop, shopOpenStatus } from './hours';
export type { OpenStatus, DayHours } from './hours';

// ============================================================
// Structured data (JSON-LD) — a CafeOrCoffeeShop graph + its Menu,
// built from the single source of truth above so hours, address,
// geo and prices can never drift from what the page shows. Rendered
// once, statically, in the root layout.
// ============================================================
// THIS site's own canonical domain (used for JSON-LD @id, OG image, links).
// Stays https://www.fusioncoffeeshop.com through cutover — do NOT point it at a
// Square subdomain. Contrast with SQUARE_STORE (top of file), which moves.
const SITE_URL = 'https://www.fusioncoffeeshop.com';

function openingHoursSpecification() {
  return site.hours
    .filter((h) => h.open && h.close)
    .map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${h.day}`,
      opens: to24h(h.open as string),
      closes: to24h(h.close as string),
    }));
}

function menuJsonLd() {
  const priced = (items: { name: string; price: string }[]) =>
    items.map((it) => ({
      '@type': 'MenuItem',
      name: it.name,
      offers: {
        '@type': 'Offer',
        price: it.price.replace(/[^0-9.]/g, ''),
        priceCurrency: 'USD',
      },
    }));

  return {
    '@type': 'Menu',
    '@id': `${SITE_URL}/menu/#menu`,
    name: 'Fusion Coffee Menu',
    hasMenuSection: [
      ...regularMenu.drinks.map((g) => ({
        '@type': 'MenuSection',
        name: g.heading,
        hasMenuItem: priced(g.items),
      })),
      {
        '@type': 'MenuSection',
        name: 'Breakfast Sandwiches',
        description: regularMenu.breakfastSandwiches.note,
        hasMenuItem: regularMenu.breakfastSandwiches.items.map((it) => ({
          '@type': 'MenuItem',
          name: it.name,
          description: it.description,
          offers: { '@type': 'Offer', price: it.price.replace(/[^0-9.]/g, ''), priceCurrency: 'USD' },
        })),
      },
      { '@type': 'MenuSection', name: 'Eats', hasMenuItem: priced(regularMenu.eats) },
      { '@type': 'MenuSection', name: 'Sandwiches', hasMenuItem: priced(regularMenu.sandwiches) },
      {
        '@type': 'MenuSection',
        name: summerMenu.title,
        description: summerMenu.intro,
        // Deliberately NO `offers` here even though summerMenu now carries a
        // `price` for /order: structured data must match what the page shows,
        // and /menu displays the seasonal items without prices. Add offers here
        // only if/when the printed seasonal board starts listing prices too.
        hasMenuItem: summerMenu.groups.flatMap((g) =>
          g.items.map((it) => ({ '@type': 'MenuItem', name: it.name, description: it.blurb })),
        ),
      },
    ],
  };
}

export function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CafeOrCoffeeShop',
        '@id': `${SITE_URL}/#business`,
        name: site.name,
        legalName: site.legalName,
        description: site.shortPitch,
        url: `${SITE_URL}/`,
        image: `${SITE_URL}/og.jpg`,
        logo: `${SITE_URL}${logo.neon}`,
        telephone: site.phoneHref.replace('tel:', ''),
        email: site.email,
        priceRange: site.priceRange,
        servesCuisine: ['Coffee', 'Espresso', 'Breakfast', 'Café'],
        foundingDate: String(site.established),
        currenciesAccepted: 'USD',
        address: {
          '@type': 'PostalAddress',
          streetAddress: site.address.street,
          addressLocality: site.address.city,
          addressRegion: site.address.state,
          postalCode: site.address.zip,
          addressCountry: 'US',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: site.geo.lat,
          longitude: site.geo.lng,
        },
        hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${site.name} ${site.address.full}`,
        )}`,
        openingHoursSpecification: openingHoursSpecification(),
        sameAs: [site.social.instagram.url, site.social.facebook.url],
        hasMenu: `${SITE_URL}/menu/#menu`,
        acceptsReservations: false,
      },
      menuJsonLd(),
    ],
  };
}

// Shared Open Graph base. Next shallow-merges the `openGraph` metadata key,
// so a page that sets its own og title/description must respread these or
// silently lose og:image and siteName.
export const ogBase = {
  type: 'website' as const,
  siteName: 'Fusion Coffee',
  locale: 'en_US',
  images: [
    {
      url: '/og.jpg',
      width: 1200,
      height: 630,
      alt: 'Fusion Coffee — specialty coffee in downtown Fairfield, Illinois',
    },
  ],
};
