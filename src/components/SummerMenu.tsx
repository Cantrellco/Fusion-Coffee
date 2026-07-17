import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import Newsletter from '@/components/Newsletter';
import { CornerBotanical, Sprig } from '@/components/Botanical';
import { CitrusArc, CitrusSlice } from '@/components/Citrus';
import SummerStillLife from '@/components/SummerStillLife';
import { specimenFor } from '@/components/SummerSpecimens';
import { summerMenu } from '@/lib/site';

/* ============================================================
   Summer Menu — the seasonal section, shared by the home page
   (withCta) and /menu (no CTA). Treatment: a warm one-corner
   "summer light" wash + hand-drawn citrus motif over the brand's
   existing botanicals, with each item set as a framed specimen
   card instead of a flat text row. All readable text stays
   ink / ink-muted / brick-deep so AA holds on cream-deep; oak,
   terracotta and sage are decoration only. Server component —
   only <Reveal> inside is a client piece.
   ============================================================ */

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];
const word = (n: number) => WORDS[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Curated index line, derived from the list so it never goes stale: the count
// of the Drinks group + everything else as "sweet bites".
const total = summerMenu.groups.reduce((n, g) => n + g.items.length, 0);
const drinkCount =
  summerMenu.groups.find((g) => /drink/i.test(g.heading))?.items.length ?? 0;
const biteCount = total - drinkCount;
const indexLine = `${cap(word(drinkCount))} seasonal drinks · ${word(biteCount)} sweet bites`;

// Split the seasonal word out of the title so site.ts / JSON-LD stay plain;
// falls back to the whole string unstyled if "Summer" is absent.
const titleParts = summerMenu.title.split(/(Summer)/); // ['The ', 'Summer', ' Menu is on.']

export default function SummerMenu({ withCta = false }: { withCta?: boolean }) {
  return (
    <section
      className={`summer-sun grain-soft relative overflow-hidden bg-cream-deep ${
        withCta ? 'py-24 md:py-32' : 'pb-20 pt-14 md:pb-28'
      }`}
    >
      {/* Faint summer light + greenery, all behind the content (z-0). */}
      <CitrusArc
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-2 z-0 hidden h-80 w-80 text-oak/[0.2] md:block"
      />
      <CornerBotanical position="bl" motif="eucalyptus" tone="text-sage/[0.13]" size="h-52 w-52" />

      <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
        {/* ---------------- Header ---------------- */}
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <Reveal>
              {/* The "Limited time" chip — a real badge, not a floating eyebrow. */}
              <span className="inline-flex items-center gap-2.5 rounded-full border border-oak/45 bg-cream/70 px-4 py-1.5 backdrop-blur-[1px]">
                <CitrusSlice className="h-4 w-4 shrink-0 text-terracotta" />
                <span className="eyebrow text-brick-deep">{summerMenu.eyebrow}</span>
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 max-w-2xl text-balance font-display text-fluid-xl leading-[1.04] text-ink">
                {titleParts.map((part, i) =>
                  part === 'Summer' ? (
                    <span key={i} className="italic text-brick-deep">
                      {part}
                    </span>
                  ) : (
                    part
                  ),
                )}
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="max-w-sm md:text-right">
              <p className="text-pretty leading-relaxed text-ink-muted">
                {summerMenu.intro}
              </p>
              <p className="mt-3 font-display text-lg italic text-ink/60">
                {indexLine}
              </p>
              {/* The seasonal still-life — the drawn "summer" moment. Home
                  only, like the card watermarks; /menu stays restrained. */}
              {withCta && (
                <SummerStillLife className="ml-auto mt-7 hidden w-64 opacity-80 md:block lg:w-72" />
              )}
            </div>
          </Reveal>
        </div>

        {/* ---------------- Groups ---------------- */}
        <div className="mt-16 space-y-14">
          {summerMenu.groups.map((group) => {
            const isDrinks = /drink/i.test(group.heading);
            return (
            <div key={group.heading}>
              <Reveal>
                <div className="flex items-center gap-4">
                  <CitrusSlice className="h-5 w-5 shrink-0 text-sage" />
                  <p className="eyebrow text-brick-deep">{group.heading}</p>
                  <span className="font-display text-sm leading-none text-ink/35">
                    {String(group.items.length).padStart(2, '0')}
                  </span>
                  <span className="ml-1 h-px flex-1 bg-gradient-to-r from-sage/40 via-terracotta/25 to-transparent" />
                </div>
              </Reveal>

              <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item, i) => (
                  <Reveal as="div" key={item.name} delay={(i % 3) * 0.06} y={24}>
                    <article className="summer-card group relative h-full overflow-hidden p-6 sm:p-7">
                      {/* Warm top rule — wipes sage→terracotta on hover; the card's
                          1px frame is the visible rest-state separator. */}
                      <span aria-hidden className="summer-rule" />
                      {/* Per-item specimen sketch bleeding off the bottom-right
                          corner — each item drawn in the shop's pen (see
                          SummerSpecimens). Falls back to the generic citrus/
                          sprig mark for any item without a drawing yet. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -bottom-4 -right-3 z-0 h-28 w-28 opacity-55"
                      >
                        {specimenFor(item.name) ??
                          (isDrinks ? (
                            <CitrusSlice className="h-full w-full -rotate-12 text-oak/[0.15]" />
                          ) : (
                            <Sprig className="h-full w-full rotate-6 text-sage/[0.18]" />
                          ))}
                      </span>
                      <span
                        aria-hidden
                        className="absolute right-5 top-5 z-10 font-display text-sm leading-none text-ink/30 transition-colors duration-300 group-hover:text-terracotta"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="relative z-10 max-w-[14rem] font-display text-2xl leading-tight text-ink">
                        {item.name}
                      </h3>
                      <p className="relative z-10 mt-2.5 text-pretty leading-relaxed text-ink-muted">
                        {item.blurb}
                      </p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
            );
          })}
        </div>

        {/* ---------------- CTA + owned-channel capture — home only ---------------- */}
        {withCta && (
          <>
            <Reveal delay={0.1}>
              <div className="mt-16 flex flex-col items-center gap-6 border-t border-ink/12 pt-12">
                <Sprig className="h-6 w-6 text-sage" aria-hidden />
                <Button href="/menu/" variant="primary">
                  See the full menu
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <Newsletter />
            </Reveal>
          </>
        )}
      </div>
    </section>
  );
}
