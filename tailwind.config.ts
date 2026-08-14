import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:   { DEFAULT: '#16161a', soft: '#5f5e5a', faint: '#8b8a85' },
        paper: { DEFAULT: '#faf9f6', card: '#ffffff', sunk: '#f2f1ec' },
        line:  '#e4e2db',
        teamA: { DEFAULT: '#BA7517', soft: '#FAEEDA', ink: '#633806' },
        teamB: { DEFAULT: '#0F6E56', soft: '#E1F5EE', ink: '#04342C' },
        win:   '#639922',
      },
      fontFamily: { sans: ['ui-sans-serif','system-ui','-apple-system','Segoe UI','Roboto','sans-serif'] },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
} satisfies Config;
