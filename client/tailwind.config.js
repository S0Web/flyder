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
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Identité Flyder — charte graphique v1. "sky" est redéfini ici (pas
        // ajouté à côté) : c'est la couleur d'accent historiquement utilisée
        // partout dans l'app (boutons, focus, liens...), donc la remapper sur
        // le bleu Flyder reskinne tous les usages existants de bg-sky-*/
        // text-sky-*/focus:ring-sky-* sans toucher à chaque fichier.
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
        // Aqua/fitness reskinnés sur la charte v1 : le bleu Flyder porte l'identité
        // aqua de bout en bout ; fitness s'appuie sur l'encre pour les grandes
        // surfaces (en-têtes) et réserve le corail signature aux accents (carte,
        // pastille) — cf. la règle "jamais dominant" de la charte graphique.
        aqua: {
          light:  '#EEF1FF',
          DEFAULT:'#3D5AFE',
          dark:   '#6B82FF',
          darker: '#2743C4',
        },
        fitness: {
          light:  '#F4F1EC',
          DEFAULT:'#FF5A36',
          dark:   '#4B5468',
          darker: '#12162B',
        },
      },
      keyframes: {
        fadeIn:     { from: { opacity: 0, transform: 'translateY(6px)' },                to: { opacity: 1, transform: 'translateY(0)' } },
        fadeOut:    { from: { opacity: 1, transform: 'translateY(0)' },                  to: { opacity: 0, transform: 'translateY(-4px)' } },
        overlayIn:  { from: { opacity: 0 },                                              to: { opacity: 1 } },
        overlayOut: { from: { opacity: 1 },                                              to: { opacity: 0 } },
        modalIn:    { from: { opacity: 0, transform: 'scale(0.96) translateY(8px)' },    to: { opacity: 1, transform: 'scale(1) translateY(0)' } },
        modalOut:   { from: { opacity: 1, transform: 'scale(1) translateY(0)' },         to: { opacity: 0, transform: 'scale(0.97) translateY(4px)' } },
        // Pulse de confirmation (statut qui change, effectif mis à jour...)
        pop:        { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.18)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        fadeIn:     'fadeIn 0.15s ease-out',
        fadeOut:    'fadeOut 0.15s ease-in forwards',
        overlayIn:  'overlayIn 0.15s ease-out',
        overlayOut: 'overlayOut 0.13s ease-in forwards',
        // Opacité pure, sans transform : un popover à grille dense (effectif,
        // pointeur) qui scale/translate à l'ouverture déplace ses cellules sous
        // le curseur pendant l'animation, ce qui fait clignoter le survol à
        // toute vitesse d'une case à l'autre — bug constaté en prod.
        popoverIn:  'overlayIn 0.12s ease-out',
        modalIn:    'modalIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        modalOut:   'modalOut 0.13s ease-in forwards',
        pop:        'pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
