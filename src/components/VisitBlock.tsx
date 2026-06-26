import { site } from '@/lib/site';
import { ArrowUpRight, MapPin } from './icons';
import Reveal from './Reveal';

const mapsDirections = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  `${site.name}, ${site.address.full}`,
)}`;

const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(
  `${site.name}, ${site.address.full}`,
)}&z=16&output=embed`;

export default function VisitBlock() {
  return (
    <div className="grid overflow-hidden border border-ink/12 bg-cream md:grid-cols-2">
      {/* Hours + address */}
      <div className="order-2 p-8 sm:p-12 md:order-1">
        <p className="eyebrow text-brick">Hours</p>
        <ul className="mt-6 divide-y divide-ink/10">
          {site.hours.map((h) => {
            const closed = !h.open;
            return (
              <li
                key={h.day}
                className="flex items-center justify-between py-3 text-base"
              >
                <span className="font-display text-lg text-ink">{h.day}</span>
                <span
                  className={`tracking-wide ${
                    closed ? 'text-brick-deep' : 'text-ink/65'
                  }`}
                >
                  {closed ? 'Closed' : `${h.open} – ${h.close}`}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brick" />
          <div>
            <p className="font-display text-lg leading-snug text-ink">
              {site.address.street}
            </p>
            <p className="text-ink-muted">
              {site.address.city}, {site.address.state} {site.address.zip}
            </p>
          </div>
        </div>

        <a
          href={mapsDirections}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-8 inline-flex items-center gap-2 border border-ink/25 px-6 py-3 text-sm font-medium tracking-wide text-ink transition-colors duration-300 hover:bg-ink hover:text-cream"
        >
          Get directions
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>

      {/* Map */}
      <div className="order-1 min-h-[320px] border-b border-ink/12 md:order-2 md:min-h-full md:border-b-0 md:border-l">
        <Reveal className="h-full">
          <iframe
            title={`Map to ${site.name}`}
            src={mapEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full min-h-[320px] w-full grayscale-[0.25] contrast-[1.02]"
          />
        </Reveal>
      </div>
    </div>
  );
}
