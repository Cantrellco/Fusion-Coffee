import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Pulled straight from the shop's own color-scheme board.
        cream: '#F3EDE2',
        latte: '#E6D8C3',
        oak: '#D6B187',
        brick: '#B24E34',
        terracotta: '#D07A53',
        sage: '#7A8F73',
        olive: '#5C6B55',
        concrete: '#C8C3BB',
        ink: '#1E1E1E',
        // Supporting tones derived for depth / contrast.
        espresso: '#171411',
        'cream-deep': '#EAE0D0',
        'ink-soft': '#2A2724',
        // Accessible secondary text on cream/cream-deep (>=4.5:1 AA).
        'ink-muted': '#5A5855',
        // Darker brick for small text/eyebrows on light surfaces (>=4.5:1 AA).
        'brick-deep': '#A3442D',
      },
      fontFamily: {
        // Wired to next/font CSS variables (see app/layout.tsx).
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Fluid type scale for editorial headlines.
        'fluid-sm': 'clamp(0.95rem, 0.9rem + 0.3vw, 1.05rem)',
        'fluid-lg': 'clamp(1.25rem, 1.1rem + 0.8vw, 1.6rem)',
        'fluid-xl': 'clamp(1.8rem, 1.4rem + 2vw, 3rem)',
        'fluid-2xl': 'clamp(2.6rem, 1.8rem + 4vw, 5.5rem)',
        'fluid-3xl': 'clamp(3.4rem, 2rem + 7vw, 9rem)',
      },
      letterSpacing: {
        ultra: '0.42em',
        mega: '0.28em',
      },
      maxWidth: {
        edge: '1380px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        // iOS sheet presentation curve (Ionic's, the one vaul settled on).
        // Front-loaded: it covers ~90% of the travel in the first ~45% of the
        // duration, so 500ms reads as "arrives in 230ms and settles" rather
        // than slow. ease-out-expo is too abrupt for a modal surface — it
        // snaps. Used by the order sheets only.
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        'neon-flicker': {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.72' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.86' },
          '97%': { opacity: '1' },
        },
        // Slow ambient hero "breath": one pass, settles at 1.04 (not infinite —
        // a looping scale reads as a GIF). Pure CSS, so the global reduced-motion
        // clamp disables it for free.
        'hero-drift': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.04)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // Soft entrance for revealed panels (e.g. the checkout card step).
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Party calendar's month swap. The slide direction arrives as
        // --slide-from so one keyframe covers paging both ways; the grid is
        // keyed by month, so React remounts it and the animation replays.
        'month-in': {
          '0%': { opacity: '0', transform: 'translateX(var(--slide-from, 0))' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // The orbit's "scroll to spin" cue. Replaces Tailwind's stock
        // animate-bounce, which is a 1s springy hop that belongs to a starter
        // template, not to this page. This is a slow 4px breath on an
        // easeInOutSine curve — an invitation, not a nudge. Infinite is correct
        // here (unlike hero-drift): it must persist until the visitor acts, and
        // it only exists while !started, i.e. before the scrub does any work.
        'orbit-breath': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(4px)' },
        },
        // Placeholder shimmer while the Square card iframe loads.
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        // The order pill's count reacts when something lands in the cart —
        // the one piece of add-to-cart feedback that isn't a transient toast.
        'cart-bump': {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.28)' },
          '100%': { transform: 'scale(1)' },
        },
        // Item sheet dismissing: the row it came from pulses once so the
        // customer sees WHERE the drink went.
        'row-flash': {
          '0%': { backgroundColor: 'rgba(122, 143, 115, 0)' },
          '30%': { backgroundColor: 'rgba(122, 143, 115, 0.16)' },
          '100%': { backgroundColor: 'rgba(122, 143, 115, 0)' },
        },
      },
      animation: {
        'neon-flicker': 'neon-flicker 6s linear infinite',
        'hero-drift': 'hero-drift 22s ease-out forwards',
        marquee: 'marquee 38s linear infinite',
        'fade-up': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'month-in': 'month-in 0.26s cubic-bezier(0.16, 1, 0.3, 1) both',
        'orbit-breath': 'orbit-breath 2.9s cubic-bezier(0.37, 0, 0.63, 1) infinite',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'cart-bump': 'cart-bump 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
        'row-flash': 'row-flash 0.9s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
