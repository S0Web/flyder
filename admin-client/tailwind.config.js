/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Space Grotesk', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        sky: {
          50: '#F0F2FF', 100: '#DBE1FF', 200: '#B5C0FF', 300: '#8395FE',
          400: '#5F77FE', 500: '#3D5AFE', 600: '#0F33FE', 700: '#0122DC',
          800: '#011BB0', 900: '#011588', 950: '#011064',
        },
        brand: {
          ink:   '#12162B',
          cream: '#F6F5F1',
          blue:  '#3D5AFE',
          coral: '#FF5A36',
          slate: '#8B93A7',
        },
      }
    },
  },
  plugins: [],
}
