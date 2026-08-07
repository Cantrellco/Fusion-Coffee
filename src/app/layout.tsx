import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import { site, photos, jsonLd, ogBase } from '@/lib/site';

const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.fusioncoffeeshop.com'),
  title: {
    default: 'Fusion Coffee — Downtown Fairfield, Illinois',
    template: '%s · Fusion Coffee',
  },
  description:
    'A curated coffee experience in downtown Fairfield, Illinois. Specialty espresso, matcha, açaí bowls and a warm, welcoming space. Skip the line — order online.',
  alternates: { canonical: '/' },
  keywords: [
    'Fusion Coffee',
    'Fairfield Illinois coffee',
    'coffee shop Fairfield IL',
    'espresso',
    'matcha',
    'açaí bowls',
    'cold brew',
  ],
  openGraph: {
    ...ogBase,
    url: '/',
    title: 'Fusion Coffee — Downtown Fairfield, Illinois',
    description:
      'Specialty coffee, matcha & açaí in a warm, welcoming space in downtown Fairfield, IL.',
  },
  // No explicit twitter title/description: cards fall back to each page's own
  // og tags, so shares stop previewing every page as the homepage.
  twitter: {
    card: 'summary_large_image',
  },
  // iOS ignores the web-app manifest for standalone installs — these meta tags
  // are the only way "Add to Home Screen" gets an app title and a dark,
  // content-under-status-bar chrome that matches themeColor.
  appleWebApp: {
    capable: true,
    title: 'Fusion',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Draw edge-to-edge on notched phones so the fixed bottom tab bar can pad
  // itself with env(safe-area-inset-bottom) instead of floating above a
  // letterboxed white strip.
  viewportFit: 'cover',
  themeColor: '#1E1E1E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {/* LocalBusiness + Menu structured data — powers the Google "open now /
            hours / call" panel and rich results. Built from src/lib/site.ts so it
            can never drift from the rendered page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
        />
        {/* Mark JS as available before paint so scroll-reveals only hide when
            they can actually be revealed (no-JS users see everything). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
        >
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        {/* Mobile app shell: persistent bottom tab bar (< md only). */}
        <BottomNav />
      </body>
    </html>
  );
}
