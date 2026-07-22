import Reveal from './Reveal';
import { CornerBotanical, Sprig } from './Botanical';

export default function PageHero({
  eyebrow,
  title,
  intro,
  ghost,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  /** Faint oversized word set behind the title. Defaults to the eyebrow. */
  ghost?: string;
}) {
  return (
    <section className="hero-wash grain-soft relative overflow-hidden bg-cream pt-24 md:pt-44">
      {/* Oversized ghost letterform — the cream-surface echo of the footer's
          giant brand word. Purely decorative, sits behind z-10 content. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1 left-0 z-0 select-none px-5 font-display text-[24vw] leading-[0.8] tracking-[-0.04em] text-ink/[0.035] sm:px-8 md:text-[15vw]"
      >
        {ghost ?? eyebrow}
      </span>
      <CornerBotanical position="tr" size="h-52 w-52" />
      <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
        <Reveal>
          <p className="eyebrow inline-flex items-center gap-2.5 text-brick">
            <Sprig className="h-4 w-4 shrink-0 text-sage" />
            {eyebrow}
          </p>
        </Reveal>
        <Reveal delay={0.08} y={34}>
          <h1 className="mt-6 max-w-4xl text-balance font-display text-fluid-2xl leading-[0.98] tracking-[-0.02em] text-ink">
            {title}
          </h1>
        </Reveal>
        {intro && (
          <Reveal delay={0.16}>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-ink/65">
              {intro}
            </p>
          </Reveal>
        )}
        {/* Draw-in accent rule — the left hairline wipes in on reveal,
            echoing the home page's animated accents. */}
        <Reveal delay={0.26} className="mt-8 md:mt-16">
          <div className="flex items-center gap-4" aria-hidden>
            <span className="hero-rule-line h-px flex-1 bg-gradient-to-r from-transparent to-sage/45" />
            <Sprig className="h-6 w-6 shrink-0 text-sage" />
            <span className="h-px flex-1 bg-gradient-to-r from-sage/45 to-transparent" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
