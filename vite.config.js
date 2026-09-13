import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    cssMinify: false
  },
  server: {
    host: true, // Exposes Vite on your local network IP (0.0.0.0)
    port: 5173,
    fs: {
      allow: ['..'] // Allow serving files from one level up to the project root
    },
    proxy: {
      '/api-proxy/stl-ldn': {
        target: 'https://stl-ldn-api.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-proxy\/stl-ldn/, '')
      }
    }
  }
})