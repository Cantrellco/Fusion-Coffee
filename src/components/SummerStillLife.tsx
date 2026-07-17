/* ============================================================
   Summer still-life — "Lemon Branch, Low Sun". The one seasonal
   spot illustration: an arcing lemon branch with tapered leaves,
   a hanging lemon, a detached half slice, two eucalyptus sprigs
   and a tiny low sun. Same fine-stroke pen language as
   Botanical/Citrus, but multi-tone (olive stems, sage leaves,
   terracotta fruit, oak sun) — the summer lift over the site's
   single-tone motifs. Purely decorative: always aria-hidden.
   ============================================================ */

export default function SummerStillLife({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      className={className}
    >
      {/* tiny low sun, upper left — oak */}
      <g stroke="#D6B187" strokeWidth={2.4}>
        <path d="M20 28 C20 22, 24 18, 30 18 C36 18, 40 22, 40 28" />
        <path d="M25 28 C25 24, 27 22, 30 22 C33 22, 35 24, 35 28" />
        <path d="M30 13 L30 7" />
        <path d="M37 16 L40.5 11" />
        <path d="M23 16 L19.5 11" />
        <path d="M42 21 L47 18" />
        <path d="M18 21 L13 18" />
      </g>
      {/* stems + olive under-leaves */}
      <g stroke="#5C6B55" strokeWidth={2.6}>
        <path d="M48 104 C86 92, 126 78, 164 70 C184 66, 200 62, 214 60" />
        <path d="M89 91 C92 94, 95 97, 96 101" />
        <path d="M118 82 C128 86, 134 95, 136 106 C126 100, 119 92, 118 82 Z" />
        <path d="M178 67 C187 71, 193 79, 196 90 C186 84, 179 78, 178 67 Z" />
        <path d="M34 146 C38 137, 44 128, 52 118" />
        <path d="M206 140 C211 132, 217 124, 225 116" />
      </g>
      {/* sage leaves: lemon branch */}
      <g stroke="#7A8F73" strokeWidth={2.6}>
        <path d="M77 95 C86 89, 92 78, 93 64 C83 72, 77 83, 77 95 Z" />
        <path d="M140 75 C149 69, 156 58, 158 46 C148 54, 141 63, 140 75 Z" />
        <path d="M196 63 C203 59, 207 52, 208 42 C201 49, 196 54, 196 63 Z" />
        <path d="M214 60 C221 55, 227 52, 232 51 C226 56, 220 59, 214 60 Z" />
      </g>
      {/* sage leaves: eucalyptus sprig, lower left */}
      <g stroke="#7A8F73" strokeWidth={2.2}>
        <path d="M37 139 C32 140, 28 138, 26 134 C30 133.5, 34 136, 37 139 Z" />
        <path d="M37 139 C42 139, 46 141, 48 145 C44 145.5, 39 143, 37 139 Z" />
        <path d="M42 132 C37 133, 33 131, 31 127 C35 126.5, 39 129, 42 132 Z" />
        <path d="M42 132 C47 132, 51 134, 53 138 C49 138.5, 44 136, 42 132 Z" />
        <path d="M46 125 C41 125.5, 38 123, 36 119 C40 119, 43 121.5, 46 125 Z" />
        <path d="M46 125 C51 125, 55 126.5, 57 130 C53 130.5, 49 128, 46 125 Z" />
        <path d="M52 118 C54 114.5, 57 112, 60 111 C58 114.5, 55 117, 52 118 Z" />
      </g>
      {/* sage leaves: eucalyptus sprig, lower right */}
      <g stroke="#7A8F73" strokeWidth={2.2}>
        <path d="M210 134 C205 135, 201 133, 199 129 C203 128.5, 207 131, 210 134 Z" />
        <path d="M210 134 C215 134, 219 136, 221 140 C217 140.5, 212 138, 210 134 Z" />
        <path d="M214 128 C209 129, 205 127, 203 123 C207 122.5, 211 125, 214 128 Z" />
        <path d="M214 128 C219 128, 223 130, 225 134 C221 134.5, 216 132, 214 128 Z" />
        <path d="M219 122 C214 122.5, 211 120, 209 116 C213 116, 216 118.5, 219 122 Z" />
        <path d="M219 122 C224 122, 228 123.5, 230 127 C226 127.5, 222 125, 219 122 Z" />
        <path d="M225 116 C227 112.5, 230 110, 233 109 C231 112.5, 228 115, 225 116 Z" />
      </g>
      {/* whole lemon on the branch — terracotta */}
      <g stroke="#D07A53" strokeWidth={2.6}>
        <path d="M82 117 C81 108, 88 102, 97 101 C106 100, 113 104, 115 111 C118 112, 119 115, 116 117 C112 124, 104 128, 96 127 C88 126, 83 123, 82 117 Z" />
        <path d="M88 113 C87 109, 90 105, 94 104" strokeWidth={2.2} />
      </g>
      {/* detached half slice resting below — terracotta */}
      <g stroke="#D07A53" strokeWidth={2.6}>
        <path d="M153 125 C154 136, 162 143, 171 143 C180 143, 187 135, 188 124 C177 123, 164 123.5, 153 125 Z" />
        <path d="M158 125.5 C159 133, 164 138, 171 138 C178 138, 183 132, 184 124.5" strokeWidth={2.2} />
        <path d="M170.5 126 C170.5 131, 171 136, 171 140.5" strokeWidth={2.3} />
        <path d="M169 126 C165.5 129.5, 161.5 133, 158.5 136.5" strokeWidth={2.3} />
        <path d="M172 126 C175.5 129.5, 179.5 132.5, 182.5 135.5" strokeWidth={2.3} />
      </g>
    </svg>
  );
}
