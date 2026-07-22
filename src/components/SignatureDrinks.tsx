import Reveal from '@/components/Reveal';
import { Sprig } from '@/components/Botanical';
import { signatures } from '@/lib/site';

/* ============================================================
   Signature Drinks — the photographed gallery of the shop's
   best-known builds. The signatures[] data was fully authored
   (names, tags, blurbs, real photos) but never rendered; this
   lights it up. Photo-led on purpose, so it reads distinctly
   from the text-only Summer specimen cards. Server component —
   only <Reveal> inside is a client piece.
   ============================================================ */

export default function SignatureDrinks({
  limit,
  heading = 'The ones we’re known for.',
  intro = 'Made to order, built honestly — a few of the drinks regulars come back for.',
  index = '',
  className = '',
}: {
  /** Render only the first N (e.g. a 3-up on the home page). */
  limit?: number;
  heading?: string;
  intro?: string;
  /** Optional section number for the editorial eyebrow, e.g. "01". */
  index?: string;
  className?: string;
}) {
  const items = limit ? signatures.slice(0, limit) : signatures;

  return (
    <section className={`relative overflow-hidden bg-cream py-20 md:py-28 ${className}`}>
      <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
        {/* Header — two-end editorial crossbar */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal>
              <p className="eyebrow flex items-center gap-3 text-brick">
                <Sprig className="h-4 w-4 shrink-0 text-sage" />
                {index && <span className="text-ink/40">{index}</span>}
                <span className="h-px w-8 bg-ink/25" />
                Signatures
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 max-w-2xl text-balance font-display text-fluid-xl leading-[1.04] text-ink">
                {heading}
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-pretty leading-relaxed text-ink-muted md:text-right">
              {intro}
            </p>
          </Reveal>
        </div>

        {/* Cards */}
        <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((drink, i) => (
            <Reveal as="figure" key={drink.name} delay={(i % 3) * 0.07} y={28} className="group">
              <div className="overflow-hidden border border-ink/10 bg-cream-deep">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={drink.image}
                  alt={drink.alt}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="mt-4">
                <span className="inline-flex items-center rounded-full border border-oak/45 bg-cream/70 px-3 py-1">
                  <span className="eyebrow text-[0.62rem] text-brick-deep">{drink.tag}</span>
                </span>
                <h3 className="mt-3 font-display text-2xl leading-tight text-ink">
                  {drink.name}
                </h3>
                <p className="mt-2 text-pretty leading-relaxed text-ink-muted">
                  {drink.blurb}
                </p>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
