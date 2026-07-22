'use client';

import { useEffect, useState } from 'react';
import { site, openStatusFor, type OpenStatus as Status } from '@/lib/site';

/**
 * "Open now / Closed" pill. Answers a coffee shop's #1 question on-site instead
 * of bouncing the visitor to Google. SSR-safe like CurrentYear: server + first
 * client render show the static hours summary (also the no-JS fallback); after
 * mount it resolves live status in the SHOP's timezone (never the visitor's),
 * refreshing each minute so it can't go stale on a long-lived static export.
 */
function nowInShop(): { weekday: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: site.timezone,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // some engines emit "24" at midnight under hour12:false
  return { weekday: get('weekday'), minutes: hour * 60 + parseInt(get('minute'), 10) };
}

export default function OpenStatus({
  tone = 'light',
  className = '',
}: {
  /** 'light' = cream text for dark surfaces; 'dark' = ink text for light surfaces. */
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const update = () => {
      const { weekday, minutes } = nowInShop();
      setStatus(openStatusFor(weekday, minutes));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const text = tone === 'light' ? 'text-cream/85' : 'text-ink/80';
  const ring = tone === 'light' ? 'border-cream/20' : 'border-ink/15';
  const base = `inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm tracking-wide ${ring} ${text} ${className}`;

  // Fallback (pre-hydration / no JS): the static summary, no live dot.
  if (!status) {
    return <span className={base}>{site.hoursSummary}</span>;
  }

  const dot = status.open ? 'bg-sage' : 'bg-brick';
  return (
    <span className={base} aria-live="polite">
      <span className="relative flex h-2 w-2 shrink-0">
        {status.open && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage/70 motion-reduce:hidden" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {status.label}
    </span>
  );
}
