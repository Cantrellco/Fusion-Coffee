import type { SVGProps } from 'react';

/* ============================================================
   Botanical motifs — the greenery thread that runs through the
   whole site. Hand-drawn line art in the shop's sage/olive, in
   the same fine-stroke language as the icon set (currentColor),
   so every motif recolors cleanly and stays editorial rather
   than heavy. Purely decorative: always aria-hidden.
   ============================================================ */

const pen = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

/**
 * A small olive sprig — a slender stem with a tip bud and two pairs of
 * tapered leaves. Clean enough to read at tiny (eyebrow) sizes. The base
 * motif most of the site reuses.
 */
export function Sprig(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={1.4} {...pen} {...props}>
      <path d="M12 22 C 11.4 17 12.4 12 11.8 5.5" />
      <path d="M11.8 5.5 C 10.7 4.1 10.8 2.3 12.2 1.4 C 12.8 2.9 12.6 4.4 11.8 5.5 Z" />
      <path d="M12 15.4 C 9.2 16.7 5.7 15.2 4.4 11.3 C 7.6 11.9 10.4 13 12 15.4 Z" />
      <path d="M12 14.6 C 14.8 15.7 18.2 14.1 19.4 10.2 C 16.2 10.9 13.5 12.1 12 14.6 Z" />
      <path d="M11.9 9.8 C 9.6 10.8 6.9 9.5 5.9 6.3 C 8.5 6.9 10.7 7.8 11.9 9.8 Z" />
      <path d="M11.9 9.2 C 14.1 10.1 16.8 8.7 17.8 5.5 C 15.3 6.2 13.1 7.3 11.9 9.2 Z" />
    </svg>
  );
}

/**
 * A fuller eucalyptus sprig — curved stem, tip bud and four pairs of
 * veined, tapering leaves. Used where there's room for more detail
 * (larger divider sprigs, corner washes).
 */
export function EucalyptusSprig(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" strokeWidth={1.3} {...pen} {...props}>
      <path d="M33 60 C 31 50 33.5 41 32.5 32 C 31.6 24 33 16 31.5 7" />
      <path d="M31.5 7 C 30 4.5 30.4 1.8 32.4 1 C 33.1 3.4 32.8 5.8 31.5 7 Z" />
      <path d="M32.8 50 C 27 53 19.5 50.5 15 43 C 21 44.5 28 46 32.8 50 Z" />
      <path d="M32.8 50 L 17.5 44.2" />
      <path d="M32.6 47 C 38 50 45.5 47.5 50 40 C 44 41.5 37 43 32.6 47 Z" />
      <path d="M32.6 47 L 48 41.2" />
      <path d="M32.5 40 C 27.5 42.6 21 40.5 17.5 34 C 22.6 35.2 28.4 36.6 32.5 40 Z" />
      <path d="M32.5 40 L 19.6 35.1" />
      <path d="M32.4 37 C 37.4 39.6 43.9 37.5 47.4 31 C 42.3 32.2 36.5 33.6 32.4 37 Z" />
      <path d="M32.4 37 L 45.3 32.1" />
      <path d="M32.4 30 C 28.2 32 22.8 30.2 20 24.8 C 24.2 25.8 29 27 32.4 30 Z" />
      <path d="M32.4 30 L 21.7 25.8" />
      <path d="M32.3 27.4 C 36.5 29.4 41.9 27.6 44.7 22.2 C 40.5 23.2 35.7 24.4 32.3 27.4 Z" />
      <path d="M32.3 27.4 L 43 23.2" />
      <path d="M32.2 20.5 C 29 22 25 20.6 23 16.6 C 26.1 17.4 29.6 18.3 32.2 20.5 Z" />
      <path d="M32.2 20.5 L 24.3 17.3" />
      <path d="M32.1 18.4 C 35.3 19.9 39.3 18.5 41.3 14.5 C 38.2 15.3 34.7 16.2 32.1 18.4 Z" />
      <path d="M32.1 18.4 L 40 15.2" />
    </svg>
  );
}

