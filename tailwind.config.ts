import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#061729', 800: '#0A2340', 700: '#123A63', 600: '#1B5390' },
        ice:  { DEFAULT: '#EEF2F7', card: '#FFFFFF', sunk: '#F5F7FA' },
        line: { DEFAULT: '#E2E8F0', strong: '#CBD5E1' },
        ink:  { DEFAULT: '#0F172A', soft: '#5A6B82', faint: '#94A3B8' },
        teamA: { DEFAULT: '#D92D2D', soft: '#FDECEC', ink: '#7F1616' },
        teamB: { DEFAULT: '#1668D6', soft: '#E8F1FD', ink: '#0B3E85' },
        win:  '#16A34A',
        gold: '#D9A404',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: [
          'Barlow Condensed', 'Archivo Narrow', 'Oswald',
          'Arial Narrow', 'Helvetica Neue', 'ui-sans-serif', 'system-ui', 'sans-serif',
        ],
      },
      borderRadius: { xl2: '16px' },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 2px 8px rgba(15,23,42,.04)',
        lift: '0 8px 24px rgba(10,35,64,.18)',
      },
      backgroundImage: {
        'navy-grad': 'linear-gradient(135deg, #0A2340 0%, #123A63 55%, #1B5390 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
