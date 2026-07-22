'use client';

import { useEffect, useRef, useState } from 'react';

// Section order matters: the scroll-spy resolves "active" as the LAST section
// in this list the reader has reached, so it must mirror document order.
const SECTIONS = [
  { id: 'summer', label: 'Summer' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'eats', label: 'Eats' },
] as const;

/**
 * Mobile-only sticky category chips for the ~4000px single-scroll /menu page —
 * the "native app" tab strip that keeps all four menu sections one tap away.
 *
 * Sticky offset: `top-[max(0.75rem,env(safe-area-inset-top))]`, NOT the top
 * bar's full height. The shell's top bar hides on scroll-down — exactly when
 * someone is reading the menu — so reserving its height would strand the strip
 * mid-air most of the time. Instead the strip owns the top edge (12px inset,
 * or the notch inset when larger) and sits at z-40, one layer BELOW the top
 * bar (z-50): when the bar returns on scroll-up it glides over the strip
 * rather than colliding with it. Jump-target offsets are handled separately
 * by each section's scroll-mt, which DOES reserve the bar's height for the
 * worst case (bar visible after an upward scroll).
 *
 * No-JS fallback (same discipline as Reveal): the chips are plain <a href="#…">
 * anchors and the server-rendered markup is complete — JS only *moves* the
 * highlight. Without JS the first chip stays highlighted and every chip still
 * jumps via native anchor behavior + the global scroll-behavior:smooth.
 */
export default function MenuChips() {
  // First section highlighted on the server render too — deterministic markup,
  // no hydration mismatch, and a sensible resting state for no-JS readers.
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  // Per-section "reader has reached this" flags, persisted across callbacks —
  // IO only reports the entries that crossed a boundary, so the rest must keep
  // their last-known state.
  const passedRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    // Ancient browsers: no observer, chips stay plain anchor links (still work).
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    const passed = passedRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // A section counts as "reached" while it intersects the band, OR
          // once its top has scrolled past the band's top edge (the anchor
          // for #summer is a zero-height div, so the top-edge check is what
          // keeps Summer marked long after the point-sized anchor leaves).
          passed.set(e.target.id, e.isIntersecting || e.boundingClientRect.top < 72);
        }
        let current: string = SECTIONS[0].id;
        for (const s of SECTIONS) if (passed.get(s.id)) current = s.id;
        setActive(current);
      },
      // The band: viewport minus 72px at the top (≈ the 4.5rem top-bar zone,
      // matching the sections' scroll-mt so a chip-tap lands "active") and
      // minus 55% at the bottom, so a section only claims the highlight once
      // its top rises into the upper 45% of the screen — not the moment it
      // peeks in at the bottom. threshold 0 (default) is enough: we recompute
      // from the persisted flags on every boundary crossing.
      { rootMargin: '-72px 0px -55% 0px' },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <div className="sticky top-[max(0.75rem,env(safe-area-inset-top))] z-40 px-5 md:hidden">
      <nav
        aria-label="Menu sections"
        className="glass-dark no-scrollbar mx-auto max-w-md overflow-x-auto rounded-full border border-white/10 p-1"
        // Hide the scrollbar cross-engine: .no-scrollbar (globals.css) covers
        // the WebKit pseudo-element; Firefox + old Edge via inline style.
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <ul className="flex w-max min-w-full items-stretch gap-1">
          {SECTIONS.map((s) => (
            <li key={s.id} className="flex flex-1">
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? 'true' : undefined}
                className={`flex min-h-[44px] flex-1 select-none items-center justify-center whitespace-nowrap rounded-full px-4 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition duration-300 ease-out-expo active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  active === s.id
                    ? 'bg-cream text-ink'
                    : 'text-cream/75 hover:text-cream'
                }`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
