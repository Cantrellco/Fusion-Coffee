import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import PageHero from '@/components/PageHero';
import { CornerBotanical, Sprig } from '@/components/Botanical';
import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import { ArrowUpRight } from '@/components/icons';
import { site, merch, type MerchItem, type MerchGroup } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Take Fusion Coffee home — branded hoodies, crews and tees, stickers, the storefront can glass, whole-bean coffee and loose-leaf tea. Shop in store on Main Street or online.',
  alternates: { canonical: '/merch/' },
};

/* A single product — the whole card links out to its live listing, where
   sizes, colors and current pricing live (checkout is handled by Square). */
function ProductCard({ item, i }: { item: MerchItem; i: number }) {
  return (
    <Reveal as="div" delay={(i % 3) * 0.07} y={28} className="h-full">
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-full flex-col transition-transform duration-200 ease-out-expo focus-visible:outline-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 md:active:scale-100"
      >
        <div className="overflow-hidden border border-ink/10 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.alt}
            loading="lazy"
            className="aspect-square w-full object-contain p-3 transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
          />
        </div>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            {item.brand && (
              <p className="eyebrow text-[0.7rem] text-brick-deep md:text-[0.62rem]">{item.brand}</p>
            )}
            <h3 className="mt-1 font-display text-xl leading-tight text-ink">
              {item.name}
            </h3>
            <p className="mt-1.5 max-w-xs text-pretty text-sm leading-relaxed text-ink-muted">
              {item.blurb}
            </p>
          </div>
          {/* Visible at rest on touch (only cue the card opens the Square shop);
              hover-reveal choreography restored untouched from md: up. */}
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 translate-x-0 text-brick opacity-100 transition-all duration-300 ease-out-expo md:-translate-x-1 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100" />
        </div>
      </a>
    </Reveal>
  );
}

function MerchSection({
  group,
  i,
  children,
}: {
  group: MerchGroup;
  i: number;
  children?: ReactNode;
}) {
  const dark = i % 2 === 1;
  return (
    <section
      className={`relative overflow-hidden py-14 md:py-28 ${
        dark ? 'bg-cream-deep' : 'bg-cream'
      }`}
    >
      <CornerBotanical
        position={i % 2 === 0 ? 'tr' : 'bl'}
        tone="text-sage/[0.13]"
        size="h-52 w-52"
      />
      <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <h2 className="eyebrow flex items-center gap-3 text-brick">
              <Sprig className="h-4 w-4 shrink-0 text-sage" />
              <span className="text-ink/40">{group.index}</span>
              <span className="h-px w-8 bg-ink/25" />
              {group.heading}
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="max-w-md text-pretty leading-relaxed text-ink-muted md:text-right">
              {group.blurb}
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 sm:gap-y-10 lg:grid-cols-3">
          {group.items.map((item, idx) => (
            <ProductCard key={item.name} item={item} i={idx} />
          ))}
        </div>

        {children}
      </div>
    </section>
  );
}

export default function MerchPage() {
  return (
    <>
      <PageHero
        eyebrow="Shop"
        title="Take the shop home."
        intro="Branded apparel and stickers, the can glass to drink from, whole-bean coffee and loose-leaf tea — pulled together in the same warm palette as the room."
      />

      {/* How it works — sets the expectation that cards open the live shop */}
      <section className="bg-cream pb-4 pt-10">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <p className="max-w-2xl text-pretty leading-relaxed text-ink-muted">
              Everything here is in the shop and online. Tap any piece to see
              sizes, colors and today&rsquo;s price on our store — checkout is
              handled securely through Square, for pickup on Main Street or
              shipped to your door.
            </p>
          </Reveal>
        </div>
      </section>

      {merch.groups.map((group, i) => (
        <MerchSection key={group.heading} group={group} i={i}>
          {/* Roaster note rides along under the coffee grid */}
          {group.heading === 'Coffee, by the bag' && (
            <Reveal delay={0.1}>
              <p className="mt-10 border-t border-ink/12 pt-6 text-pretty text-sm leading-relaxed text-ink-muted">
                <span className="font-display text-base italic text-ink">
                  The roaster lineup rotates with the season
                </span>{' '}
                — recent bags have come from {merch.roasters.join(', ')}.
              </p>
            </Reveal>
          )}
        </MerchSection>
      ))}

      {/* Gift cards + shop-all CTA */}
      <section className="espresso-wash wash-br relative overflow-hidden bg-espresso py-16 text-cream md:py-32">
        <CornerBotanical position="br" tone="text-oak/[0.09]" size="h-60 w-60" />
        <div className="relative z-10 mx-auto grid max-w-edge gap-12 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-3 text-oak">
                <Sprig className="h-4 w-4 shrink-0 text-sage" />
                <span className="h-px w-8 bg-oak/35" />
                Can&rsquo;t decide
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.05] text-cream">
                Give a little Fusion.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-md text-pretty leading-relaxed text-cream/65">
                A gift card is good for everything on this page and every drink
                on the board — and it never goes stale. Spend it in store or
                online.
              </p>
            </Reveal>
          </div>

          <div className="flex flex-col justify-center gap-6 md:col-span-5 md:items-start">
            <Reveal delay={0.1}>
              {/* Stacked full-width on mobile (thumb-sized targets, no ragged
                  wrap); original inline row restored from md: up. */}
              <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-4">
                <Button
                  href={merch.shopUrl}
                  external
                  variant="cream"
                  className="w-full md:w-auto"
                >
                  Shop everything
                </Button>
                <Button
                  href={merch.giftCardUrl}
                  external
                  variant="ghost-light"
                  className="w-full md:w-auto"
                >
                  Buy a gift card
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="max-w-sm text-sm leading-relaxed text-cream/55">
                Prefer to browse in person? Find the rack at{' '}
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
