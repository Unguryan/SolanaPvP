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
        // Live Arena color scheme
        bg: "#0B0B0B",
        txt: {
          base: "#E5E5E5",
          muted: "#8A8A8A",
        },
        sol: {
          purple: "#9945FF",
          mint: "#14F195",
        },
        // Legacy colors for compatibility
        primary: '#9945FF',
        secondary: '#14F195',
        accent: '#0B0B0B',
        background: {
          light: '#ffffff',
          dark: '#0B0B0B',
        },
        text: {
          light: '#213547',
          dark: '#E5E5E5',
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
          win: '#14F195',
          lose: '#ef4444',
          pending: '#f59e0b',
        },
        // Card colors
        card: {
          back: '#1f2937',
          front: '#ffffff',
          selected: '#9945FF',
          hover: '#f3f4f6',
        }
      },
      boxShadow: {
        glow: "0 0 24px rgba(153,69,255,.35), 0 0 12px rgba(20,241,149,.25), 0 0 8px rgba(153,69,255,.2)",
        'glow-purple': "0 0 20px rgba(153,69,255,.4), 0 0 8px rgba(153,69,255,.3)",
        'glow-mint': "0 0 20px rgba(20,241,149,.4), 0 0 8px rgba(20,241,149,.3)",
        'glow-strong': "0 0 40px rgba(153,69,255,.5), 0 0 20px rgba(20,241,149,.3), 0 0 12px rgba(153,69,255,.4)",
      },
      borderRadius: {
        xl: "12px",
        '2xl': "16px",
      },
      animation: {
        'card-flip': 'cardFlip 0.4s ease-in-out',
        'chest-open': 'chestOpen 0.8s ease-out',
        'score-reveal': 'scoreReveal 1s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-breath': 'pulseBreath 5s ease-in-out infinite',
        'fade-slide': 'fadeSlide 0.3s ease-out',
        'ticker-scroll': 'tickerScroll 30s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
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
        },
        pulseBreath: {
          '0%, 100%': { 
            opacity: '1',
            boxShadow: '0 0 20px rgba(153,69,255,.3), 0 0 10px rgba(20,241,149,.2)'
          },
          '50%': { 
            opacity: '0.9',
            boxShadow: '0 0 30px rgba(153,69,255,.5), 0 0 15px rgba(20,241,149,.3)'
          },
        },
        fadeSlide: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tickerScroll: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        'display': ['Orbitron', 'Inter', 'system-ui', 'sans-serif'],
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
