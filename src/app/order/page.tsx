import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import { ArrowUpRight, Clock, MapPin } from '@/components/icons';
import { site, photos } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Order Online',
  description:
    'Order Fusion Coffee online for pickup at 207 East Main Street, Fairfield, IL — or ship our coffee to your door. Skip the line and order ahead.',
};

const steps = [
  {
    n: '01',
    title: 'Browse the board',
    body: 'Pull up the full menu — espresso, matcha, cold brew, açaí and the day’s features.',
  },
  {
    n: '02',
    title: 'Make it yours',
    body: 'Choose your size, milk and flavors, then add anything else you’re craving.',
  },
  {
    n: '03',
    title: 'Skip the line',
    body: 'Check out and walk straight to the counter — your order’s already in.',
  },
];

const fulfillment = [
  {
    title: 'Pickup',
    body: 'Order ahead and grab it at the counter in downtown Fairfield.',
  },
  {
    title: 'Shipping',
    body: 'Send our coffee and goods straight to your door.',
  },
];

export default function OrderPage() {
  return (
    <>
      <PageHero
        eyebrow="Order Online"
        title="Order ahead. It’ll be waiting warm."
        intro="The fastest way to your usual. Order for pickup at the shop or ship our coffee home — checkout is handled securely through Square."
      />

      <section className="bg-cream pb-24 pt-14 md:pb-32">
        <div className="mx-auto grid max-w-edge gap-14 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          {/* How it works + fulfillment */}
          <div className="md:col-span-7">
            <Reveal>
              <p className="eyebrow text-brick">How it works</p>
            </Reveal>
            <ol className="mt-8 space-y-10">
              {steps.map((step, i) => (
                <Reveal as="li" key={step.n} delay={i * 0.08}>
                  <div className="flex gap-6">
                    <span className="font-display text-3xl italic text-oak">
                      {step.n}
                    </span>
                    <div className="border-b border-ink/10 pb-8">
                      <h2 className="font-display text-2xl text-ink">
                        {step.title}
                      </h2>
                      <p className="mt-2 max-w-md leading-relaxed text-ink-muted">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>

            <Reveal delay={0.1}>
              <div className="mt-12 grid gap-5 sm:grid-cols-2">
                {fulfillment.map((f) => (
                  <div
                    key={f.title}
                    className="border border-ink/12 bg-cream-deep/60 p-7"
                  >
                    <h3 className="font-display text-xl text-ink">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {f.body}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Order card */}
          <div className="md:col-span-5">
            <Reveal className="md:sticky md:top-28" y={32}>
              <div className="overflow-hidden border border-ink/12 bg-espresso text-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos.cans}
                  alt="Two Fusion Coffee branded can glasses — a creamy latte and a dark cold brew — on an oak table."
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="p-8">
                  <p className="eyebrow text-oak">Ready when you are</p>
                  <h2 className="mt-4 font-display text-3xl leading-tight text-cream">
                    Start your order
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-cream/65">
                    Secure checkout through Square. Your cart, your way.
                  </p>

                  <a
                    href={site.orderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-7 flex w-full items-center justify-center gap-2 bg-cream py-4 text-sm font-medium tracking-wide text-ink transition-colors duration-300 hover:bg-oak"
                  >
                    Order online
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>

                  <div className="mt-8 space-y-3 border-t border-cream/10 pt-6 text-sm text-cream/70">
                    <p className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-oak" />
                      {site.hoursSummary} · Sun closed
                    </p>
                    <p className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-oak" />
                      {site.address.street}, {site.address.city}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
