import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Exposes Vite on your local network IP (0.0.0.0)
    port: 5173,
    fs: {
      allow: ['..'] // Allow serving files from one level up to the project root
    }
  }
})