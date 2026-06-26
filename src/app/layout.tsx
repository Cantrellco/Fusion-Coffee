import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { site } from '@/lib/site';

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
    'A curated coffee experience in the heart of downtown Fairfield, Illinois. Specialty espresso, matcha, açaí bowls and a warm, welcoming space. Skip the line — order online.',
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
    type: 'website',
    title: 'Fusion Coffee — Downtown Fairfield, Illinois',
    description:
      'Specialty coffee, matcha & açaí in a warm, welcoming space in downtown Fairfield, IL.',
    siteName: 'Fusion Coffee',
    locale: 'en_US',
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: 'Fusion Coffee — specialty coffee in downtown Fairfield, Illinois',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fusion Coffee — Downtown Fairfield, Illinois',
    description:
      'Specialty coffee, matcha & açaí in a warm, welcoming space in downtown Fairfield, IL.',
    images: ['/og.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
      </body>
    </html>
  );
}
