import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // static/ contient les pages HTML brutes (mentions légales, confidentialité)
  // qui n'ont pas besoin de React — Vite les recopie telles quelles dans
  // outDir au build, où server.js les sert directement via express.static.
  publicDir: 'static',
  build: {
    outDir: 'public',
  },
})
