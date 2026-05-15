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
        display: ['Inter', 'sans-serif'],
        accent: ['"Instrument Serif"', 'serif'],
      },
      backgroundImage: theme => ({
        'gradient-purple': 'linear-gradient(97deg, rgba(103,29,110,1) 0%, rgba(144,44,152,1) 100%)',
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
            DEFAULT: "#833589",
            50:  '#f5f0f5',
            100: '#e6d9e6',
            200: '#d6c1d6',
            300: '#c5a9c5',
            400: '#b58db5',
            500: '#a570a5',
            600: '#945b94',
            700: '#834883',
            800: '#703270',
            900: '#5e205e',
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
            DEFAULT: "#C896CD",
            50:  '#2F1234',
            100: '#451E4B',
            200: '#5C3163',
            300: '#74487B',
            400: '#8E6395',
            500: '#A982B0',
            600: '#C29FC6',
            700: '#D6BAD9',
            800: '#E6D4E8',
            900: '#F4ECF5',
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
