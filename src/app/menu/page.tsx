import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import { site, signatures, drinkBoard, photos } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Menu',
  description:
    'Specialty espresso, pour over, matcha, cold brew, açaí bowls and signature builds at Fusion Coffee in Fairfield, IL. See the board and order online.',
};

export default function MenuPage() {
  return (
    <>
      <PageHero
        eyebrow="Menu"
        title="The board, and the builds."
        intro="Drip to matcha, pulled and whisked to order. Here's what greets you on the wall — full selection, sizes and pricing live on our online ordering."
      />

      {/* The board */}
      <section className="bg-cream pb-24 pt-14 md:pb-32">
        <div className="mx-auto grid max-w-edge gap-14 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <Reveal className="md:sticky md:top-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos.menuBoard}
                alt="The hand-set wood-dowel menu board on the wall, lit by afternoon sun."
                className="aspect-[3/4] w-full object-cover"
              />
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-muted">
                The board as it hangs in the shop. Milk alternatives, flavors
                and sizing are all available at the counter.
              </p>
            </Reveal>
          </div>

          <div className="md:col-span-7">
            <Reveal>
              <p className="eyebrow text-brick">On the board</p>
            </Reveal>
            <ul className="mt-4">
              {drinkBoard.map((drink, i) => (
                <Reveal as="li" key={drink} delay={i * 0.03}>
                  <div className="dowel-row flex items-baseline justify-between pb-4 pt-7">
                    <span className="font-display text-3xl tracking-tight text-ink md:text-4xl">
                      {drink}
                    </span>
                    <span className="font-sans text-xs tracking-mega text-ink/35">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Signatures */}
      <section className="bg-cream-deep py-24 md:py-32">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <p className="eyebrow flex items-center gap-3 text-brick">
              <span className="text-ink/40">01</span>
              <span className="h-px w-8 bg-ink/25" />
              Signature builds
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 max-w-2xl text-balance font-display text-fluid-xl leading-[1.05] text-ink">
              House specialties worth the drive.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {signatures.map((item, i) => (
              <Reveal as="figure" key={item.name} delay={(i % 3) * 0.08} y={30}>
                <div className="group relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.alt}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-4 top-4 bg-cream/95 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-mega text-ink">
                    {item.tag}
                  </span>
                </div>
                <figcaption className="mt-5">
                  <h3 className="font-display text-2xl text-ink">{item.name}</h3>
                  <p className="mt-2 text-pretty leading-relaxed text-ink-muted">
                    {item.blurb}
                  </p>
                </figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Eats */}
      <section className="bg-cream py-24 md:py-32">
        <div className="mx-auto grid max-w-edge items-center gap-12 px-5 sm:px-8 md:grid-cols-2 md:gap-16">
          <Reveal y={32}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos.acai}
              alt="Two açaí bowls topped with granola, banana, strawberry and blueberry beneath the neon sign."
              className="aspect-[4/3] w-full object-cover"
            />
          </Reveal>
          <div>
            <Reveal>
              <p className="eyebrow flex items-center gap-3 text-brick">
                <span className="text-ink/40">02</span>
                <span className="h-px w-8 bg-ink/25" />
                Eats
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.05] text-ink">
                Açaí bowls &amp; light bites.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
                Thick-blended açaí bowls built to order with granola and fresh
                fruit, plus a rotating case of pastries and light bites to pair
                with your cup.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Order note */}
      <section className="bg-espresso py-20 text-cream md:py-24">
        <div className="mx-auto flex max-w-edge flex-col items-start justify-between gap-8 px-5 sm:px-8 md:flex-row md:items-center">
          <div>
            <h2 className="max-w-xl text-balance font-display text-fluid-lg leading-tight text-cream">
              Full selection &amp; pricing on our online ordering.
            </h2>
            <p className="mt-3 text-cream/60">
              Browse everything, customize, and skip the line.
            </p>
          </div>
          <Button href={site.orderUrl} external variant="cream">
            Order online
          </Button>
        </div>
      </section>
    </>
  );
}
