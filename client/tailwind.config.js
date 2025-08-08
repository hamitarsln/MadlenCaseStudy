/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFC300',
          foreground: '#111111',
          50: '#FFF9E6',
          100: '#FFF1BF',
          200: '#FFE680',
          300: '#FFDB40',
          400: '#FFD01A',
          500: '#FFC300',
          600: '#CC9C00',
          700: '#997500',
          800: '#664E00',
          900: '#332700'
        },
        dark: '#0D0D0D',
        accent: '#FFEE32',
      },
      fontFamily: {
        display: ['"Archivo Black"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 0 3px rgba(255,195,0,0.35)',
        neon: '0 0 10px #FFC300, 0 0 30px rgba(255,195,0,0.4)'
      },
      keyframes: {
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,195,0,0.6)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255,195,0,0)' }
        }
      },
      animation: {
        pulseGlow: 'pulseGlow 2.8s infinite'
      }
    }
  },
  plugins: [],
};
