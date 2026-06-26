import Reveal from './Reveal';

export default function PageHero({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <section className="relative bg-cream pt-32 md:pt-44">
      <div className="mx-auto max-w-edge px-5 sm:px-8">
        <Reveal>
          <p className="eyebrow text-brick">{eyebrow}</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-6 max-w-4xl text-balance font-display text-fluid-2xl leading-[0.98] tracking-[-0.02em] text-ink">
            {title}
          </h1>
        </Reveal>
        {intro && (
          <Reveal delay={0.1}>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-ink/65">
              {intro}
            </p>
          </Reveal>
        )}
        <div className="mt-12 hairline md:mt-16" />
      </div>
    </section>
  );
}
