import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import { CornerBotanical, Sprig } from '@/components/Botanical';
import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import ShopExperience from '@/components/merch/ShopExperience';
import { site, merch } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Take Fusion Coffee home — branded hoodies, crews and tees, stickers and totes, whole-bean coffee and loose-leaf tea. Buy online for delivery, or pick up on Main Street.',
  alternates: { canonical: '/merch/' },
};

// The grid, the bag and checkout all live in ShopExperience (a client
// component) because they are interactive. Everything static — the hero, the
// how-it-works note, the roaster roll-call, the closing block — stays here and
// renders straight into the static export.
export default function MerchPage() {
  return (
    <>
      <PageHero
        eyebrow="Shop"
        title="Take the shop home."
        intro="Branded apparel, stickers and totes, whole-bean coffee and loose-leaf tea — pulled together in the same warm palette as the room."
      />

      {/* How it works — this page used to send every card off to a separate
          Square storefront; it doesn't any more, and the copy says so. */}
      <section className="bg-cream pb-4 pt-10">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <p className="max-w-2xl text-pretty leading-relaxed text-ink-muted">
              Add what you want to the bag and check out right here — no second
              site, no second account. Shipping is free anywhere in the US, or
              collect it in store and skip the wait. Cards are handled securely
              by Square. Prefer to try a hoodie on first? Everything is on the
              rack at {site.address.street}.
            </p>
          </Reveal>
        </div>
      </section>

      <ShopExperience />

      {/* Roaster roll-call — the bean grid's footnote, kept out of the client
          component so it stays in the static HTML. */}
      <section className="bg-cream pb-2">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <p className="border-t border-ink/12 pt-6 text-pretty text-sm leading-relaxed text-ink-muted">
              <span className="font-display text-base italic text-ink">
                The roaster lineup rotates with the season
              </span>{' '}
              — recent bags have come from {merch.roasters.join(', ')}.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Closing block — visiting in person. The old "Shop everything" and "Buy
          a gift card" buttons pointed at the Square-hosted store on this very
          domain; both are now products in the grid above, so the only CTA left
          is the one that can't be done online. */}
      <section className="espresso-wash wash-br relative overflow-hidden bg-espresso py-16 text-cream md:py-32">
        <CornerBotanical position="br" tone="text-oak/[0.09]" size="h-60 w-60" />
        <div className="relative z-10 mx-auto grid max-w-edge gap-12 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-3 text-oak">
                <Sprig className="h-4 w-4 shrink-0 text-sage" />
                <span className="h-px w-8 bg-oak/35" />
                Or come see it
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.05] text-cream">
                The rack is on Main Street.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-md text-pretty leading-relaxed text-cream/65">
                Sizes run true, but a hoodie is a hoodie — try it on, feel the
                weight, smell the beans. Everything sold here is on the shelf in
                store, and a drink comes with it.
              </p>
            </Reveal>
          </div>

          <div className="flex flex-col justify-center gap-6 md:col-span-5 md:items-start">
            <Reveal delay={0.1}>
              <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-4">
                <Button href={site.orderPath} variant="cream" className="w-full md:w-auto">
                  Order a drink
                </Button>
                <Button
                  href="/contact/"
                  variant="ghost-light"
                  className="w-full md:w-auto"
                >
                  Find us
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="max-w-sm text-sm leading-relaxed text-cream/55">
                <span className="text-cream/80">{site.address.street}</span>,{' '}
                {site.address.city} — {site.hoursSummary}.
              </p>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
