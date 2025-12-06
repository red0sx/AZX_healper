/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"VT323"', 'monospace'],
      },
      colors: {
        'retro-paper': '#fffdf5',
        'retro-dark': '#2d3342',
        'retro-border': '#1a1c2c',
        'retro-blue': '#5d7691', // Bucket color
        'retro-blue-light': '#7a93b0',
        'retro-red': '#d95763', // Accent red
        'retro-green': '#99e550',
        'retro-grid': '#e0e7ef',
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px #2d3342',
        'pixel-sm': '2px 2px 0px 0px #2d3342',
        'pixel-lg': '8px 8px 0px 0px #2d3342',
        'pixel-inset': 'inset 2px 2px 0px 0px rgba(0,0,0,0.2)',
      }
    },
  },
  plugins: [],
}