import { logo, site } from '@/lib/site';

/**
 * The real white-neon "Fusion Coffee" sign. The source file is white-on-black
 * and is never altered — `mix-blend-mode: screen` (via .neon-logo) drops the
 * black backing on dark surfaces so only the glowing tube shows.
 *
 * MUST sit on a dark surface (ink / espresso / dark photo) to read correctly.
 */
// Tight-cropped neon wordmark is 1070 x 772 (≈ 1.386 : 1).
const LOGO_W = 1070;
const LOGO_H = 772;

export default function NeonLogo({
  className = '',
  width = 132,
  priority = false,
}: {
  className?: string;
  width?: number;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.neon}
      alt={`${site.name} — neon sign logo`}
      width={width}
      height={Math.round((width * LOGO_H) / LOGO_W)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`neon-logo select-none ${className}`}
      style={{ width, height: 'auto' }}
      draggable={false}
    />
  );
}
