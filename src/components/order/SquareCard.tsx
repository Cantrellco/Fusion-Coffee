'use client';

import { useEffect, useRef, useState } from 'react';

// ============================================================
// Square Web Payments SDK card form.
//
// Square renders the actual card fields inside its OWN iframe (loaded from
// Square's CDN), so raw card numbers never touch this site — that's what keeps
// the shop at the simplest PCI level. On "Pay", the SDK tokenizes the card into
// a single-use token; we hand that token to /api/checkout, where the serverless
// function does the real charge with the secret access token.
//
// The `style` passed to card() themes Square's iframe to match the site (cream
// field, ink text, brick focus) so it doesn't look like a bolted-on default.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Square?: any;
  }
}

const SDK_SRC = {
  sandbox: 'https://sandbox.web.squarecdn.com/v1/square.js',
  production: 'https://web.squarecdn.com/v1/square.js',
} as const;

// Themes the Square-hosted card iframe to the site's palette (tailwind tokens).
const CARD_STYLE = {
  input: {
    color: '#1E1E1E',
    backgroundColor: '#F3EDE2',
    fontSize: '16px',
  },
  'input::placeholder': { color: '#8a7c6b' },
  '.input-container': {
    borderColor: '#D8CFC0',
    borderRadius: '12px',
  },
  '.input-container.is-focus': { borderColor: '#B24E34' },
  '.input-container.is-error': { borderColor: '#B24E34' },
  '.message-text.is-error': { color: '#B24E34' },
  '.message-icon.is-error': { color: '#B24E34' },
};

function loadSquare(env: 'sandbox' | 'production'): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.Square) return resolve(window.Square);
    const src = SDK_SRC[env];
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Square));
      existing.addEventListener('error', () => reject(new Error('sdk')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(window.Square);
    s.onerror = () => reject(new Error('sdk'));
    document.head.appendChild(s);
  });
}

function Lock({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2.2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cream/40 border-t-cream" />
  );
}

export default function SquareCard({
  appId,
  locationId,
  env,
  amountLabel,
  onPaid,
  onError,
}: {
  appId: string;
  locationId: string;
  env: 'sandbox' | 'production';
  amountLabel: string;
  onPaid: (sourceId: string) => void;
  onError: (message: string) => void;
}) {
  const card = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: any = null;
    (async () => {
      try {
        const Square = await loadSquare(env);
        if (cancelled || !Square) return;
        const payments = Square.payments(appId, locationId);
        instance = await payments.card({ style: CARD_STYLE });
        await instance.attach('#sq-card');
        card.current = instance;
        if (!cancelled) setReady(true);
      } catch {
        onError('Could not load the secure card form. Refresh and try again.');
      }
    })();
    return () => {
      cancelled = true;
      try {
        instance?.destroy?.();
      } catch {
        /* already gone */
      }
    };
  }, [appId, locationId, env, onError]);

  async function pay() {
    if (!card.current || busy) return;
    setBusy(true);
    try {
      const result = await card.current.tokenize();
      if (result.status === 'OK') {
        onPaid(result.token as string);
      } else {
        onError(
          result.errors?.[0]?.message ||
            'That card was declined — check the details and try again.',
        );
        setBusy(false);
      }
    } catch {
      onError('The payment could not be processed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-ink">
        <Lock className="h-4 w-4 text-sage" />
        Pay with card
      </div>

      {/* Card field. The Square iframe fades in over a shimmer skeleton so it
          never pops in blank. min-height reserves the row to avoid a jump. */}
      <div className="relative min-h-[52px]">
        <div
          id="sq-card"
          className={`transition-opacity duration-500 ease-out ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {!ready && (
          <div
            aria-hidden
            className="absolute inset-0 overflow-hidden rounded-xl border border-ink/10 bg-cream"
          >
            <div className="flex h-full items-center gap-3 px-4">
              <div className="h-3.5 flex-1 rounded-full bg-ink/[0.07]" />
              <div className="h-3.5 w-12 rounded-full bg-ink/[0.07]" />
              <div className="h-3.5 w-10 rounded-full bg-ink/[0.07]" />
            </div>
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/45 to-transparent motion-reduce:animate-none" />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={pay}
        disabled={!ready || busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brick py-4 text-sm font-medium tracking-wide text-cream transition-[background-color,transform] duration-300 ease-out-expo hover:bg-[#9b4128] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:active:scale-100"
      >
        {busy ? (
          <>
            <Spinner />
            Processing…
          </>
        ) : !ready ? (
          'Loading…'
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Pay {amountLabel}
          </>
        )}
      </button>

      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
        <Lock className="h-3 w-3" />
        Secured by Square · card details never touch this site
      </p>
    </div>
  );
}
