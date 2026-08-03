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
        instance = await payments.card();
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
      <div
        id="sq-card"
        className="min-h-[52px] rounded-lg border border-ink/15 bg-cream px-3 py-2"
      />
      <button
        type="button"
        onClick={pay}
        disabled={!ready || busy}
        className="mt-3 flex w-full items-center justify-center rounded-full bg-brick py-4 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-[#9b4128] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Processing…' : ready ? `Pay ${amountLabel}` : 'Loading secure card form…'}
      </button>
      <p className="mt-2 text-center text-xs text-ink-muted">
        Secured by Square. Card details never touch this site.
      </p>
    </div>
  );
}
