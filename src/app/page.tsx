import Link from 'next/link';
import Button from '@/components/Button';
import Reveal from '@/components/Reveal';
import Marquee from '@/components/Marquee';
import VisitBlock from '@/components/VisitBlock';
import { ArrowRight, ArrowUpRight } from '@/components/icons';
import { site, signatures, drinkBoard, photos } from '@/lib/site';

export default function HomePage() {
  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-espresso">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos.interior}
          alt="Inside Fusion Coffee — exposed brick wall, light oak tables and benches beneath a pressed-tin ceiling."
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/55 to-espresso/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/70 to-transparent" />

        <div className="relative mx-auto w-full max-w-edge px-5 pb-16 pt-32 sm:px-8 md:pb-24">
          <Reveal>
            <p className="eyebrow text-oak">
              Downtown Fairfield, Illinois
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-5xl font-display text-fluid-3xl font-medium leading-[0.92] tracking-[-0.02em] text-cream">
              Skip the line.
              <br />
              <span className="italic text-oak">Savor the space.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-cream/80">
              A curated coffee experience that fuses fine ingredients with a
              warm, welcoming room. Specialty espresso, matcha &amp; açaí —
              made with intention.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button href={site.orderUrl} external variant="primary">
                Order now
              </Button>
              <Button href="/menu/" variant="ghost-light" arrow={false}>
                Explore the menu
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.34}>
            <div className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-cream/15 pt-6 text-sm text-cream/70">
              <span className="eyebrow text-cream/55">Hours</span>
              <span>{site.hoursSummary}</span>
              <span className="hidden h-4 w-px bg-cream/20 sm:block" />
              <span>{site.address.street}, {site.address.city}</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ MARQUEE ============================ */}
      <Marquee
        items={[
          'Specialty espresso',
          'Strawberry matcha',
          'Açaí bowls',
          'Slow-steeped cold brew',
          'Pour over',
          'Made to order',
        ]}
      />

      {/* ============================ STORY ============================ */}
      <section className="relative overflow-hidden bg-cream py-24 md:py-36">
        <div className="mx-auto grid max-w-edge items-center gap-12 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-6 lg:col-span-5">
            <Reveal>
              <p className="eyebrow flex items-center gap-3 text-brick">
                <span className="text-ink/40">01</span>
                <span className="h-px w-8 bg-ink/25" />
                Our story
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.04] text-ink">
                More than a coffee shop — a place to belong.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-7 text-pretty text-lg leading-relaxed text-ink/65">
                Fusion Coffee provides a curated coffee experience in the heart
                of downtown Fairfield. Our process fuses an expansive knowledge
                of coffee and fine ingredients to create one-of-a-kind products
                in a modern, welcoming space.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <Link
                href="/about/"
                className="link-underline group mt-9 inline-flex items-center gap-2 font-display text-lg italic text-brick-deep"
              >
                Read our story
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <div className="grid grid-cols-5 gap-4">
              <Reveal className="col-span-3" y={32}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos.loungeNeon}
                  alt="Fusion Coffee lounge — a cream sofa and wood-stump stools under the glowing neon sign, framed by ferns."
                  className="h-full w-full object-cover"
                />
              </Reveal>
              <Reveal className="col-span-2 self-end" y={32} delay={0.12}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos.barEspresso}
                  alt="Stacked ceramic cups and trailing greenery on the espresso bar."
                  className="aspect-[3/4] w-full object-cover"
                />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ SIGNATURES ============================ */}
      <section className="bg-cream-deep py-24 md:py-36">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Reveal>
                <p className="eyebrow flex items-center gap-3 text-brick">
                  <span className="text-ink/40">02</span>
                  <span className="h-px w-8 bg-ink/25" />
                  Signatures
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-6 max-w-2xl text-balance font-display text-fluid-xl leading-[1.04] text-ink">
                  The builds people drive in for.
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <Link
                href="/menu/"
                className="link-underline group inline-flex items-center gap-2 self-start font-medium tracking-wide text-ink md:self-auto"
              >
                Full menu
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Reveal>
          </div>

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

      {/* ======================= MENU BOARD MOTIF ======================= */}
      <section className="relative overflow-hidden bg-cream py-24 md:py-36">
        <div className="mx-auto grid max-w-edge gap-14 px-5 sm:px-8 md:grid-cols-2 md:gap-20">
          <div className="md:order-2">
            <Reveal>
              <p className="eyebrow flex items-center gap-3 text-brick">
                <span className="text-ink/40">03</span>
                <span className="h-px w-8 bg-ink/25" />
                On the board
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.04] text-ink">
                Everything you&rsquo;d hope for on the wall.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
                The same hand-set board that greets you in the shop — drip to
                matcha, built by baristas who care about the details.
              </p>
            </Reveal>

            <ul className="mt-10 grid grid-cols-2 gap-x-8">
              {drinkBoard.map((drink, i) => (
                <Reveal as="li" key={drink} delay={i * 0.04}>
                  <div className="dowel-row flex items-baseline justify-between pb-3 pt-5">
                    <span className="font-display text-xl tracking-wide text-ink">
                      {drink}
                    </span>
                    <span className="font-sans text-xs tracking-mega text-ink/35">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={0.2}>
              <div className="mt-12">
                <Button href="/menu/" variant="outline">
                  See the full menu
                </Button>
              </div>
            </Reveal>
          </div>

          <div className="md:order-1">
            <Reveal y={36} className="h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos.menuBoard}
                alt="The wood-dowel menu board mounted on the wall — Drip, Pour Over, Espresso, Cortado, Cappuccino, Latte, Americano, Cold Brew, Matcha, Tea — lit by afternoon sun."
                className="h-full min-h-[420px] w-full object-cover md:min-h-[640px]"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================ THE SPACE ============================ */}
      <section className="bg-espresso py-24 text-cream md:py-36">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <div className="grid items-end gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <Reveal>
                <p className="eyebrow flex items-center gap-3 text-oak">
                  <span className="text-cream/40">04</span>
                  <span className="h-px w-8 bg-cream/25" />
                  The space
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-6 max-w-2xl text-balance font-display text-fluid-xl leading-[1.04] text-cream">
                  Brick, oak, greenery &amp; soft light.
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.1} className="md:col-span-5">
              <p className="max-w-md text-pretty leading-relaxed text-cream/65 md:ml-auto">
                Settle into the bench by the window, gather a table with friends,
                or post up on the sofa beneath the sign. The room was made to
                linger in.
              </p>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-12">
            <Reveal className="md:col-span-7" y={30}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos.barWindow}
                alt="The café bar beside tall storefront windows, with the menu board and espresso setup."
                className="aspect-[4/3] w-full object-cover"
              />
            </Reveal>
            <Reveal className="md:col-span-5" y={30} delay={0.1}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos.latteArt}
                alt="A cappuccino with rosetta latte art and a gingerbread cookie in warm window light."
                className="aspect-[4/3] h-full w-full object-cover"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================ VISIT ============================ */}
      <section className="bg-cream py-24 md:py-36">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Reveal>
                <p className="eyebrow flex items-center gap-3 text-brick">
                  <span className="text-ink/40">05</span>
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
          </div>
          <Reveal delay={0.08}>
            <VisitBlock />
          </Reveal>
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="relative overflow-hidden bg-brick py-24 text-cream md:py-32">
        <div className="mx-auto max-w-edge px-5 text-center sm:px-8">
          <Reveal>
            <p className="eyebrow text-white">Skip the line</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance font-display text-fluid-2xl leading-[0.98] text-cream">
              Order ahead. It&rsquo;ll be waiting warm.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button href={site.orderUrl} external variant="cream">
                Order online
              </Button>
              <Button href="/contact/" variant="ghost-light" arrow={false}>
                Visit the shop
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
