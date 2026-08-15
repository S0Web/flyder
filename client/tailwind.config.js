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
      }
    },
  },
  plugins: [],
}
