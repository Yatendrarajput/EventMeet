/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base:     '#0a0a0f',
        surface:  '#13131a',
        elevated: '#1c1c27',
        border:   '#2a2a3a',
        violet: {
          DEFAULT: '#7c3aed',
          light:   '#9f67ff',
          dark:    '#5b21b6',
        },
        pink: {
          DEFAULT: '#e94560',
          light:   '#ff6b84',
          dark:    '#c73050',
        },
        text: {
          primary:   '#f1f0ff',
          secondary: '#8b8a9b',
          disabled:  '#4a4a5a',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error:   '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card':   '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'violet': '0 0 20px rgba(124,58,237,0.3)',
        'pink':   '0 0 20px rgba(233,69,96,0.3)',
        'glow':   '0 0 40px rgba(124,58,237,0.15)',
      },
      backgroundImage: {
        'gradient-violet': 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
        'gradient-pink':   'linear-gradient(135deg, #e94560 0%, #c73050 100%)',
        'gradient-brand':  'linear-gradient(135deg, #7c3aed 0%, #e94560 100%)',
        'gradient-card':   'linear-gradient(180deg, rgba(28,28,39,0) 0%, rgba(10,10,15,0.9) 100%)',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
