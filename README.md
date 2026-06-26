# Fusion Coffee

Marketing website for **Fusion Coffee** — a specialty coffee shop in the heart of downtown Fairfield, Illinois.

Warm, editorial, and photography-forward, built from the shop's own moodboard (cream, brick, terracotta, oak, sage). It's a fully static site, structured so it can later be wrapped into a native iOS/Android app with no rewrite.

## Stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS**
- Static export (`output: 'export'`) — deploys anywhere
- Type: **Fraunces** (display) + **Hanken Grotesk** (body)
- Installable **PWA** (web manifest + icon set)

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site → ./out
```

## Structure

- `src/app` — pages (Home, Menu, Order, About, Contact, Merch) + layout, 404, manifest
- `src/components` — Header (black pill nav), Footer, Reveal, NeonLogo, VisitBlock, …
- `src/lib/site.ts` — single source of truth for shop content (address, hours, socials, menu)
- `public/` — photography, neon logo, app icons, OG share image

## Notes

- The white neon **logo is the brand mark and is kept as-is**.
- **Order now** currently links to the existing Square online ordering (`site.orderUrl`); a full in-site ordering flow is a future step.
