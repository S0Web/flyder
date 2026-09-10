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
        // Même charte que le reste de Flyder (client/tailwind.config.js,
        // landing/tailwind.config.js) — "sky" reskinné sur le bleu Flyder.
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
          green: '#0F8A5F',
        },
      },
      boxShadow: {
        // Ombres pleines décalées, jamais floues : le papier posé sur le panneau.
        hard:        '4px 4px 0 #12162B',
        'hard-lg':   '7px 7px 0 #12162B',
        'hard-blue': '4px 4px 0 #3D5AFE',
        'hard-coral':'4px 4px 0 #FF5A36',
      },
      keyframes: {
        fadeInUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        pop:      { '0%': { transform: 'scale(0.96)', opacity: 0 }, '60%': { transform: 'scale(1.02)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
        shimmer:  { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        // Le tampon qui s'abat sur la fiche.
        slam:     { '0%': { transform: 'rotate(-2deg) scale(1.6)', opacity: 0 }, '70%': { transform: 'rotate(-2deg) scale(0.96)', opacity: 1 }, '100%': { transform: 'rotate(-2deg) scale(1)', opacity: 1 } },
        marquee:  { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        fadeIn:   'fadeIn 0.3s ease-out both',
        pop:      'pop 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer:  'shimmer 1.6s linear infinite',
        slam:     'slam 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
        marquee:  'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
}
