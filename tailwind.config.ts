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
      },
      animation: {
        'neon-flicker': 'neon-flicker 6s linear infinite',
        'hero-drift': 'hero-drift 22s ease-out forwards',
        marquee: 'marquee 38s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
