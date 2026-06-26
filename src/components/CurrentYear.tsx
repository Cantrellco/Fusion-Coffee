'use client';

import { useEffect, useState } from 'react';

/**
 * Renders the build-time year on the server (so SSG + first client render
 * match), then corrects to the visitor's actual current year after mount —
 * so the © line never goes stale on a long-lived static export.
 */
export default function CurrentYear({ fallback }: { fallback: number }) {
  const [year, setYear] = useState(fallback);
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  return <>{year}</>;
}
