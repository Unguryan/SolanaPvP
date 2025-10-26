/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#646cff',
        secondary: '#535bf2',
        accent: '#1a1a1a',
        background: {
          light: '#ffffff',
          dark: '#242424',
        },
        text: {
          light: '#213547',
          dark: 'rgba(255, 255, 255, 0.87)',
        },
        // Solana brand colors
        solana: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Game colors
        game: {
          gold: '#fbbf24',
          silver: '#9ca3af',
          bronze: '#cd7f32',
          win: '#10b981',
          lose: '#ef4444',
          pending: '#f59e0b',
        },
        // Card colors
        card: {
          back: '#1f2937',
          front: '#ffffff',
          selected: '#3b82f6',
          hover: '#f3f4f6',
        }
      },
             animation: {
               'card-flip': 'cardFlip 0.4s ease-in-out',
        'chest-open': 'chestOpen 0.8s ease-out',
        'score-reveal': 'scoreReveal 1s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
             keyframes: {
               cardFlip: {
                 '0%': { transform: 'rotateY(0deg) scale(1)' },
                 '25%': { transform: 'rotateY(-45deg) scale(0.95)' },
                 '50%': { transform: 'rotateY(-90deg) scale(0.9)' },
                 '75%': { transform: 'rotateY(-45deg) scale(0.95)' },
                 '100%': { transform: 'rotateY(0deg) scale(1)' },
               },
        chestOpen: {
          '0%': { transform: 'scale(1) rotate(0deg)' },
          '50%': { transform: 'scale(1.1) rotate(5deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
        scoreReveal: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        '8xl': '88rem',
      }
    },
  },
  plugins: [],
}
