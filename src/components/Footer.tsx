import Link from 'next/link';
import { nav, site } from '@/lib/site';
import NeonLogo from './NeonLogo';
import CurrentYear from './CurrentYear';
import { CornerBotanical } from './Botanical';
import { ArrowUpRight, Instagram, Facebook, Mail, MapPin, Clock, Phone } from './icons';

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${site.name} ${site.address.full}`,
)}`;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    // pb-tabbar clears the fixed mobile tab bar INSIDE the espresso surface
    // (padding on <body> would expose a cream strip behind the glass bar at
    // page end). Zero at md and up — desktop unchanged.
    <footer className="pb-tabbar relative overflow-hidden bg-espresso text-cream">
      {/* Oversized brand flourish */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 right-0 select-none font-display text-[28vw] leading-none text-cream/[0.035] md:text-[20vw]"
      >
        Fusion
      </div>
      <CornerBotanical position="tl" tone="text-oak/[0.08]" size="h-60 w-60" />
      <CornerBotanical position="br" tone="text-sage/[0.10]" size="h-72 w-72" />

      <div className="relative mx-auto max-w-edge px-5 py-20 sm:px-8 md:py-28">
        <div className="grid gap-14 md:grid-cols-12">
          {/* Brand + invitation */}
          <div className="md:col-span-5">
            <NeonLogo width={150} flicker />
            <p className="mt-8 max-w-sm font-display text-2xl leading-snug text-cream/90">
              More than a coffee shop — a space to be connected to friends,
              family &amp; community.
            </p>
            <a
              href={site.orderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex items-center gap-2 bg-cream px-6 py-3 text-sm font-medium tracking-wide text-ink transition-colors duration-300 hover:bg-oak"
            >
              Order online
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          {/* Visit */}
          <div className="md:col-span-3">
            <h3 className="eyebrow text-oak">Visit</h3>
            <ul className="mt-5 space-y-4 text-cream/80">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-oak/80" />
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline leading-relaxed"
                >
                  {site.address.street}
                  <br />
                  {site.address.city}, {site.address.state} {site.address.zip}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-oak/80" />
                <span className="leading-relaxed">
                  {site.hoursSummary}
                  <br />
                  <span className="text-cream/50">Sunday closed</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Explore */}
          <div className="md:col-span-2">
            <h3 className="eyebrow text-oak">Explore</h3>
            <ul className="mt-5 space-y-3">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="link-underline text-cream/80 hover:text-cream"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div className="md:col-span-2">
            <h3 className="eyebrow text-oak">Connect</h3>
            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href={site.social.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline inline-flex items-center gap-2 text-cream/80 hover:text-cream"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={site.social.facebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline inline-flex items-center gap-2 text-cream/80 hover:text-cream"
                >
                  <Facebook className="h-4 w-4" />
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="link-underline inline-flex items-center gap-2 text-cream/80 hover:text-cream"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              </li>
              {site.phone && (
                <li>
                  <a
                    href={site.phoneHref}
                    className="link-underline inline-flex items-center gap-2 text-cream/80 hover:text-cream"
                  >
                    <Phone className="h-4 w-4" />
                    {site.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-cream/10 pt-7 text-xs tracking-wide text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CurrentYear fallback={year} /> {site.legalName}. {site.address.city},{' '}
            {site.address.state}.
          </p>
          <p className="font-display text-sm italic text-cream/55">
            Brewed with intention in downtown Fairfield.
          </p>
        </div>
      </div>
    </footer>
  );
}
