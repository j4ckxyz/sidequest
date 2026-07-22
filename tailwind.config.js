/** @type {import('tailwindcss').Config} */

// Terracotta / clay — the SideQuest + Claude-style accent (matches the logo).
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

export default {
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
        // Warm near-black ink, like Claude's text.
        ink: {
          DEFAULT: '#1f1d1a',
          soft: '#37342f',
          muted: '#6f6a61',
          faint: '#989286',
        },
        // Warm cream paper background.
        paper: {
          DEFAULT: '#faf9f5',
          soft: '#f5f3ec',
          deep: '#efece1',
        },
        clay,
        // Legacy aliases so existing utilities keep working in the new palette.
        jersey: clay,
        sea: clay,
        // Warm neutral scale (taupe-grey) for borders, fills, muted chips.
        granite: {
          50: '#f6f4ef',
          100: '#ece8df',
          200: '#ddd8cc',
          300: '#c6bfb1',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,0.6) inset, 0 10px 34px -14px rgba(80,60,45,0.14)',
        float: '0 22px 55px -22px rgba(80,55,40,0.24)',
        soft: '0 1px 2px 0 rgba(60,45,35,0.05), 0 10px 26px -18px rgba(60,45,35,0.18)',
        redglow: '0 10px 26px -12px rgba(176,84,47,0.42)',
      },
      backdropBlur: {
        xl: '24px',
      },
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
