import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import Newsletter from '@/components/Newsletter';
import { CornerBotanical, Sprig } from '@/components/Botanical';
import {
  fallMenu,
  FALL_IMAGE_WIDTH,
  FALL_IMAGE_HEIGHT,
} from '@/lib/site';

/* ============================================================
   Fall Menu — the seasonal section, shared by the home page
   (withCta) and /menu (no CTA). Compact framed specimen cards
   (the .summer-card / .summer-rule treatment): heading + recipe
   are the primary content, with a tiny contained line-art emblem
   reserved in the lower-right corner. Drinks run three columns
   (two rows) on desktop, the toasts two; a single column on
   phones. Warm and low-profile — ≤12px card curves, paper grain,
   one restrained brand-corner botanical, no summer citrus and no
   per-item numbering. All readable text stays ink / ink-muted /
   brick-deep so AA holds on cream-deep. Server component — only
   <Reveal> inside is a client piece.

   The emblems are transparent 128×128 SVGs in /images/fall
   (Codex/Astra-owned art). They are decorative — the name and
   recipe beside them carry the meaning — so each renders with
   alt="" aria-hidden. Their strokes are already muted, so they
   are shown at full opacity rather than faded a second time.
   ============================================================ */

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];
const word = (n: number) => WORDS[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Curated index line, derived from the list so it never goes stale.
const drinkCount =
  fallMenu.groups.find((g) => /drink/i.test(g.heading))?.items.length ?? 0;
const toastCount =
  fallMenu.groups.find((g) => /toast/i.test(g.heading))?.items.length ?? 0;
const indexLine = `${cap(word(drinkCount))} seasonal drinks · ${word(toastCount)} warm toasts`;

// Split the seasonal word out of the title so site.ts / JSON-LD stay plain;
// falls back to the whole string unstyled if "Fall" is absent.
const titleParts = fallMenu.title.split(/(Fall)/); // ['The ', 'Fall', ' Menu is here.']

/** Drinks get a third column at lg; the two toasts stay two-up. */
function columnsFor(heading: string): string {
  return /toast/i.test(heading)
    ? 'sm:grid-cols-2'
    : 'sm:grid-cols-2 lg:grid-cols-3';
}

export default function FallMenu({ withCta = false }: { withCta?: boolean }) {
  return (
    <section
      className={`grain-soft relative overflow-hidden bg-cream-deep ${
        withCta ? 'py-16 md:py-32' : 'pb-16 pt-12 md:pb-28 md:pt-14'
      }`}
    >
      {/* Quiet brand greenery in one corner — no citrus. */}
      <CornerBotanical position="bl" motif="eucalyptus" tone="text-sage/[0.13]" size="h-52 w-52" />

      <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
        {/* ---------------- Header ---------------- */}
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <Reveal>
              {/* The "Limited time" chip — a real badge, not a floating eyebrow. */}
              <span className="inline-flex items-center gap-2.5 rounded-full border border-oak/45 bg-cream/70 px-4 py-1.5 backdrop-blur-[1px]">
                <Sprig className="h-4 w-4 shrink-0 text-sage" />
                <span className="eyebrow text-brick-deep">{fallMenu.eyebrow}</span>
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 max-w-2xl text-balance font-display text-fluid-xl leading-[1.04] text-ink">
                {titleParts.map((part, i) =>
                  part === 'Fall' ? (
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
                {fallMenu.intro}
              </p>
              <p className="mt-3 font-display text-lg italic text-ink/60">
                {indexLine}
              </p>
            </div>
          </Reveal>
        </div>

        {/* ---------------- Groups ---------------- */}
        <div className="mt-16 space-y-14">
          {fallMenu.groups.map((group) => (
            <div key={group.heading}>
              <Reveal>
                <div className="flex items-center gap-4">
                  <Sprig className="h-5 w-5 shrink-0 text-sage" />
                  <p className="eyebrow text-brick-deep">{group.heading}</p>
                  <span className="font-display text-sm leading-none text-ink/35">
                    {String(group.items.length).padStart(2, '0')}
                  </span>
                  <span className="ml-1 h-px flex-1 bg-gradient-to-r from-sage/40 via-oak/25 to-transparent" />
                </div>
              </Reveal>

              <div className={`mt-7 grid gap-6 ${columnsFor(group.heading)}`}>
                {group.items.map((item, i) => (
                  <Reveal as="div" key={item.id} delay={(i % 3) * 0.06} y={24}>
                    <article className="summer-card group relative flex h-full flex-col overflow-hidden p-6">
                      {/* Warm top rule — wipes sage→terracotta on hover; the
                          card's 1px frame is the visible rest separator. */}
                      <span aria-hidden className="summer-rule" />

                      {/* Tiny line-art emblem, contained in the lower-right.
                          Decorative — the name + recipe carry the meaning — so
                          alt="" aria-hidden. ~76px on phones, ~96px from md up. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt=""
                        aria-hidden="true"
                        width={FALL_IMAGE_WIDTH}
                        height={FALL_IMAGE_HEIGHT}
                        loading="lazy"
                        decoding="async"
                        className="pointer-events-none absolute bottom-4 right-4 z-0 h-[76px] w-[76px] object-contain md:h-24 md:w-24"
                      />

                      <h3 className="relative z-10 font-display text-2xl leading-tight text-ink">
                        {item.name}
                      </h3>
                      {/* pr keeps the copy clear of the corner emblem. */}
                      <p className="relative z-10 mt-2 text-pretty pr-16 leading-relaxed text-ink-muted md:pr-20">
                        {item.blurb}
                      </p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
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
