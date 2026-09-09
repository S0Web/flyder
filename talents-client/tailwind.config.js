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
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // Ombres "posées" à la Wapply : très diffuses, teintées encre, jamais grises.
        card:        '0 1px 2px rgba(18,22,43,0.04), 0 10px 30px -10px rgba(18,22,43,0.12)',
        'card-hover':'0 2px 4px rgba(18,22,43,0.05), 0 24px 48px -16px rgba(18,22,43,0.22)',
        glow:        '0 12px 32px -10px rgba(61,90,254,0.55)',
        inset:       'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      keyframes: {
        fadeInUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        pop:      { '0%': { transform: 'scale(0.96)', opacity: 0 }, '60%': { transform: 'scale(1.02)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
        shimmer:  { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        float:    { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        fadeIn:   'fadeIn 0.3s ease-out both',
        pop:      'pop 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer:  'shimmer 1.6s linear infinite',
        float:    'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
