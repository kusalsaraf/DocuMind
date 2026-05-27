import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['strength-geriatric-dedicate.ngrok-free.dev'],
  },
  build: {
    cssMinify: 'esbuild',
  },
})
