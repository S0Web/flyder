/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        aqua: {
          light:  '#d6f3fb',
          DEFAULT:'#5bcae8',
          dark:   '#2fa8cc',
          darker: '#1a7a9b',
        },
        fitness: {
          light:  '#f9eedc',
          DEFAULT:'#e8cb9f',
          dark:   '#c9a464',
          darker: '#9a7535',
        },
      }
    },
  },
  plugins: [],
}
