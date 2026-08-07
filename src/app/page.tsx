import Link from 'next/link';
import Button from '@/components/Button';
import Reveal from '@/components/Reveal';
import CoffeeOrbit from '@/components/CoffeeOrbit';
import SummerMenu from '@/components/SummerMenu';
import Marquee from '@/components/Marquee';
import OpenStatus from '@/components/OpenStatus';
import { ArrowRight, Clock, MapPin } from '@/components/icons';
import { CornerBotanical, LeafDivider, Sprig } from '@/components/Botanical';
import { site, photos } from '@/lib/site';

const mapsDirections = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  `${site.name}, ${site.address.full}`,
)}`;

const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(
  `${site.name}, ${site.address.full}`,
)}&z=16&output=embed`;

export default function HomePage() {
  return (
    <>
      {/* The hero image is this page's LCP; with output:'export' + unoptimized
          images nothing else prioritizes it, so hint it explicitly. React
          hoists this <link> into <head>. Lives here, not the root layout, so
          the other six pages stop force-downloading a 400KB image they never
          render. */}
      <link rel="preload" as="image" href={photos.hero} fetchPriority="high" />
      {/* ============================ HERO ============================ */}
      {/* min-h adds the top safe-area inset because in a home-screen install
          iOS resolves 100svh short by the status-bar height while the layout
          still starts at the physical screen top — without the inset the hero
          ends ~the status bar's height above the fold and the next section's
          cream peeks in behind the tab bar. env() is 0 in a browser tab and
          on desktop, so this is byte-identical everywhere else. */}
      <section className="relative flex min-h-[calc(100svh+env(safe-area-inset-top))] items-end overflow-hidden bg-espresso">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos.hero}
          alt="Inside Fusion Coffee — exposed brick wall and light oak tables framed by a leafy fern and trailing greenery, beneath a pressed-tin ceiling in warm afternoon light."
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full animate-hero-drift object-cover object-[18%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/60 to-espresso/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/80 to-transparent" />

        {/* <md, bottom padding clears the fixed tab bar (--tabbar-h + safe
            area) plus the raised centre Order disc, so the OpenStatus/address
            meta row is never occluded. Desktop padding unchanged at md:. */}
        <div className="relative mx-auto w-full max-w-edge px-5 pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.5rem)] pt-32 sm:px-8 md:pb-24">
          <Reveal>
            <p className="eyebrow text-oak">
              Specialty coffee · Est. {site.established}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-5xl text-balance font-display text-fluid-3xl font-medium leading-[0.92] tracking-[-0.02em] text-cream">
              Skip the line.
              <br />
              <span className="italic text-oak">Savor the space.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-8 max-w-md text-pretty text-lg leading-relaxed text-cream/80">
              Made-to-order coffee in a warm, greenery-filled room — built to
              linger in.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            {/* Phones: CTAs stack full-width (app-like tap targets); from
                sm: up the original inline wrap row is restored verbatim. */}
            <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button
                href={site.orderPath}
                variant="primary"
                className="w-full sm:w-auto"
              >
                Order now
              </Button>
              <Button
                href="/menu/"
                variant="ghost-light"
                arrow={false}
                className="w-full sm:w-auto"
              >
                Explore the menu
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.34}>
            <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-cream/15 pt-6 text-sm text-cream/70">
              <OpenStatus tone="light" />
              <span className="hidden h-4 w-px bg-cream/20 sm:block" />
              <span>{site.address.street}, {site.address.city}</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ SUMMER MENU ============================ */}
      {/* The seasonal menu, promoted to the lead section under the hero, with
          one clear route to the full menu below it. Shared with /menu. */}
      <SummerMenu withCta />

      {/* ===================== COFFEE ORBIT (scroll-scrub) ===================== */}
      {/* The one immersive "delight" beat — the can up close. */}
      <CoffeeOrbit />

      {/* ===================== OUR STORY ===================== */}
      {/* Who we are + the room, in one section. */}
      <section className="grain-soft relative overflow-hidden bg-cream-deep py-16 md:py-32">
        <CornerBotanical position="br" size="h-52 w-52" />
        <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
          <div className="grid items-end gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <Reveal>
                <p className="eyebrow flex items-center gap-3 text-brick">
                  <Sprig className="h-4 w-4 shrink-0 text-sage" />
                  <span className="h-px w-8 bg-ink/25" />
                  Our story
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-6 max-w-2xl text-balance font-display text-fluid-xl leading-[1.04] text-ink">
                  More than a coffee shop — a place to belong.
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.1} className="md:col-span-5">
              <p className="max-w-md text-pretty leading-relaxed text-ink/65 md:ml-auto">
                A curated coffee experience in the heart of downtown Fairfield —
                fine ingredients, made with intention, in a room of brick, oak
                and soft light that was built to linger in.
              </p>
              <Reveal delay={0.15}>
                <Link
                  href="/about/"
                  className="link-underline group mt-7 inline-flex items-center gap-2 font-display text-lg italic text-brick-deep"
                >
                  Read our story
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Reveal>
            </Reveal>
          </div>

          <LeafDivider className="mt-16" />

          <div className="mt-12 grid gap-4 md:grid-cols-12">
            <Reveal className="md:col-span-7" y={30}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos.barWindow}
                alt="The café bar beside tall storefront windows, with the menu board and espresso setup."
                className="aspect-[4/3] w-full object-cover"
              />
            </Reveal>
            <Reveal className="md:col-span-5 md:translate-y-10" y={30} delay={0.1}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos.menuBoard}
                alt="The wood-dowel drink board mounted on the exposed brick wall, framed by trailing greenery."
                className="aspect-[4/3] w-full object-cover"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== PULL UP A CHAIR (Find us + map) ===================== */}
      <section className="bg-cream py-16 md:py-32">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <Reveal>
                <p className="eyebrow flex items-center gap-3 text-brick">
                  <Sprig className="h-4 w-4 shrink-0 text-sage" />
                  <span className="h-px w-8 bg-ink/25" />
                  Find us
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.04] text-ink">
                  Pull up a chair in Fairfield.
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <p className="max-w-xs text-pretty leading-relaxed text-ink-muted md:text-right">
                Walk-ins always welcome — {site.hoursSummary}.
              </p>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-10 border-t border-ink/12 pt-12 md:grid-cols-2 md:items-center md:gap-16">
            {/* Address, hours, directions */}
            <Reveal>
              <div className="space-y-8">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brick" />
                  <div>
                    <p className="font-display text-lg leading-snug text-ink">
                      {site.address.street}
                    </p>
                    <p className="text-ink-muted">
                      {site.address.city}, {site.address.state} {site.address.zip}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brick" />
                  <div>
                    <p className="font-display text-lg leading-snug text-ink">
                      {site.hoursSummary}
                    </p>
                    <p className="text-ink-muted">Sunday closed</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <Button href={mapsDirections} external variant="primary">
                    Get directions
                  </Button>
                  <Button href="/contact/" variant="outline" arrow={false}>
                    Visit the shop
                  </Button>
                </div>
              </div>
            </Reveal>

            {/* Small map */}
            <Reveal y={30} delay={0.08}>
              <div className="overflow-hidden border border-ink/12">
                <iframe
                  title={`Map to ${site.name}`}
                  src={mapEmbed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="duotone-warm aspect-[4/3] w-full md:aspect-[5/4]"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== CLOSING BRAND RHYTHM ===================== */}
      <Marquee
        items={[
          'Made to order',
          'Built to linger in',
          'Downtown Fairfield, Illinois',
          'Skip the line',
        ]}
      />
    </>
  );
}
