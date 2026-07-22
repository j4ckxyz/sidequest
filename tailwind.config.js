/** @type {import('tailwindcss').Config} */

// Terracotta / clay — the SideQuest + Claude-style accent (matches the logo).
// Fixed across light/dark; it reads well on both.
const clay = {
  50: '#f9f1ec',
  100: '#f1ddd0',
  200: '#e5bda4',
  300: '#d69b77',
  400: '#c9835a',
  500: '#bf6a41',
  600: '#b0542f', // primary
  700: '#8f4526',
  800: '#733a23',
  900: '#5f301f',
}

// Semantic tokens driven by CSS variables (see index.css :root / .dark),
// so the whole UI themes automatically.
const v = (name) => `rgb(var(${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
        serif: ['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      colors: {
        ink: {
          DEFAULT: v('--ink'),
          soft: v('--ink-soft'),
          muted: v('--ink-muted'),
          faint: v('--ink-faint'),
        },
        paper: {
          DEFAULT: v('--paper'),
          soft: v('--paper-soft'),
          deep: v('--paper-deep'),
        },
        // Card / raised surface (white in light, warm charcoal in dark).
        surface: v('--surface'),
        // Hairline colour, always used with an alpha (e.g. border-line/10).
        line: v('--line'),
        clay,
        jersey: clay,
        sea: clay,
        granite: {
          50: v('--granite-50'),
          100: v('--granite-100'),
          200: v('--granite-200'),
          300: v('--granite-300'),
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,0.5) inset, 0 10px 34px -14px rgba(30,22,16,0.18)',
        float: '0 22px 55px -22px rgba(25,18,12,0.34)',
        soft: '0 1px 2px 0 rgba(30,22,16,0.06), 0 10px 26px -18px rgba(30,22,16,0.22)',
        redglow: '0 10px 26px -12px rgba(176,84,47,0.42)',
      },
      backdropBlur: { xl: '24px' },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 2.4s linear infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
