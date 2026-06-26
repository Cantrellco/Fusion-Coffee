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

function normalize(path: string) {
  if (path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

export default function Header() {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const current = normalize(pathname || '/');

  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Lock scroll while the mobile overlay is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close overlay on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Take the overlay out of the tab order / a11y tree when closed.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    if (open) overlay.removeAttribute('inert');
    else overlay.setAttribute('inert', '');
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

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-edge px-4 pt-3 sm:px-6 md:pt-4">
        {/* Floating black pill bar */}
        <div
          className={`flex h-14 items-center justify-between gap-2 rounded-full border border-white/10 bg-black/90 pl-5 pr-2 backdrop-blur-md transition-shadow duration-500 ease-out-expo md:h-[60px] md:pl-6 ${
            scrolled ? 'shadow-xl shadow-black/30' : 'shadow-lg shadow-black/15'
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
            <a
              href={site.orderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group hidden items-center gap-2 rounded-full bg-brick py-2.5 pl-5 pr-4 text-sm font-medium tracking-wide text-cream transition-colors duration-300 hover:bg-[#9b4128] sm:inline-flex"
            >
              Order now
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

      {/* Mobile overlay */}
      <div
        ref={overlayRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed inset-0 z-50 bg-espresso transition-opacity duration-500 ease-out-expo md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex h-[68px] items-center justify-between px-6">
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

        <nav className="flex flex-col gap-1 px-6 pt-6" aria-label="Mobile primary">
          {nav.map((item, i) => {
            const active = current === normalize(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-baseline justify-between border-b border-cream/10 py-4 font-display text-4xl transition-colors ${
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

        <div className="mt-8 px-6">
          <a
            href={site.orderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brick py-4 text-sm font-medium uppercase tracking-mega text-cream"
          >
            Order now
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <div className="mt-8 flex items-center gap-3 text-cream/70">
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
          <p className="mt-6 font-sans text-sm text-cream/50">{site.address.full}</p>
          <p className="font-sans text-sm text-cream/50">{site.hoursSummary}</p>
        </div>
      </div>
    </header>
  );
}
