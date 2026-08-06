import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import BookingForm from '@/components/BookingForm';
import { Clock, Bean, Mail, Phone, ArrowUpRight } from '@/components/icons';
import { CornerBotanical, Sprig } from '@/components/Botanical';
import { site, partyBooking, photos } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Parties',
  description:
    'Book Fusion Coffee for a private party in downtown Fairfield, Illinois. Saturday and Sunday booking windows, with specialty drinks and bites made to order for your group.',
  alternates: { canonical: '/party/' },
};

// Group the flat slot list by day so the two Sunday windows sit together under
// one heading, rather than reading as two separate "Sunday" cards.
const windowsByDay = partyBooking.slots.reduce<{ day: string; times: string[] }[]>(
  (acc, slot) => {
    const time = `${slot.start} – ${slot.end}`;
    const existing = acc.find((d) => d.day === slot.day);
    if (existing) existing.times.push(time);
    else acc.push({ day: slot.day, times: [time] });
    return acc;
  },
  [],
);

// Distinct marks for the three value props (space / drinks / planning).
const includeIcons = [Sprig, Bean, Clock];

export default function PartyPage() {
  return (
    <>
      <PageHero
        eyebrow={partyBooking.eyebrow}
        title={partyBooking.title}
        intro={partyBooking.intro}
        ghost="Party"
      />

      {/* The space */}
      <section className="bg-cream pb-16 pt-14 md:pb-28 md:pt-20">
        <div className="mx-auto grid max-w-edge items-center gap-12 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          <Reveal className="group overflow-hidden md:col-span-7" y={32}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos.partySpace}
              alt="The café's exposed-brick room dressed for a private party — a eucalyptus and dried-flower garland along the wall, warm string lights, cream and terracotta balloons, and long oak tables set with candles and small floral arrangements."
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03] md:aspect-[5/4]"
            />
          </Reveal>
          <div className="md:col-span-5">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-3 text-brick">
                <Sprig className="h-4 w-4 shrink-0 text-sage" />
                <span className="h-px w-8 bg-ink/25" />
                The space
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.05] text-ink">
                The whole café, just for your group.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 text-lg leading-relaxed text-ink-muted">
                Book a window and the room is yours — exposed brick, trailing
                greenery and the glow of the neon, with the full bar of espresso,
                matcha and seasonal drinks made fresh for everyone.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Available windows */}
      <section className="relative overflow-hidden bg-cream pb-16 grain-soft md:pb-28">
        <CornerBotanical position="tr" tone="text-sage/[0.15]" size="h-52 w-52" />
        <div className="relative z-10 mx-auto grid max-w-edge gap-12 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-4">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-3 text-brick">
                <Sprig className="h-4 w-4 shrink-0 text-sage" />
                <span className="h-px w-8 bg-ink/25" />
                Available windows
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 text-balance font-display text-fluid-xl leading-[1.05] text-ink">
                Choose your window.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
                We host on the days the café is quietest. Pick the time that
                fits and send a request — we&rsquo;ll confirm the date with you.
              </p>
            </Reveal>
          </div>

          <div className="md:col-span-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {windowsByDay.map((entry, i) => (
                <Reveal key={entry.day} delay={i * 0.08}>
                  <div className="summer-card relative flex h-full flex-col p-8">
                    <span className="summer-rule" aria-hidden />
                    <div className="flex items-center gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-ink/15 text-brick">
                        <Clock className="h-5 w-5" />
                      </span>
                      <p className="font-display text-2xl text-ink">{entry.day}</p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2.5">
                      {entry.times.map((time) => (
                        <span
                          key={time}
                          className="border border-ink/15 bg-cream/60 px-3.5 py-1.5 text-sm tracking-wide text-ink"
                        >
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="espresso-wash relative overflow-hidden bg-espresso py-16 text-cream md:py-32">
        <CornerBotanical position="tr" tone="text-oak/[0.09]" size="h-52 w-52" />
        <div className="relative z-10 mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <p className="eyebrow inline-flex items-center gap-3 text-oak">
              <Sprig className="h-4 w-4 shrink-0 text-sage" />
              <span className="h-px w-8 bg-oak/35" />
              What&rsquo;s included
            </p>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
            {partyBooking.includes.map((item, i) => {
              const Icon = includeIcons[i] ?? Sprig;
              return (
                <Reveal key={item.title} delay={i * 0.1} className="group">
                  <div className="flex h-11 w-11 items-center justify-center border border-oak/40 text-oak transition-colors duration-300 ease-out-expo group-hover:bg-oak group-hover:text-espresso">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl text-cream">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-cream/65">{item.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Request form + direct contact */}
      <section className="relative overflow-hidden bg-cream py-16 grain-soft md:py-28">
        <CornerBotanical position="bl" tone="text-sage/[0.15]" size="h-60 w-60" />
        <div className="relative z-10 mx-auto grid max-w-edge gap-12 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          {/* Form */}
          <div className="md:col-span-7">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-3 text-brick">
                <Sprig className="h-4 w-4 shrink-0 text-sage" />
                <span className="h-px w-8 bg-ink/25" />
                Request a booking
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 max-w-xl text-balance font-display text-fluid-xl leading-[1.05] text-ink">
                Tell us about your party.
              </h2>
            </Reveal>
            <Reveal delay={0.12} className="mt-10">
              <BookingForm slots={partyBooking.slots} />
            </Reveal>
          </div>

          {/* Direct contact aside */}
          <div className="md:col-span-5">
            <Reveal delay={0.1}>
              <div className="border border-ink/12 bg-cream">
                <div className="p-8 sm:p-10">
                  <p className="font-display text-xl leading-snug text-ink">
                    Prefer to talk it through?
                  </p>
                  <p className="mt-3 text-pretty leading-relaxed text-ink-muted">
                    Reach out directly and we&rsquo;ll help plan the details.
                  </p>
                  <ul className="mt-7 divide-y divide-ink/10 border-y border-ink/10">
                    <li>
                      <a
                        href={`mailto:${site.email}?subject=${encodeURIComponent('Party booking inquiry')}`}
                        className="group flex items-center justify-between gap-4 py-5"
                      >
                        {/* min-w-0 down the flex chain + break-all let the long email
                            wrap on narrow phones instead of clipping in this
                            overflow-hidden section; md: restores desktop exactly. */}
                        <span className="flex min-w-0 items-center gap-4">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink/15 text-brick transition-colors duration-300 group-hover:bg-brick group-hover:text-cream">
                            <Mail className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs uppercase tracking-mega text-ink/40">
                              Email
                            </span>
                            <span className="break-all font-display text-base text-ink md:break-normal md:text-lg">
                              {site.email}
                            </span>
                          </span>
                        </span>
                        <ArrowUpRight className="h-5 w-5 text-ink/35 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" />
                      </a>
                    </li>
                    {site.phone && (
                      <li>
                        <a
                          href={site.phoneHref}
                          className="group flex items-center justify-between gap-4 py-5"
                        >
                          {/* Same clip guard as the email row above. */}
                          <span className="flex min-w-0 items-center gap-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink/15 text-brick transition-colors duration-300 group-hover:bg-brick group-hover:text-cream">
                              <Phone className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs uppercase tracking-mega text-ink/40">
                                Call
                              </span>
                              <span className="break-all font-display text-base text-ink md:break-normal md:text-lg">
                                {site.phone}
                              </span>
                            </span>
                          </span>
                          <ArrowUpRight className="h-5 w-5 text-ink/35 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" />
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brick py-20 text-cream md:py-24">
        <CornerBotanical position="tr" tone="text-cream/[0.10]" size="h-52 w-52" />
        <div className="relative z-10 mx-auto flex max-w-edge flex-col items-start justify-between gap-8 px-5 text-left sm:px-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow inline-flex items-center gap-3 text-cream">
              <Sprig className="h-4 w-4 shrink-0 text-cream/70" />
              <span className="h-px w-8 bg-cream/30" />
              No party in mind?
            </p>
            <h2 className="mt-5 max-w-xl text-balance font-display text-fluid-lg leading-tight text-cream">
              Come see the space for yourself.
            </h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button href="/contact/" variant="cream">
              Plan a visit
            </Button>
            <Button href="/menu/" variant="ghost-light">
              See the menu
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
