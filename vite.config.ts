/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Vercel serves the isolated preview from /; GitHub Pages from /inca-demo/.
  base: process.env.VERCEL === '1' || process.env.NETLIFY === 'true' ? '/' : '/inca-demo/',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
