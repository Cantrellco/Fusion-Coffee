// ============================================================
// Fusion Coffee — single source of truth for site content.
// Real shop details carried over from the original site.
// ============================================================

export const site = {
  name: 'Fusion Coffee',
  legalName: 'Fusion Coffee LLC',
  tagline: 'Skip the line.',
  shortPitch: 'A curated coffee experience in the heart of downtown Fairfield.',
  city: 'Fairfield, Illinois',

  address: {
    street: '207 East Main Street',
    city: 'Fairfield',
    state: 'IL',
    zip: '62837',
    full: '207 East Main Street, Fairfield, IL 62837',
  },

  geo: { lat: 38.37978, lng: -88.35849 },

  email: 'fusioncoffeellc@gmail.com',
  phone: null as string | null,

  // Mon–Sat 6:00 AM – 6:00 PM, Sunday closed (from the original site).
  hours: [
    { day: 'Monday', short: 'Mon', open: '6:00 AM', close: '6:00 PM' },
    { day: 'Tuesday', short: 'Tue', open: '6:00 AM', close: '6:00 PM' },
    { day: 'Wednesday', short: 'Wed', open: '6:00 AM', close: '6:00 PM' },
    { day: 'Thursday', short: 'Thu', open: '6:00 AM', close: '6:00 PM' },
    { day: 'Friday', short: 'Fri', open: '6:00 AM', close: '6:00 PM' },
    { day: 'Saturday', short: 'Sat', open: '6:00 AM', close: '6:00 PM' },
    { day: 'Sunday', short: 'Sun', open: null, close: null },
  ] as { day: string; short: string; open: string | null; close: string | null }[],
  hoursSummary: 'Mon–Sat · 6am – 6pm',

  social: {
    instagram: { handle: '@fusioncoffee_', url: 'https://www.instagram.com/fusioncoffee_/' },
    facebook: { handle: 'fusioncoffee2022', url: 'https://www.facebook.com/fusioncoffee2022' },
    email: 'fusioncoffeellc@gmail.com',
  },

  // NOTE: interim destination for "Order Now" — points at the existing Square
  // online ordering. Swap this single value when the full ordering experience
  // is wired up.
  orderUrl: 'https://www.fusioncoffeeshop.com/',

  // Verbatim brand story from the original site.
  about:
    'Fusion Coffee provides a curated coffee experience in the heart of Downtown Fairfield, Illinois. Our process fuses our expansive knowledge of coffee and fine ingredients to create one of a kind products in a modern, welcoming space. At Fusion Coffee, we hope you will find more than just a coffee shop, but a space to be connected to friends, family and community.',
};

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Menu', href: '/menu/' },
  { label: 'Order', href: '/order/' },
  { label: 'About', href: '/about/' },
  { label: 'Merch', href: '/merch/' },
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

// Photography library, named for intent.
export const photos = {
  interior: '/images/interior-brick-tables.jpg',
  loungeNeon: '/images/lounge-neon.jpg',
  barWindow: '/images/bar-window.jpg',
  barEspresso: '/images/bar-espresso-flowers.jpg',
  menuBoard: '/images/menu-board-wall.jpg',
  merchRack: '/images/merch-rack.jpg',
  latteArt: '/images/latte-art-gingerbread.jpg',
  flight: '/images/drink-flight.jpg',
  cans: '/images/cans-pair.jpg',
  acai: '/images/acai-bowls.jpg',
  strawberryMatcha: '/images/strawberry-matcha.jpg',
};

export const logo = {
  neon: '/logo/fusion-neon.png',
  neonSquare: '/logo/fusion-neon-square.jpg',
};
