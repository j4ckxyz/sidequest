/** @type {import('tailwindcss').Config} */

// Jersey red — the brand. Flag red anchored around 600.
const jersey = {
  50: '#fff1f2',
  100: '#ffe1e3',
  200: '#ffc8cd',
  300: '#ff9ba4',
  400: '#fb6270',
  500: '#f23144',
  600: '#d81127', // primary Jersey red
  700: '#b60d20',
  800: '#960f1f',
  900: '#7d1220',
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          DEFAULT: '#0a0a0b',
          soft: '#1d1d1f',
          muted: '#6e6e73',
          faint: '#86868b',
        },
        jersey,
        // Alias so any legacy `sea-*` utility renders in the new brand red.
        sea: jersey,
        granite: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#dee2ea',
          300: '#c4cbd8',
        },
        gold: {
          400: '#f5c451',
          500: '#e8a91e',
          600: '#c9880c',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,0.6) inset, 0 12px 40px -12px rgba(120,15,25,0.16)',
        float: '0 24px 60px -20px rgba(120,18,28,0.28)',
        soft: '0 2px 8px -2px rgba(15,23,42,0.08), 0 12px 30px -18px rgba(15,23,42,0.22)',
        redglow: '0 10px 30px -10px rgba(216,17,39,0.55)',
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
        'xp-fill': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
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
