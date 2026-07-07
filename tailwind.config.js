// tailwind.config.js
const {nextui} = require("@nextui-org/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        accent: ['Fraunces', '"Instrument Serif"', 'serif'],
      },
      backgroundImage: theme => ({
        'gradient-purple': 'linear-gradient(97deg, #A56E1E 0%, #C48425 100%)',
      }),
      colors: {
        ds: {
          bg:      'var(--c-bg)',
          surface: 'var(--c-surface)',
          muted:   'var(--c-surface-muted)',
          sunken:  'var(--c-surface-sunken)',
          ink:     'var(--c-text-primary)',
          ink2:    'var(--c-text-secondary)',
          ink3:    'var(--c-text-tertiary)',
          brand:   'var(--c-brand-primary)',
          tint:    'var(--c-brand-primary-tint)',
          gold:    'var(--c-brand-gold)',
          'gold-tint': 'var(--c-brand-gold-tint)',
        },
      },
    },
  },
  darkMode: "class",
  plugins: [nextui({
    themes: {
      light: {
        colors: {
          primary: {
            DEFAULT: "#C48425",
            foreground: "#FFFFFF",
            50:  '#FBF4E4',
            100: '#F5E3BD',
            200: '#EED197',
            300: '#E6BE70',
            400: '#DDA94C',
            500: '#D0942F',
            600: '#C48425',
            700: '#A56E1E',
            800: '#825617',
            900: '#5C3D0F',
          },
          secondary: {
            DEFAULT: "#f3ad00",
            50:  '#fff7e6',
            100: '#ffeec4',
            200: '#ffe4a1',
            300: '#ffd977',
            400: '#ffcf4d',
            500: '#ffc425',
            600: '#e0a500',
            700: '#b38200',
            800: '#865f00',
            900: '#593b00',
          },
        },
      },
      dark: {
        colors: {
          background: '#000000',
          foreground: '#F5F5F7',
          primary: {
            DEFAULT: "#FFB347",
            foreground: "#1D1D1F",
            50:  '#3A2703',
            100: '#5C3D05',
            200: '#7F5407',
            300: '#A26C0A',
            400: '#C4840D',
            500: '#E09C1D',
            600: '#F2AC30',
            700: '#FFC15C',
            800: '#FFD68F',
            900: '#FFEBC4',
          },
          secondary: {
            DEFAULT: "#FFB627",
            50:  '#473003',
            100: '#714A03',
            200: '#9A6604',
            300: '#C28107',
            400: '#E89B0F',
            500: '#EFAE2A',
            600: '#F4C155',
            700: '#F8D483',
            800: '#FBE5B0',
            900: '#FDF3DA',
          },
        },
      },
    },
  })],
};
