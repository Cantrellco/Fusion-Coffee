'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { nav, site } from '@/lib/site';
import NeonLogo from './NeonLogo';
import { ArrowUpRight, Close, Instagram, Facebook, Mail, Menu } from './icons';

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

/**
 * Direction-aware hide for the mobile top bar: tuck away on scroll-down,
 * return on scroll-up, always visible near the top. The 6px dead-zone keeps
 * iOS rubber-band jitter from flickering it. Desktop ignores this entirely —
 * the transform is gated with md:translate-y-0, so the pill never moves.
 * The setter is exposed so keyboard focus can summon the bar back (a hidden
 * bar must never hold invisible focus stops).
 */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 80) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return [hidden, setHidden] as const;
}

function normalize(path: string) {
  if (path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

export default function Header() {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [barHidden, setBarHidden] = useHideOnScroll();
  const [open, setOpen] = useState(false);
  const current = normalize(pathname || '/');

  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  // Sheet drag-to-dismiss (the native bottom-sheet gesture). Dragging is
  // tracked on the grab zone only (handle + logo row) so it never fights the
  // nav list's own scrolling; the live offset is applied as an inline
  // transform that overrides the open/closed class transform mid-gesture.
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const dragStart = useRef(0);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setDragY(0);
    toggleRef.current?.focus();
  }, []);

  // Lock scroll while the mobile sheet is open, and flag the state on <body>
  // so the bottom tab bar (a sibling component) can slide itself away —
  // native sheets take over the whole bottom edge, no bar peeking behind
  // the scrim. See `body.sheet-open .bottom-tabbar` in globals.css.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    document.body.classList.toggle('sheet-open', open);
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('sheet-open');
    };
  }, [open]);

  // Close sheet on route change.
  useEffect(() => {
    setOpen(false);
    setDragY(0);
  }, [pathname]);

  // While the sheet is open, everything BEHIND it goes inert — the Tab trap
  // below only guards the edges, but sequential-focus isn't the only way out
  // (screen-reader reading order, find-in-page, programmatic focus). The
  // sheet itself is inert-when-closed declaratively in its JSX, so the
  // exported HTML is already correct without JS.
  useEffect(() => {
    if (!open) return;
    const behind = document.querySelectorAll<HTMLElement>(
      'main, footer, nav[aria-label="Quick navigation"]',
    );
    const pill = pillRef.current;
    behind.forEach((el) => el.setAttribute('inert', ''));
    pill?.setAttribute('inert', '');
    return () => {
      behind.forEach((el) => el.removeAttribute('inert'));
      pill?.removeAttribute('inert');
    };
  }, [open]);

  // If the viewport crosses into md while the sheet is open (tablet rotate,
  // window resize), the sheet's markup goes display:none but `open` — and the
  // body scroll-lock — would linger: a desktop page you can never scroll.
  // Close it the moment the breakpoint flips.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [open]);

  // When open: move focus in, trap Tab, close on Escape.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key !== 'Tab') return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const items = overlay.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeMenu]);

  const onGrabTouchStart = (e: React.TouchEvent) => {
    dragging.current = true;
    dragStart.current = e.touches[0].clientY;
  };
  const onGrabTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    // Only downward drags move the sheet; upward stays pinned.
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onGrabTouchEnd = () => {
    dragging.current = false;
    if (dragY > 90) closeMenu();
    else setDragY(0);
  };
  // The OS can cancel a touch mid-drag (notification shade, app switch,
  // incoming call). Without this the sheet stays stranded at the last drag
  // offset until the next touch — spring it back instead of dismissing.
  const onGrabTouchCancel = () => {
    dragging.current = false;
    setDragY(0);
  };

  return (
    // pointer-events-none so this (invisible) full-width fixed strip never
    // blocks taps on content beneath — especially once the mobile bar has
    // tucked itself away on scroll. Interactive children re-enable their own.
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div
        ref={pillRef}
        // Keyboard focus summons the tucked-away bar back: without this, a
        // hidden bar's logo + hamburger were invisible tab stops.
        onFocusCapture={() => setBarHidden(false)}
        className={`mx-auto max-w-edge px-4 pt-3 transition-transform duration-500 ease-out-expo motion-reduce:transition-none sm:px-6 md:pt-4 ${
          barHidden && !open
            ? '-translate-y-[130%] md:translate-y-0'
            : 'translate-y-0'
        }`}
      >
        {/* Floating black pill bar */}
        <div
          className={`glass-dark pointer-events-auto mx-auto flex h-14 w-full max-w-full items-center justify-between gap-2 rounded-full border border-white/10 pl-5 pr-2 transition-[box-shadow,height] duration-500 ease-out-expo motion-reduce:transition-none md:w-fit md:gap-6 md:pl-6 ${
            scrolled
              ? 'shadow-xl shadow-black/30 md:h-[54px]'
              : 'shadow-lg shadow-black/15 md:h-[60px]'
          }`}
        >
          <Link
            href="/"
            aria-label={`${site.name} home`}
            className="flex shrink-0 items-center"
          >
            <NeonLogo width={58} priority />
          </Link>

          {/* Desktop pill selector */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Primary"
          >
            {nav.map((item) => {
              const active = current === normalize(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full px-4 py-2 text-[0.9rem] tracking-wide transition-colors duration-300 ease-out-expo ${
                    active
                      ? 'bg-cream text-ink'
                      : 'text-cream/75 hover:bg-white/10 hover:text-cream'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Desktop-only: on mobile the bottom tab bar's raised brick disc
                owns "Order" — one clear CTA per surface, and the compact top
                bar keeps just brand + menu. */}
            <a
              href={site.orderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group hidden items-center gap-2 rounded-full bg-brick py-2 pl-4 pr-3 text-sm font-medium tracking-wide text-cream transition-colors duration-300 hover:bg-[#9b4128] sm:py-2.5 sm:pl-5 sm:pr-4 md:inline-flex"
            >
              Order
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors hover:bg-white/10 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sheet menu — slides up from the bottom like a native sheet.
          Holds the full nav (incl. About / Parties / Contact, which have no
          bottom tab), the Order CTA, socials and shop facts. */}
      <div
        ref={overlayRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        // Declarative inert so the STATIC EXPORT ships the closed sheet out
        // of the tab order / a11y tree — an effect-only inert left no-JS and
        // pre-hydration keyboard users tabbing through ~10 invisible controls
        // inside a phantom modal. React 18 passes the string through; its DOM
        // typings just don't know the attribute yet.
        // @ts-expect-error — inert missing from React 18 DOM typings
        inert={open ? undefined : ''}
        className={`fixed inset-0 z-[70] md:hidden ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Scrim — tap to dismiss */}
        <div
          aria-hidden
          onClick={closeMenu}
          className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-500 ease-out-expo motion-reduce:transition-none ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Panel */}
        <div
          // .sheet-max-h (globals.css) = 86vh with an 86svh override, so
          // engines without svh cap the sheet instead of letting it overrun
          // the viewport past the close button.
          className={`sheet-max-h absolute inset-x-0 bottom-0 overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-t border-white/10 bg-espresso pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-18px_60px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-out-expo motion-reduce:transition-none ${
            open ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={
            dragY > 0
              ? { transform: `translateY(${dragY}px)`, transition: 'none' }
              : undefined
          }
        >
          {/* Grab zone: drag handle + logo row */}
          <div
            onTouchStart={onGrabTouchStart}
            onTouchMove={onGrabTouchMove}
            onTouchEnd={onGrabTouchEnd}
            onTouchCancel={onGrabTouchCancel}
            className="touch-none"
          >
            <div
              aria-hidden
              className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-cream/20"
            />
            <div className="flex items-center justify-between px-6 pb-1 pt-3">
              <NeonLogo width={58} />
              <button
                ref={closeRef}
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors hover:bg-white/10"
              >
                <Close className="h-6 w-6" />
              </button>
            </div>
          </div>

          <nav className="flex flex-col px-6 pt-2" aria-label="Mobile primary">
            {nav.map((item, i) => {
              const active = current === normalize(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-baseline justify-between border-b border-cream/10 py-3.5 font-display text-[1.65rem] transition-colors active:text-oak ${
                    active ? 'text-oak' : 'text-cream'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-sans text-xs tracking-mega text-cream/35">
                    0{i + 1}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 px-6">
            <a
              href={site.orderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brick py-4 text-sm font-medium uppercase tracking-mega text-cream active:scale-[0.985] motion-reduce:active:scale-100"
            >
              Order now
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <div className="mt-6 flex items-center gap-3 text-cream/70">
              <a
                href={site.social.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-cream"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={site.social.facebook.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-cream"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href={`mailto:${site.email}`}
                aria-label="Email"
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-cream"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
            <p className="mt-5 font-sans text-sm text-cream/50">
              {site.address.full}
            </p>
            <p className="font-sans text-sm text-cream/50">
              {site.hoursSummary}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
