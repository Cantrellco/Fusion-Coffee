import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import MenuChips from '@/components/MenuChips';
import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import SummerMenu from '@/components/SummerMenu';
import { CornerBotanical, Sprig } from '@/components/Botanical';
import { site, regularMenu, ogBase } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Menu',
  description:
    "The full Fusion Coffee menu — specialty espresso, non-coffee, tea, breakfast sandwiches, açaí bowls and eats, plus this season's Summer Menu. Fairfield, IL.",
  alternates: { canonical: '/menu/' },
  openGraph: {
    ...ogBase,
    url: '/menu/',
    title: 'Menu · Fusion Coffee',
    description:
      "The full Fusion Coffee menu — specialty espresso, non-coffee, tea, breakfast sandwiches, açaí bowls and eats, plus this season's Summer Menu.",
  },
};

// Name on the left, price on the right — the repeating row used across the menu.
function PriceList({ items }: { items: { name: string; price: string }[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.name}
          // Phones read this list at arm's length: taller rows + full-size
          // names/prices (desktop keeps its original py-3.5 / text-sm).
          className="price-row relative flex items-start justify-between gap-4 border-b border-ink/10 py-4 md:items-baseline md:py-3.5"
        >
          <span className="min-w-0 font-display text-2xl leading-tight text-ink">
            {item.name}
          </span>
          <span className="shrink-0 font-sans text-base tabular-nums text-ink/55 md:text-sm">
            {item.price}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function MenuPage() {
  const [coffee, ...otherDrinks] = regularMenu.drinks;

  return (
    <>
      <PageHero
        eyebrow="Menu"
        title="Everything we make."
        intro="Specialty espresso, non-coffee, tea, breakfast sandwiches and eats — plus this season's Summer Menu. Order online to skip the line."
      />

      {/* Mobile-only sticky category chips — the app-style jump nav for this
          ~4000px single scroll. Mounted once, right after the hero, so the
          strip sticks for the entire menu below it. md:hidden inside. */}
      <MenuChips />

      {/* ===================== SUMMER MENU (seasonal — top of the menu) ===================== */}
      {/* Shared with the home page; here without the "See the full menu" CTA. */}
      {/* Jump anchor for the chips — SummerMenu is shared with the home page,
          so the id lives on this zero-height div instead of inside it. The
          mobile scroll-mt clears the 4.5rem hide-on-scroll top bar (+ notch)
          in its worst case (visible after an upward scroll); md:scroll-mt-0
          keeps the id inert on desktop. */}
      <div
        id="summer"
        className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] md:scroll-mt-0"
      />
      <SummerMenu />

      {/* ===================== DRINKS — Coffee + Flavors, Non-Coffee, Tea ===================== */}
      <section
        id="drinks"
        className="grain-soft relative overflow-hidden scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] bg-cream py-14 md:scroll-mt-0 md:py-28"
      >
        <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <p className="eyebrow flex items-center gap-3 text-brick">
              <Sprig className="h-4 w-4 shrink-0 text-sage" />
              <span className="text-ink/40">01</span>
              <span className="h-px w-8 bg-ink/25" />
              Drinks
            </p>
          </Reveal>

          {/* Coffee + House-Made Flavors */}
          <div className="mt-10 grid gap-x-16 gap-y-12 md:grid-cols-12">
            <div className="md:col-span-7">
              <Reveal>
                <h2 className="font-display text-3xl text-ink">{coffee.heading}</h2>
              </Reveal>
              <Reveal delay={0.05} className="mt-6 block">
                <PriceList items={coffee.items} />
              </Reveal>
            </div>
            <div className="md:col-span-5">
              <Reveal delay={0.08} className="block h-full">
                <div className="espresso-wash wash-br relative flex h-full flex-col overflow-hidden bg-espresso p-8 text-cream">
                  <CornerBotanical
                    position="br"
                    motif="fern"
                    tone="text-sage/[0.16]"
                    size="h-64 w-64"
                  />
                  <div className="relative z-10 flex items-center gap-2.5">
                    <Sprig className="h-4 w-4 shrink-0 text-sage" />
                    <h3 className="font-display text-2xl text-cream">House-Made Flavors</h3>
                  </div>
                  <p className="relative z-10 mt-1.5 text-sm text-cream/55">
                    Add to any drink.
                  </p>
                  <ul className="relative z-10 mt-8 flex flex-1 flex-col">
                    {regularMenu.flavors.map((f) => (
                      <li
                        key={f}
                        className="flex flex-1 items-center border-b border-cream/15 font-display text-2xl leading-none text-cream/90 transition-colors duration-300 last:border-b-0 hover:text-terracotta"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Non-Coffee + Tea */}
          <div className="mt-16 grid gap-x-16 gap-y-12 md:grid-cols-2">
            {otherDrinks.map((group) => (
              <div key={group.heading}>
                <Reveal>
                  <h2 className="font-display text-3xl text-ink">{group.heading}</h2>
                </Reveal>
                <Reveal delay={0.05} className="mt-6 block">
                  <PriceList items={group.items} />
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== BREAKFAST SANDWICHES — below the drinks ===================== */}
      <section
        id="breakfast"
        className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] bg-cream-deep py-14 md:scroll-mt-0 md:py-28"
      >
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Reveal>
              <p className="eyebrow flex items-center gap-3 text-brick">
                <Sprig className="h-4 w-4 shrink-0 text-sage" />
                <span className="text-ink/40">02</span>
                <span className="h-px w-8 bg-ink/25" />
                Breakfast Sandwiches
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <span className="text-[0.78rem] uppercase tracking-mega text-ink/55 md:text-xs md:text-ink/45">
                {regularMenu.breakfastSandwiches.note}
              </span>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-3">
            {regularMenu.breakfastSandwiches.items.map((item, i) => (
              <Reveal as="figure" key={item.name} delay={i * 0.07} y={28}>
                <div className="flex items-baseline justify-between gap-4 border-t border-ink/15 pt-5">
                  <h3 className="font-display text-2xl text-ink">{item.name}</h3>
                  <span className="shrink-0 font-sans text-sm tabular-nums text-ink/55">
                    {item.price}
                  </span>
                </div>
                <figcaption className="mt-3 text-pretty leading-relaxed text-ink-muted">
                  {item.description}
                </figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== EATS + SANDWICHES ===================== */}
      <section
        id="eats"
        className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] bg-cream py-14 md:scroll-mt-0 md:py-28"
      >
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <div className="grid gap-x-16 gap-y-14 md:grid-cols-2">
            <div>
              <Reveal>
                <p className="eyebrow flex items-center gap-3 text-brick">
                  <Sprig className="h-4 w-4 shrink-0 text-sage" />
                  <span className="text-ink/40">03</span>
                  <span className="h-px w-8 bg-ink/25" />
                  Eats
                </p>
              </Reveal>
              <Reveal delay={0.05} className="mt-8 block">
                <PriceList items={regularMenu.eats} />
              </Reveal>
            </div>
            <div>
              <Reveal>
                <p className="eyebrow flex items-center gap-3 text-brick">
                  <Sprig className="h-4 w-4 shrink-0 text-sage" />
                  <span className="text-ink/40">04</span>
                  <span className="h-px w-8 bg-ink/25" />
                  Sandwiches
                </p>
              </Reveal>
              <Reveal delay={0.05} className="mt-8 block">
                <PriceList items={regularMenu.sandwiches} />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Order note ===================== */}
      {/* The page's one full-bleed brand-warm field. Brick gives cream far less
          headroom than espresso, so the supporting copy + eyebrow are lifted to
          clear AA — mirroring the working /contact CTA. */}
      <section className="relative overflow-hidden bg-brick py-16 text-cream md:py-24">
        <CornerBotanical position="bl" tone="text-cream/[0.10]" size="h-52 w-52" />
        <div className="relative z-10 mx-auto flex max-w-edge flex-col items-start justify-between gap-8 px-5 sm:px-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow inline-flex items-center gap-3 text-cream">
              <Sprig className="h-4 w-4 shrink-0 text-cream/70" />
              <span className="h-px w-8 bg-cream/30" />
              Ahead of the rush
            </p>
            <h2 className="mt-5 max-w-xl text-balance font-display text-fluid-lg leading-tight text-cream">
              Order ahead and skip the line.
            </h2>
            <p className="mt-3 text-cream/80">
              Customize milk, flavors and sizing at the counter or online.
            </p>
          </div>
          <Button href={site.orderPath} variant="cream">
            Order online
          </Button>
        </div>
      </section>
    </>
  );
}
