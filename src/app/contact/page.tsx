import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import VisitBlock from '@/components/VisitBlock';
import Button from '@/components/Button';
import { Mail, Phone, Instagram, Facebook, ArrowUpRight } from '@/components/icons';
import { CornerBotanical, Sprig } from '@/components/Botanical';
import { site, photos } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Visit Fusion Coffee at 207 East Main Street, Fairfield, IL. Hours, directions, and how to reach us by email, Instagram and Facebook.',
  alternates: { canonical: '/contact/' },
};

// Pre-filled email subjects for the inquiries the page invites — so a tap opens
// a ready-to-send note instead of a blank compose window.
const inquiries = [
  { label: 'Catering', subject: 'Catering inquiry' },
  { label: 'Private events', subject: 'Private event inquiry' },
  { label: 'Wholesale', subject: 'Wholesale inquiry' },
];

const channels = [
  {
    label: 'Email',
    value: site.email,
    href: `mailto:${site.email}`,
    Icon: Mail,
    external: false,
  },
  ...(site.phone
    ? [
        {
          label: 'Call',
          value: site.phone,
          href: site.phoneHref,
          Icon: Phone,
          external: false,
        },
      ]
    : []),
  {
    label: 'Instagram',
    value: site.social.instagram.handle,
    href: site.social.instagram.url,
    Icon: Instagram,
    external: true,
  },
  {
    label: 'Facebook',
    value: site.social.facebook.handle,
    href: site.social.facebook.url,
    Icon: Facebook,
    external: true,
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Come say hello."
        intro="Find us on Main Street, or reach out about catering, private events and wholesale — we'd love to hear from you."
      />

      <section className="relative overflow-hidden bg-cream pb-16 pt-12 md:pb-28 md:pt-14 grain-soft">
        <CornerBotanical position="br" tone="text-sage/[0.15]" size="h-52 w-52" />
        <div className="relative z-10 mx-auto grid max-w-edge gap-12 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          {/* Channels */}
          <div className="md:col-span-6">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-3 text-brick"><Sprig className="h-4 w-4 shrink-0 text-sage" /><span className="h-px w-8 bg-ink/25" />Reach us</p>
            </Reveal>
            <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
              {channels.map(({ label, value, href, Icon, external }, i) => (
                <Reveal as="li" key={label} delay={i * 0.07}>
                  <a
                    href={href}
                    {...(external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className="group flex items-center justify-between gap-4 py-6"
                  >
                    {/* min-w-0 down the flex chain lets the value shrink below its
                        intrinsic width; break-all wraps the long email on narrow
                        phones instead of clipping inside the overflow-hidden section.
                        md: restores the exact desktop rendering. */}
                    <span className="flex min-w-0 items-center gap-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-ink/15 text-brick transition-colors duration-300 group-hover:bg-brick group-hover:text-cream">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs uppercase tracking-mega text-ink/40">
                          {label}
                        </span>
                        <span className="break-all font-display text-lg text-ink md:break-normal md:text-xl">
                          {value}
                        </span>
                      </span>
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-ink/35 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" />
                  </a>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={0.1}>
              <p className="mt-8 max-w-md text-pretty leading-relaxed text-ink-muted">
                Planning something special? Send us a note about catering,
                large orders or collaborations and we&rsquo;ll get right back
                to you.
              </p>
            </Reveal>
            <Reveal delay={0.14}>
              <div className="mt-5 flex flex-wrap gap-3">
                {inquiries.map(({ label, subject }) => (
                  <a
                    key={label}
                    href={`mailto:${site.email}?subject=${encodeURIComponent(subject)}`}
                    // min-h-[44px] lifts the pill to the iOS thumb-target minimum on
                    // phones; md:min-h-0 restores the exact desktop height.
                    className="inline-flex min-h-[44px] items-center border border-ink/20 px-4 py-2 text-sm tracking-wide text-ink transition-colors duration-300 hover:bg-ink hover:text-cream md:min-h-0"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Storefront image */}
          <Reveal className="group overflow-hidden md:col-span-6" y={32}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos.barWindow}
              alt="The café bar beside the tall storefront windows looking out onto Main Street, Fairfield."
              className="h-full min-h-[360px] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
            />
          </Reveal>
        </div>
      </section>

      {/* Map + hours */}
      <section className="bg-cream pb-16 md:pb-36">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <VisitBlock />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brick py-20 text-cream md:py-24">
        <CornerBotanical position="tr" tone="text-cream/[0.10]" size="h-52 w-52" />
        <div className="relative z-10 mx-auto flex max-w-edge flex-col items-start justify-between gap-8 px-5 text-left sm:px-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow inline-flex items-center gap-3 text-cream"><Sprig className="h-4 w-4 shrink-0 text-cream/70" /><span className="h-px w-8 bg-cream/30" />Ready when you are</p>
            <h2 className="mt-5 max-w-xl text-balance font-display text-fluid-lg leading-tight text-cream">
              Already know your order?
            </h2>
          </div>
          <Button href={site.orderPath} variant="cream">
            Order online
          </Button>
        </div>
      </section>
    </>
  );
}
