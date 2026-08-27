import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Pas de dossier "public/" séparé pour des fichiers statiques bruts (pas de
  // favicon/robots.txt pour l'instant) — outDir IS le dossier servi par
  // server.js, donc on désactive la copie automatique de Vite pour éviter
  // toute ambiguïté entre dossier source et dossier de build.
  publicDir: false,
  build: {
    outDir: 'public',
  },
})
