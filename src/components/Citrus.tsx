import type { SVGProps } from 'react';

/* ============================================================
   Citrus — the one seasonal motif that extends the site's
   hand-drawn botanical thread into summer. Same fine-stroke
   "pen" language as Botanical.tsx (currentColor, round caps),
   drawn at two scales: a tiny slice for labels/eyebrows and a
   large low-sun arc for a faint corner wash. Line-only — never
   a filled bright disc — so it always reads editorial, never
   cheap. Purely decorative: always aria-hidden.
   ============================================================ */

// Local pen so this motif stays self-contained (Botanical's pen is module-private).
const pen = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

/**
 * A small half-citrus slice — outer rind arc, inner pith arc and radiating
 * segment lines. Reads cleanly at eyebrow / label size.
 */
export function CitrusSlice(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={1.3} {...pen} {...props}>
      {/* half-round rind, flat side down */}
      <path d="M2.5 16 A 9.5 9.5 0 0 1 21.5 16 Z" />
      {/* inner pith arc */}
      <path d="M5 16 A 7 7 0 0 1 19 16" />
      {/* segment dividers */}
      <path d="M12 16 V 6.6" />
      <path d="M12 16 L 6.5 9.4" />
      <path d="M12 16 L 17.5 9.4" />
    </svg>
  );
}

/**
 * A large, faint citrus-arc that doubles as a low summer sun — concentric
 * arcs with a few radiating rays. Used at low opacity behind the header only.
 */
export function CitrusArc(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" strokeWidth={1.2} {...pen} {...props}>
      <path d="M8 88 A 52 52 0 0 1 112 88" />
      <path d="M22 88 A 38 38 0 0 1 98 88" />
      <path d="M36 88 A 24 24 0 0 1 84 88" />
      {/* radiating rays — a 5-ray fan so the mark reads unmistakably as a sun */}
      <path d="M60 88 V 28" />
      <path d="M60 88 L 24 44" />
      <path d="M60 88 L 96 44" />
      <path d="M60 88 L 40 34" />
      <path d="M60 88 L 80 34" />
    </svg>
  );
}
