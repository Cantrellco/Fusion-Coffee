import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import { site, photos } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Merch',
  description:
    'Take Fusion Coffee home — branded apparel, coffee beans by the bag, drinkware and home-brew gear. Shop in store on Main Street or online.',
};

const categories = [
  {
    name: 'Apparel',
    body: 'Soft tees, crewnecks and caps in our warm, earthy tones.',
    image: photos.merchRack,
    alt: 'A rack of Fusion Coffee apparel — tees and caps in earthy tones against the exposed brick wall.',
    span: 'lg:col-span-7',
    ratio: 'aspect-[4/3]',
  },
  {
    name: 'Drinkware',
    body: 'Our signature branded can glasses — the ones your iced latte looks best in.',
    image: photos.cans,
    alt: 'Two Fusion Coffee branded can glasses on an oak table in front of brick.',
    span: 'lg:col-span-5',
    ratio: 'aspect-[4/3]',
  },
];

const lineup = ['Apparel', 'Coffee beans', 'Drinkware', 'Brew gear', 'Candles'];

export default function MerchPage() {
  return (
    <>
      <PageHero
        eyebrow="Merch"
        title="Take the shop home."
        intro="Branded apparel, beans by the bag, drinkware and the gear to brew it right — pulled together in the same warm palette as the room."
      />

      {/* Lead image */}
      <section className="bg-cream pb-20 pt-10 md:pb-28">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <Reveal y={32}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos.merchRack}
              alt="Fusion Coffee merchandise — branded coffee bags on white shelving and apparel on a rack against exposed brick, by the storefront window."
              className="aspect-[16/10] w-full object-cover"
            />
          </Reveal>
        </div>
      </section>

      {/* Featured categories */}
      <section className="bg-cream-deep py-24 md:py-32">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <p className="eyebrow flex items-center gap-3 text-brick">
              <span className="text-ink/40">01</span>
              <span className="h-px w-8 bg-ink/25" />
              In the shop
            </p>
          </Reveal>

          <div className="mt-12 grid gap-7 lg:grid-cols-12">
            {categories.map((cat, i) => (
              <Reveal
                as="figure"
                key={cat.name}
                delay={i * 0.1}
                y={30}
                className={cat.span}
              >
                <div className="group overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.image}
                    alt={cat.alt}
                    loading="lazy"
                    className={`${cat.ratio} w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]`}
                  />
                </div>
                <figcaption className="mt-5">
                  <h2 className="font-display text-2xl text-ink">{cat.name}</h2>
                  <p className="mt-2 max-w-md text-pretty leading-relaxed text-ink-muted">
                    {cat.body}
                  </p>
                </figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Lineup + shop CTA */}
      <section className="bg-espresso py-24 text-cream md:py-32">
        <div className="mx-auto grid max-w-edge gap-12 px-5 sm:px-8 md:grid-cols-2 md:gap-16">
          <div>
            <Reveal>
              <p className="eyebrow text-oak">The lineup</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.05] text-cream">
                Everything, in one warm palette.
              </h2>
            </Reveal>
          </div>
          <div className="md:pt-2">
            <ul>
              {lineup.map((item, i) => (
                <Reveal as="li" key={item} delay={i * 0.05}>
                  <div className="flex items-baseline justify-between border-b border-cream/12 py-5">
                    <span className="font-display text-2xl text-cream">
                      {item}
                    </span>
                    <span className="font-sans text-xs tracking-mega text-cream/35">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={0.1}>
              <div className="mt-10">
                <Button href={site.orderUrl} external variant="cream">
                  Shop online
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
