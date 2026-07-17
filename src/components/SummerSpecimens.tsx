/* ============================================================
   Summer specimen sketches — one tiny hand-drawn illustration
   per summer-menu item, keyed by the item's exact name in
   site.ts. Same fine-stroke pen language as Botanical/Citrus,
   multi-tone in the shop palette (oak/terracotta/brick/sage/
   olive). Rendered faint in the specimen card's bottom-right
   corner. Purely decorative: wrappers are aria-hidden.
   Unmapped items fall back to the generic citrus/sprig mark
   in SummerMenu.
   ============================================================ */

const specimens: Record<string, JSX.Element> = {
  'Blueberry Latte': (
      <svg className="h-full w-full" viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path stroke="#5C6B55" strokeWidth="1.9" d="M19 15 C24 20 29 26 33 33 C34 34.7 35 36.4 36 38"/>
      <path stroke="#5C6B55" strokeWidth="1.7" d="M29.9 28 C34.7 23.6 40.3 23.1 44.9 25.4 C40.3 29 34.6 29.9 29.9 28 Z"/>
      <g stroke="#5C6B55" strokeWidth="1.6">
      <path d="M36 38 C35.5 40 34.9 42 34.2 44"/>
      <path d="M36 38 C40 39.5 44 43 47.4 47"/>
      <path d="M36 38 C37.4 42.8 38.9 47.8 40.3 52.7"/>
      <path d="M31.4 27.6 C35.4 26 39.4 25.5 42.8 25.9"/>
      </g>
      <path stroke="#7A8F73" strokeWidth="1.7" d="M23.6 19.8 C26.2 14.2 30.2 11 35.2 10 C31.6 15.6 27.4 18.9 23.6 19.8 Z"/>
      <path stroke="#7A8F73" strokeWidth="1.6" d="M24.9 18.7 C27.7 15.4 30.6 12.8 33.6 11.2"/>
      <g stroke="#B24E34" strokeWidth="1.9">
      <path d="M26.8 49.9 A5.8 5.6 0 1 1 38.2 49.1 A5.7 5.9 0 1 1 26.8 49.9"/>
      <path d="M46.1 51.5 A6.5 6.3 0 1 1 58.9 50.5 A6.4 6.6 0 1 1 46.1 51.5"/>
      <path d="M36.6 58.4 A5.5 5.3 0 1 1 47.4 57.6 A5.4 5.6 0 1 1 36.6 58.4"/>
      </g>
      <g stroke="#B24E34" strokeWidth="1.6">
      <path d="M52.8 57.5 A4.3 4.3 0 1 0 58.8 52.6"/>
      <path d="M31.6 53.5 L31.6 54.4 M30.7 52.8 L29.2 53.3 M31 51.7 L30.1 50.4 M32.2 51.7 L33.1 50.4 M32.6 52.8 L34 53.3"/>
      <path d="M55.6 53.9 L56.1 54.7 M54.4 53.7 L53.4 54.9 M54.2 52.6 L52.8 52 M55.2 52 L55.4 50.5 M56.1 52.8 L57.6 52.5"/>
      <path d="M42.9 61.9 L42.9 62.6 M42 61.2 L40.5 61.7 M42.3 60.1 L41.4 58.8 M43.5 60.1 L44.4 58.8 M43.9 61.2 L45.3 61.7"/>
      </g>
      </svg>
  ),
  'Banana Pudding Latte': (
      <svg className="h-full w-full" viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M24 34C22 50 38 64 60 52" stroke="#D6B187" strokeWidth="2"/>
      <path d="M24 34C30 44 44 52 60 52" stroke="#D6B187" strokeWidth="2"/>
      <path d="M27 40C27 48 39 55.5 52 52.5" stroke="#D6B187" strokeWidth="1.6"/>
      <path d="M24 34C23.2 32 23.2 30.2 24.2 28.4M22.8 28.6C23.6 27.4 25.2 27.2 26 28.2" stroke="#5C6B55" strokeWidth="1.8"/>
      <path d="M60 52C61.6 52.4 62.8 53.6 63.4 55.4" stroke="#5C6B55" strokeWidth="1.8"/>
      <path d="M38.4 31.2A7.2 7.2 0 1 1 52.8 31.2A7.2 7.5 8 1 1 38.4 31.2" stroke="#D07A53" strokeWidth="1.9"/>
      <path d="M44.8 27.1L46.4 27M41.4 30.7L41.9 29.2M49.3 29.2L49.8 30.7M42.5 34.1L43.8 35.1M48.7 34.1L47.4 35.1" stroke="#D07A53" strokeWidth="1.6"/>
      </svg>
  ),
  'Root Beer Float Flash Brew': (
      <svg className="h-full w-full" viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke="#D6B187">
      <path d="M34 26.5 C34.4 38 35.5 50 36.9 61.5" strokeWidth="2"/>
      <path d="M58 26.5 C57.6 38 56.5 50 55.1 61.5" strokeWidth="2"/>
      <path d="M36.9 61.5 C40.5 63.8 51.5 63.8 55.1 61.5" strokeWidth="2"/>
      <path d="M36.6 41.5 C40.5 40.2 51.5 40.2 55.4 41.5" strokeWidth="1.7"/>
      <path d="M37.6 46 C38 51 38.4 55.5 39 58.5" strokeWidth="1.6"/>
      </g>
      <g stroke="#D07A53">
      <path d="M33 29 C30.5 27.5 30 22 33.5 20 C35 15 41.5 14.5 44 17.5 C46.5 12.5 54.5 13 56.5 17.5 C60 18.5 60.8 24.5 58.5 27.5" strokeWidth="2"/>
      <path d="M58.5 27.5 C60 28.5 60 31 58.6 31.8" strokeWidth="1.8"/>
      <path d="M52.5 7 A2 2 0 0 1 56.5 7 A2.1 1.9 0 0 1 52.5 7" strokeWidth="1.6"/>
      <path d="M58.2 11.5 A1.3 1.3 0 0 1 60.8 11.5 A1.4 1.2 0 0 1 58.2 11.5" strokeWidth="1.6"/>
      </g>
      <g stroke="#B24E34" strokeWidth="1.9">
      <path d="M32.5 4.5 L39 15.8"/>
      <path d="M34.6 3.3 L41.1 14.6"/>
      <path d="M32.5 4.5 Q33.2 3.2 34.6 3.3"/>
      </g>
      </svg>
  ),
  'Cereal Milk Latte': (
      <svg className="h-full w-full" viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M25 42 C26 51 33 57.5 42.5 57.5 C52 57.5 58.8 51 60 42" stroke="#D6B187" strokeWidth="2"/>
      <path d="M25 42 C32 45.4 53 45.4 60 42" stroke="#D6B187" strokeWidth="1.8"/>
      <path d="M13.4 26.8 C9.8 26.5 6.8 23.6 7.2 20.2 C7.5 17.2 10.7 16.5 12.5 19.1 C14.1 21.4 14.4 24.7 13.4 26.8" stroke="#D6B187" strokeWidth="1.8"/>
      <path d="M13.6 27.2 C17.4 32 22 37.2 27.2 41.8" stroke="#D6B187" strokeWidth="1.8"/>
      <path d="M29.4 20.5 C29.2 15.6 36.5 15.3 36.6 20.1 C36.7 24.9 29.7 25.2 29.4 20.5" stroke="#D07A53" strokeWidth="1.7"/>
      <path d="M31.5 20.2 C31.5 18.2 34.5 18.1 34.5 20.1 C34.5 22.1 31.6 22.2 31.5 20.2" stroke="#D07A53" strokeWidth="1.6"/>
      <path d="M41.5 13.7 C41.4 9.6 47.5 9.5 47.5 13.5 C47.5 17.5 41.7 17.7 41.5 13.7" stroke="#7A8F73" strokeWidth="1.7"/>
      <path d="M43.2 13.6 C43.2 11.9 45.8 11.8 45.8 13.5 C45.8 15.2 43.3 15.3 43.2 13.6" stroke="#7A8F73" strokeWidth="1.6"/>
      <path d="M49.7 25.3 C49.5 20.4 56.8 20.1 56.9 24.9 C57 29.7 50 30 49.7 25.3" stroke="#D07A53" strokeWidth="1.7"/>
      <path d="M51.8 25.1 C51.8 23.1 54.8 23 54.8 25 C54.8 27 51.9 27.1 51.8 25.1" stroke="#D07A53" strokeWidth="1.6"/>
      <path d="M37.3 32.4 C37.1 28.1 43.6 27.9 43.7 32.1 C43.8 36.3 37.6 36.6 37.3 32.4" stroke="#7A8F73" strokeWidth="1.7"/>
      <path d="M39.1 32.2 C39.1 30.3 41.9 30.2 41.9 32.1 C41.9 34 39.2 34.1 39.1 32.2" stroke="#7A8F73" strokeWidth="1.6"/>
      <path d="M45.6 42.5 C45.5 39.2 48.1 37.9 50.3 38.7 C52.3 39.4 53.1 41.2 52.8 42.8" stroke="#D07A53" strokeWidth="1.7"/>
      </svg>
  ),
  'Piña Colada Lemonade': (
      <svg className="h-full w-full" viewBox="0 0 64 64" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M37.4 31 C34 28.8 30.6 26.6 27.4 24.6 C31.2 25.4 34.8 27.6 37.9 30.1 Z" stroke="#7A8F73" strokeWidth="1.8"/><path d="M38.6 30.8 C36.2 26.2 33.8 21.6 31.6 17.6 C35 20.6 37.9 25.4 39.6 30.5 Z" stroke="#5C6B55" strokeWidth="1.8"/><path d="M40.8 30.6 C39.6 24.5 40 18.5 41.8 14 C43.6 18.5 43.8 24.5 43 30.6 Z" stroke="#7A8F73" strokeWidth="1.8"/><path d="M44.6 30.5 C46.6 25.8 49 21.2 51.8 17.4 C50 22 47.6 26.6 45.4 30.8 Z" stroke="#5C6B55" strokeWidth="1.8"/><path d="M46.4 30.2 C49.6 27.6 53.2 25.4 56.6 24.2 C53.6 26.8 50.2 29 47.2 30.9 Z" stroke="#7A8F73" strokeWidth="1.8"/><path d="M42.4 30.6 C49.8 30.2 55.2 37 54.9 46.2 C54.6 55.4 49.6 61.9 42 62.1 C34.6 62.3 29.3 55.2 29.4 46.2 C29.5 37.4 35 31 42.4 30.6 Z" stroke="#D6B187" strokeWidth="2"/><path d="M33.5 36 C41 39.5 48.5 45 53.5 51" stroke="#D6B187" strokeWidth="1.6"/><path d="M30.5 45.5 C37.5 49 44 54.5 47.5 60.2" stroke="#D6B187" strokeWidth="1.6"/><path d="M51 36 C43.5 39.5 36 45 31 51" stroke="#D6B187" strokeWidth="1.6"/><path d="M54 45.5 C47 49.5 40 54.5 37 60.2" stroke="#D6B187" strokeWidth="1.6"/></svg>
  ),
  'Dragon Fruit Lemonade': (
      <svg className="h-full w-full" viewBox="0 0 64 64" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g stroke="#7A8F73" strokeWidth="1.8">
      <path d="M29 38.6 C26.2 36.2 24.3 32.5 23.9 28.1 C27.5 30.5 29.6 34.1 30.3 38.2 Z"/>
      <path d="M29.2 51 C25.9 49.9 23.2 47.4 21.9 43.7 C25.8 44.8 28.7 47.3 30.3 50.5 Z"/>
      <path d="M53.2 38.4 C55.5 34.9 57 31 57.9 26.8 C54.5 29.4 52.7 33.3 52.2 37.8 Z"/>
      <path d="M53 49.9 C56.1 49.1 58.8 47.1 60.4 44 C56.9 44.5 54.2 46.4 52.3 49 Z"/>
      <path d="M44.6 27.6 C46 24.6 47.4 21.9 49 19.6 C49.2 23.1 48 26.2 46.1 28.3 Z"/>
      <path d="M37.5 27.4 C35.9 24.9 34.6 22.5 33.5 19.9 C32.9 23.4 34 26.3 36.1 28.2 Z"/>
      </g>
      <path stroke="#B24E34" strokeWidth="2" d="M41 26.7 C47.6 26.8 53.6 33.6 54.1 42.6 C54.3 51.8 48.4 59.1 41.1 59.3 C33.7 59.4 27.9 52 27.8 43.1 C27.7 34.2 33.6 26.6 41 26.7 Z"/>
      <path stroke="#D07A53" strokeWidth="1.6" d="M31.6 50.4 C30.8 45.5 30.9 40.2 32.8 35.6 C34.6 31.5 37.6 29.7 41 29.7 C45.3 29.6 48.6 32.6 50.1 37.4 C51.4 41.7 51.5 46.2 50.5 50.6"/>
      <path stroke="#B24E34" strokeWidth="1.7" d="M37.6 38.2h.01M43.4 36.8h.01M46.8 42.2h.01M40.6 43.6h.01M35.6 45.4h.01M44.2 48.8h.01M39 51h.01"/>
      </svg>
  ),
  'Peach Cobbler Yogurt Bowl': (
      <svg className="h-full w-full" viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke="#D07A53" strokeWidth="2">
      <path d="M42.2 31.8C40.8 29.8 36.4 29.6 33.2 31.8 30 34 28.3 39.2 28.6 44.2 29 51.4 34.4 58.2 42 59.2 42.8 59.3 43.8 59.3 44.6 59.2"/>
      <path d="M43.4 32C45 29.8 49.4 29.7 52.6 31.9 55.9 34.2 57.7 39 57.4 44.2 57 51.2 52.2 57.6 45.4 59"/>
      </g>
      <g stroke="#B24E34" strokeWidth="1.8">
      <path d="M42.9 33.2C46.2 38.6 46.8 47 43.6 55.2"/>
      <path d="M22.6 56.8C23.5 56.3 24.6 56.3 25.5 56.7"/>
      <path d="M28.8 61C29.7 60.5 30.8 60.5 31.7 60.9"/>
      </g>
      <g stroke="#7A8F73" strokeWidth="1.8">
      <path d="M42.8 31.4C42.4 29.4 42.7 27.4 43.6 25.6"/>
      <path d="M44.2 26.6C47 23.4 51.2 21.9 54.4 22.8 53.4 26.2 49.6 28.6 45.7 28.3 44.8 28.2 44.3 27.6 44.2 26.6Z"/>
      <path strokeWidth="1.6" d="M45.6 26.4C48.4 24.8 51 23.9 53 23.4"/>
      </g>
      </svg>
  ),
  'Summer Affogato': (
      <svg className="h-full w-full" viewBox="0 0 64 64" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M61 5.5C59.4 8.6 57.2 11.4 54.4 13.6" stroke="#B24E34" strokeWidth="1.8"/><path d="M53.2 15.2L52.6 16.4" stroke="#B24E34" strokeWidth="1.6"/><path d="M31 30C29.4 23.2 32.8 17.6 38.4 18.6C40.4 14.6 47.4 14.1 49.9 17.6C55 17.1 58 22.6 55.6 30" stroke="#7A8F73" strokeWidth="1.8"/><path d="M36.8 23.6C38.4 25.6 41.6 26.1 43.7 24.6" stroke="#7A8F73" strokeWidth="1.6"/><path d="M33 35.4C38.8 38 48 37.2 53 34.2" stroke="#B24E34" strokeWidth="1.6"/><path d="M29 31C30 40 36 44 43 44C50 44 56 40 57 31" stroke="#D6B187" strokeWidth="1.8"/><path d="M43 44V55" stroke="#D6B187" strokeWidth="1.8"/><path d="M36 58.5C38.5 56 47.5 56 50 58.5" stroke="#D6B187" strokeWidth="1.8"/></svg>
  ),
};

/** The sketch for a summer item, or null if none is drawn yet. */
export function specimenFor(name: string): JSX.Element | null {
  return specimens[name] ?? null;
}
