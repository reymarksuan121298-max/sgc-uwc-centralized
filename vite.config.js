import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    build: {
      cssMinify: false
    },
    server: {
      host: true, // Exposes Vite on your local network IP (0.0.0.0)
      port: 5173,
      watch: {
        ignored: ['**/scripts/.fb_profile/**', '**/.git/**']
      },
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
  };
});