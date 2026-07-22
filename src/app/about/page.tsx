import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import { Bean } from '@/components/icons';
import { CornerBotanical, Sprig } from '@/components/Botanical';
import { site, photos } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Fusion Coffee is a curated coffee experience in the heart of downtown Fairfield, Illinois — fine ingredients, made to order, in a warm and welcoming space.',
  alternates: { canonical: '/about/' },
};

const ethos = [
  {
    title: 'Fine ingredients',
    body: 'We fuse an expansive knowledge of coffee with quality ingredients — nothing on the menu is an afterthought.',
  },
  {
    title: 'Made to order',
    body: 'Espresso pulled to spec, matcha whisked fresh, bowls built by hand. One-of-a-kind products, every time.',
  },
  {
    title: 'A place to belong',
    body: 'More than a coffee shop — a modern, welcoming space to connect with friends, family and community.',
  },
];

const materials = [
  { name: 'Brick', hex: '#B24E34' },
  { name: 'Terracotta', hex: '#D07A53' },
  { name: 'Oak', hex: '#D6B187' },
  { name: 'Cream', hex: '#F3EDE2' },
  { name: 'Sage', hex: '#7A8F73' },
  { name: 'Olive', hex: '#5C6B55' },
  { name: 'Concrete', hex: '#C8C3BB' },
  { name: 'Matte Black', hex: '#1E1E1E' },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="A curated coffee experience, brewed for community."
        intro="We opened our doors in downtown Fairfield with a simple idea: make exceptional coffee in a space people never want to leave."
      />

      {/* Story + portrait */}
      <section className="bg-cream pb-16 pt-14 md:pb-36 md:pt-20">
        <div className="mx-auto grid max-w-edge items-center gap-12 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          <Reveal className="md:col-span-7" y={32}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos.loungeNeon}
              alt="The Fusion Coffee lounge — a cream sofa and wood-stump stools beneath the glowing neon sign, framed by hanging ferns."
              className="aspect-[4/5] w-full object-cover md:aspect-[5/4]"
            />
          </Reveal>
          <div className="md:col-span-5">
            <Reveal>
              <p className="font-display text-2xl leading-relaxed text-ink md:text-[1.7rem]">
                {site.about}
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 text-lg leading-relaxed text-ink-muted">
                Every detail — from the beans we pull to the room we built — is
                in service of that welcome.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Ethos */}
      <section className="espresso-wash relative overflow-hidden bg-espresso py-16 text-cream md:py-32">
        <CornerBotanical position="tr" tone="text-oak/[0.09]" size="h-52 w-52" />
        <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <p className="eyebrow inline-flex items-center gap-3 text-oak"><Sprig className="h-4 w-4 shrink-0 text-sage" /><span className="h-px w-8 bg-oak/35" />What we&rsquo;re about</p>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
            {ethos.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1} className="group">
                <div className="flex h-11 w-11 items-center justify-center border border-oak/40 text-oak transition-colors duration-300 ease-out-expo group-hover:bg-oak group-hover:text-espresso">
                  <Bean className="h-5 w-5" />
                </div>
                <h2 className="mt-6 font-display text-2xl text-cream">
                  {item.title}
                </h2>
                <p className="mt-3 leading-relaxed text-cream/65">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Materials / palette — echoing the shop's own moodboard */}
      <section className="relative overflow-hidden bg-cream py-16 grain-soft md:py-36">
        <CornerBotanical position="bl" tone="text-sage/[0.15]" size="h-60 w-60" />
        <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <Reveal>
                <p className="eyebrow inline-flex items-center gap-3 text-brick"><Sprig className="h-4 w-4 shrink-0 text-sage" /><span className="h-px w-8 bg-ink/25" />The palette</p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.05] text-ink">
                  Warm. Natural. Modern.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
                  Our room is drawn straight from its materials — exposed brick,
                  light oak, trailing greenery and the soft light that pours
                  through the storefront windows.
                </p>
              </Reveal>
            </div>
            <div className="md:col-span-7">
              <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
                {materials.map((m, i) => (
                  <Reveal key={m.name} delay={(i % 4) * 0.06} className="group">
                    <div
                      className="aspect-square w-full border border-ink/10 transition-[transform,box-shadow] duration-[400ms] ease-out-expo group-hover:-translate-y-[3px] group-hover:shadow-[0_14px_34px_-22px_rgba(120,80,40,0.5)]"
                      style={{ backgroundColor: m.hex }}
                    />
                    <p className="mt-3 font-display text-base text-ink">
                      {m.name}
                    </p>
                    <p className="font-sans text-xs uppercase tracking-wide text-ink-muted transition-colors duration-300 group-hover:text-ink">
                      {m.hex}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery band — a warm latte field, one perceptible mid-step between the
          page's pale cream surfaces (no body text here, so AA is unaffected). */}
      <section className="bg-latte pb-16 md:pb-32">
        <div className="mx-auto grid max-w-edge grid-cols-2 gap-4 px-5 sm:px-8 md:grid-cols-4">
          {/* Mobile is a 2-col grid — every cell is a "first row" visually, so
              a flat pt-10 replaces the old pt-24/first:pt-24 pair. Desktop kept
              a quirk worth preserving exactly: the original `first:pt-24`
              (specificity 0,2,0) beat `md:pt-32` (0,1,0) even at md+, so the
              FIRST cell always sat 32px higher — md:first:pt-24 reproduces
              that pixel-for-pixel. The md stagger below stays untouched. */}
          {[
            { src: photos.interior, alt: 'Exposed brick wall and oak tables inside Fusion Coffee.' },
            { src: photos.barEspresso, alt: 'Ceramic cups and greenery on the espresso bar.' },
            { src: photos.flight, alt: 'A flight of four iced specialty drinks on a wood paddle.' },
            { src: photos.merchRack, alt: 'Branded coffee bags and apparel on a rack against brick.' },
          ].map((img, i) => (
            <Reveal
              key={img.src}
              delay={i * 0.08}
              y={28}
              className="pt-10 md:pt-32 md:first:pt-24"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className={`w-full object-cover ${
                  i % 2 === 0 ? 'aspect-[3/4]' : 'aspect-[3/4] md:translate-y-8'
                }`}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cream pb-16 md:pb-36">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-8 border-t border-ink/15 pt-14 md:flex-row md:items-center">
            <div>
              <p className="eyebrow inline-flex items-center gap-3 text-brick"><Sprig className="h-4 w-4 shrink-0 text-sage" /><span className="h-px w-8 bg-ink/25" />Come visit</p>
              <h2 className="mt-5 max-w-xl text-balance font-display text-fluid-lg leading-tight text-ink">
                Come see the space for yourself.
              </h2>
            </div>
            {/* Stacked full-width on mobile (thumb-sized targets, no ragged
                wrap); original inline row restored from md: up. */}
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-4">
              <Button href="/contact/" variant="primary" className="w-full md:w-auto">
                Plan your visit
              </Button>
              <Button href="/menu/" variant="outline" className="w-full md:w-auto">
                See the menu
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
