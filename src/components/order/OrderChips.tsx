'use client';

import { useEffect, useRef, useState } from 'react';

// ============================================================
// Sticky category rail for /order (< lg only — the desktop two-column layout
// is untouched).
//
// The order menu is 8 categories and 39 items. Before this the only way to
// reach "Sandwiches" was to scroll past everything else. Same component
// shape as MenuChips on /menu — a glass pill rail with an IntersectionObserver
// scroll-spy — with two additions the longer list needs: the rail scrolls the
// active chip into view (8 chips overflow a 390px screen), and a tap suppresses
// the spy briefly so the highlight doesn't flicker through every section the
// smooth-scroll passes on the way.
// ============================================================

// Long headings that would blow out the rail. Anything not listed rides as-is.
const SHORT: Record<string, string> = {
  'Summer Drinks': 'Summer',
  'Summer Food': 'Summer Eats',
  'Breakfast Sandwiches': 'Breakfast',
};

export default function OrderChips({
  sections,
}: {
  sections: { id: string; heading: string }[];
}) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? '');
  const passedRef = useRef<Map<string, boolean>>(new Map());
  const railRef = useRef<HTMLElement>(null);
  // Set while a chip-tap's smooth scroll is in flight.
  const lockRef = useRef(false);
  const lockTimer = useRef<number>();

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    const passed = passedRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (lockRef.current) return;
        for (const e of entries) {
          passed.set(
            e.target.id,
            e.isIntersecting || e.boundingClientRect.top < 96,
          );
        }
        let current = sections[0]?.id ?? '';
        for (const s of sections) if (passed.get(s.id)) current = s.id;
        setActive(current);
      },
      // A section claims the highlight once its top rises into the upper
      // portion of the screen — not the moment it peeks in from the bottom.
      { rootMargin: '-96px 0px -55% 0px' },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [sections]);

  // Keep the active chip visible in an overflowing rail.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !active) return;
    const chip = rail.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!chip) return;
    const railBox = rail.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    if (chipBox.left < railBox.left + 8 || chipBox.right > railBox.right - 8) {
      rail.scrollTo({
        left: chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [active]);

  function onChipClick(id: string) {
    setActive(id);
    lockRef.current = true;
    window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => {
      lockRef.current = false;
    }, 700);
  }

  useEffect(() => () => window.clearTimeout(lockTimer.current), []);

  return (
    // No negative margins: this sits INSIDE the already-padded grid cell, and
    // a bleed-to-the-edge `-mx-5` makes the element wider than its track —
    // which, because grid children default to `min-width:auto`, blew the whole
    // page out to 836px on a 390px screen.
    <div className="sticky top-[max(0.75rem,env(safe-area-inset-top))] z-40 mb-8 lg:hidden">
      <nav
        ref={railRef}
        aria-label="Menu sections"
        className="glass-dark no-scrollbar w-full overflow-x-auto rounded-full border border-white/10 p-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <ul className="flex w-max min-w-full items-stretch gap-1">
          {sections.map((s) => (
            <li key={s.id} className="flex">
              <a
                href={`#${s.id}`}
                data-chip={s.id}
                onClick={() => onChipClick(s.id)}
                aria-current={active === s.id ? 'true' : undefined}
                className={`flex min-h-[44px] select-none items-center justify-center whitespace-nowrap rounded-full px-4 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition duration-300 ease-out-expo active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  active === s.id
                    ? 'bg-cream text-ink'
                    : 'text-cream/75 hover:text-cream'
                }`}
              >
                {SHORT[s.heading] ?? s.heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
