// tailwind.config.js
const {nextui} = require("@nextui-org/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // ...
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
        sans: ['Poppins', 'sans-serif'],
      },
      backgroundImage: theme => ({
        'gradient-purple': 'linear-gradient(97deg, rgba(103,29,110,1) 0%, rgba(144,44,152,1) 100%)',
      }),
    },
   
  },
  darkMode: "class",
  plugins: [nextui({
    themes:{
      light:{
       colors:{
        primary:{
          DEFAULT:"#833589",
          50: '#f5f0f5',
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
        secondary:{
          DEFAULT:"#f3ad00",
          50: '#fff7e6',
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
      }
    }
  })],
};