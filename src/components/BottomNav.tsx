'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { site } from '@/lib/site';
import { Bag, Bean, Cup, Home, MapPin } from './icons';

/**
 * Mobile app shell: the persistent bottom tab bar (< md only — desktop keeps
 * the floating pill header untouched).
 *
 * Four thumb-reachable destinations plus a raised center "Order" action, the
 * one revenue CTA, in brick so it reads as THE button. The tab set is curated
 * from `nav` rather than mirrored 1:1 — About / Parties / Contact-extras live
 * in the sheet menu behind the top-bar hamburger (and the footer), so nothing
 * we built is lost; the bar stays five items wide like a real tab bar.
 *
 * The bar itself never hides on scroll (native tab bars don't), with one
 * exception: when the on-screen keyboard opens (visualViewport shrinks) we
 * tuck it away so it can't hover mid-screen above the keyboard on Android.
 */

// Left/right tab pairs around the center Order action.
const TABS_LEFT = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Menu', href: '/menu/', icon: Cup },
];
const TABS_RIGHT = [
  { label: 'Shop', href: '/merch/', icon: Bag },
  { label: 'Visit', href: '/contact/', icon: MapPin },
];

function normalize(path: string) {
  if (path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

function Tab({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string;
  href: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => JSX.Element;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-full flex-col items-center justify-center gap-1 transition-colors duration-300 ease-out-expo active:scale-95 motion-reduce:active:scale-100 ${
        // cream/85 (not lower): the liquid glass is more translucent than
        // .glass-dark, so over a cream section the composited fill is
        // lighter — /85 keeps the 11px labels ≥4.5:1 there.
        active ? 'text-oak' : 'text-cream/85'
      }`}
    >
      {/* Active indicator — a soft frosted pill behind the whole tab,
          iOS-tab-bar style (state is also carried by tint + aria-current). */}
      <span
        aria-hidden
        className={`absolute inset-x-1.5 inset-y-2 rounded-[1.25rem] bg-white/[0.09] transition-opacity duration-300 ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <Icon
        className="relative h-[22px] w-[22px]"
        strokeWidth={active ? 1.9 : 1.6}
      />
      <span className="relative text-[11px] font-medium leading-none tracking-wide">
        {label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const current = normalize(pathname || '/');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Hide the bar while the software keyboard is up. On Android Chrome a
  // fixed-bottom element rides on top of the keyboard and covers form fields;
  // visualViewport shrinking well past any browser-chrome change is our
  // keyboard signal. Pinch-zoom ALSO shrinks vv.height, so require scale≈1 —
  // otherwise zooming in hid the tab bar for no reason. Progressive: no
  // visualViewport (old browsers) = no-op.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () =>
      setKeyboardOpen(
        vv.scale <= 1.05 && window.innerHeight - vv.height > 150,
      );
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  return (
    // Floating liquid-glass capsule (iOS-style), not an edge-to-edge bar:
    // inset from both sides, lifted 0.5rem + safe-area off the bottom, fully
    // rounded — echoing the top pill so the shell reads as one system.
    // --tabbar-h (4.5rem) = 4rem capsule + the 0.5rem float gap, so every
    // page clearance keyed to the var stays correct.
    <nav
      aria-label="Quick navigation"
      className={`bottom-tabbar glass-liquid fixed inset-x-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-[55] select-none rounded-[2rem] transition-transform duration-300 ease-out-expo motion-reduce:transition-none md:hidden ${
        keyboardOpen
          ? 'translate-y-[calc(100%+0.5rem+env(safe-area-inset-bottom))]'
          : 'translate-y-0'
      }`}
    >
      <div className="grid h-16 grid-cols-5">
        {TABS_LEFT.map((t) => (
          <Tab key={t.href} {...t} active={current === normalize(t.href)} />
        ))}

        {/* Center Order action — raised brick disc, the tab bar's one accent.
            Routes to the on-site order page (/order). */}
        <div className="relative flex items-end justify-center">
          <Link
            href={site.orderPath}
            className="absolute -top-5 flex h-[58px] w-[58px] flex-col items-center justify-center gap-0.5 rounded-full border border-white/15 bg-brick text-cream shadow-lg shadow-black/40 transition-transform duration-300 ease-out-expo active:scale-95 motion-reduce:active:scale-100"
          >
            <Bean className="h-[22px] w-[22px]" />
            <span className="text-[10px] font-semibold uppercase leading-none tracking-wide">
              Order
            </span>
          </Link>
        </div>

        {TABS_RIGHT.map((t) => (
          <Tab key={t.href} {...t} active={current === normalize(t.href)} />
        ))}
      </div>
    </nav>
  );
}
