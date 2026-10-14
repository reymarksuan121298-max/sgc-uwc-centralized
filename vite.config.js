import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

function getGitBuildInfo() {
  let branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH || '';
  let sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || '';
  let message = process.env.VERCEL_GIT_COMMIT_MESSAGE || '';

  if (!branch) {
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {}
  }
  if (!sha) {
    try {
      sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {}
  }
  if (!message) {
    try {
      message = execSync('git log -1 --pretty=%s', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {}
  }

  return {
    branch: branch || 'main',
    commitSha: sha ? sha.slice(0, 7) : 'latest',
    commitMessage: message || 'System update and performance improvements',
    buildTimestamp: new Date().toISOString()
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const buildInfo = getGitBuildInfo();

  return {
    define: {
      __APP_BUILD_INFO__: JSON.stringify(buildInfo)
    },
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