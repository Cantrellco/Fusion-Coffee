'use client';

import { useEffect, useState } from 'react';
import { site, shopOpenStatus, type OpenStatus as Status } from '@/lib/site';

/**
 * "Open now / Closed" pill. Answers a coffee shop's #1 question on-site instead
 * of bouncing the visitor to Google. SSR-safe like CurrentYear: server + first
 * client render show the static hours summary (also the no-JS fallback); after
 * mount it resolves live status in the SHOP's timezone (never the visitor's),
 * refreshing each minute so it can't go stale on a long-lived static export.
 *
 * The clock + hours math is shared with the /order checkout gate and the
 * checkout function — see src/lib/hours.ts.
 */
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
    const update = () => setStatus(shopOpenStatus());
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