/**
 * A graceful fern frond — an arched spine with delicate leaflets that
 * taper to a curled tip. The most "alive" motif; used for corner washes.
 */
export function FernFrond(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" strokeWidth={1.1} {...pen} {...props}>
      <path d="M9 60 C 18 52 27 40 33 27 C 37.5 17 40 9 41 4" />
      <path d="M41 4 C 39.3 5 38.4 7 38.8 9.4 C 40.6 8.6 41.6 6.7 41 4 Z" />
      <path d="M13.5 56.4 C 11 51.5 11 46 13.8 41.5" />
      <path d="M15.2 53.8 C 19.6 52.6 24.6 53.4 28.4 56.6" />
      <path d="M16.8 49.6 C 14.7 45 15 39.9 17.6 35.8" />
      <path d="M18.4 47.4 C 22.4 46.1 27 46.8 30.4 49.7" />
      <path d="M20.6 42.8 C 18.9 38.7 19.4 34.1 21.8 30.4" />
      <path d="M22.2 40.8 C 25.8 39.6 29.9 40.3 32.9 42.9" />
      <path d="M25 35.6 C 23.7 32.1 24.4 28 26.6 24.8" />
      <path d="M26.4 33.9 C 29.5 32.8 33.1 33.5 35.7 35.8" />
      <path d="M29.6 28 C 28.7 25 29.5 21.5 31.4 18.8" />
      <path d="M30.8 26.5 C 33.4 25.6 36.5 26.3 38.7 28.3" />
      <path d="M33.8 20.4 C 33.2 18 34 15.1 35.6 12.9" />
      <path d="M34.8 19.2 C 36.9 18.5 39.4 19.1 41.2 20.8" />
    </svg>
  );
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';
type Motif = 'fern' | 'eucalyptus' | 'sprig';

const cornerPos: Record<Corner, string> = {
  tl: 'left-0 top-0 -translate-x-[14%] -translate-y-[16%] -rotate-[28deg]',
  tr: 'right-0 top-0 translate-x-[14%] -translate-y-[16%] rotate-[28deg]',
  bl: 'left-0 bottom-0 -translate-x-[14%] translate-y-[16%] -rotate-[152deg]',
  br: 'right-0 bottom-0 translate-x-[14%] translate-y-[16%] rotate-[152deg]',
};

const motifs: Record<Motif, (p: SVGProps<SVGSVGElement>) => JSX.Element> = {
  fern: FernFrond,
  eucalyptus: EucalyptusSprig,
  sprig: Sprig,
};

/**
 * A faint botanical tucked into a section corner. Hidden on small screens
 * to avoid clutter; sits behind content and ignores pointer events. Parent
 * must be `relative` (and usually `overflow-hidden`); content above it
 * should carry `relative z-10`.
 */
export function CornerBotanical({
  position = 'tr',
  className = '',
  size = 'h-44 w-44',
  tone = 'text-sage/[0.22]',
  motif = 'fern',
}: {
  position?: Corner;
  className?: string;
  size?: string;
  tone?: string;
  motif?: Motif;
}) {
  const Motif = motifs[motif];
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-0 hidden select-none sm:block ${cornerPos[position]} ${tone} ${className}`}
    >
      <Motif className={size} />
    </div>
  );
}

/**
 * A centered divider: a sprig flanked by hairlines that fade into the
 * background. The greenery counterpart to the plain `.hairline`.
 */
export function LeafDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-sage/45" />
      <Sprig className="h-6 w-6 shrink-0 text-sage" />
      <span className="h-px flex-1 bg-gradient-to-r from-sage/45 to-transparent" />
    </div>
  );
}

/**
 * A small inline sprig for eyebrows / labels — pairs with the existing
 * brick eyebrow rules to add a touch of green.
 */
export function SprigMark({ className = 'h-4 w-4 text-sage' }: { className?: string }) {
  return <Sprig className={className} aria-hidden />;
}
