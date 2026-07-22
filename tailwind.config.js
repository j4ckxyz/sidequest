/** @type {import('tailwindcss').Config} */
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
        sea: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bcdcff',
          300: '#8ec6ff',
          400: '#59a5ff',
          500: '#2f83f7',
          600: '#1a63e6',
          700: '#164ec4',
          800: '#18419e',
          900: '#193a7d',
        },
        granite: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#dee2ea',
          300: '#c4cbd8',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,0.6) inset, 0 12px 40px -12px rgba(15,23,42,0.18)',
        float: '0 24px 60px -20px rgba(15,23,42,0.28)',
        soft: '0 2px 8px -2px rgba(15,23,42,0.08), 0 12px 30px -18px rgba(15,23,42,0.22)',
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
