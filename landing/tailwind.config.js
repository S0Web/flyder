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
        // Même charte que le reste de Flyder (client/tailwind.config.js) —
        // la landing doit être immédiatement reconnaissable comme le même produit.
        brand: {
          ink:   '#12162B',
          cream: '#F6F5F1',
          blue:  '#3D5AFE',
          coral: '#FF5A36',
          slate: '#8B93A7',
        },
      },
      keyframes: {
        fadeInUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
