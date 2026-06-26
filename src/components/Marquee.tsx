import { Bean } from './icons';

/**
 * Infinite scrolling editorial strip. Content is duplicated so the -50%
 * keyframe loops seamlessly. Pauses on hover; static under reduced motion.
 */
export default function Marquee({
  items,
  className = '',
}: {
  items: string[];
  className?: string;
}) {
  const sequence = [...items, ...items];
  return (
    <div
      className={`group flex overflow-hidden border-y border-ink/10 bg-latte/60 py-5 ${className}`}
      aria-hidden
    >
      <div className="flex shrink-0 animate-marquee items-center group-hover:[animation-play-state:paused]">
        {sequence.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="px-7 font-display text-xl italic text-ink/80 md:text-2xl">
              {item}
            </span>
            <Bean className="h-4 w-4 text-brick/70" />
          </span>
        ))}
      </div>
    </div>
  );
}
