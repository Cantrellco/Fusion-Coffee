import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import VisitBlock from '@/components/VisitBlock';
import Button from '@/components/Button';
import { Mail, Instagram, Facebook, ArrowUpRight } from '@/components/icons';
import { site, photos } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Visit Fusion Coffee at 207 East Main Street, Fairfield, IL. Hours, directions, and how to reach us by email, Instagram and Facebook.',
};

const channels = [
  {
    label: 'Email',
    value: site.email,
    href: `mailto:${site.email}`,
    Icon: Mail,
    external: false,
  },
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

      <section className="bg-cream pb-20 pt-14 md:pb-28">
        <div className="mx-auto grid max-w-edge gap-12 px-5 sm:px-8 md:grid-cols-12 md:gap-16">
          {/* Channels */}
          <div className="md:col-span-6">
            <Reveal>
              <p className="eyebrow text-brick">Reach us</p>
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
                    <span className="flex items-center gap-5">
                      <span className="flex h-11 w-11 items-center justify-center border border-ink/15 text-brick transition-colors duration-300 group-hover:bg-brick group-hover:text-cream">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-xs uppercase tracking-mega text-ink/40">
                          {label}
                        </span>
                        <span className="font-display text-xl text-ink">
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
          </div>

          {/* Storefront image */}
          <Reveal className="md:col-span-6" y={32}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos.barWindow}
              alt="The café bar beside the tall storefront windows looking out onto Main Street, Fairfield."
              className="h-full min-h-[360px] w-full object-cover"
            />
          </Reveal>
        </div>
      </section>

      {/* Map + hours */}
      <section className="bg-cream pb-24 md:pb-36">
        <div className="mx-auto max-w-edge px-5 sm:px-8">
          <Reveal>
            <VisitBlock />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brick py-20 text-cream md:py-24">
        <div className="mx-auto flex max-w-edge flex-col items-start justify-between gap-8 px-5 text-left sm:px-8 md:flex-row md:items-center">
          <h2 className="max-w-xl text-balance font-display text-fluid-lg leading-tight text-cream">
            Already know your order?
          </h2>
          <Button href={site.orderUrl} external variant="cream">
            Order online
          </Button>
        </div>
      </section>
    </>
  );
}
