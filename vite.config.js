import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'
import path from 'path'
import { pathToFileURL } from 'url'

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

function serverlessProxyPlugin() {
  return {
    name: 'serverless-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        try {
          const proxyModuleUrl = pathToFileURL(path.resolve(process.cwd(), 'api/proxy.js')).href + `?v=${Date.now()}`;
          const { default: handler } = await import(proxyModuleUrl);
          let body = undefined;
          if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const rawBody = Buffer.concat(buffers).toString();
            try {
              body = JSON.parse(rawBody);
            } catch {
              body = rawBody;
            }
          }
          const parsedUrl = new URL(req.url, 'http://localhost:5173');
          const query = Object.fromEntries(parsedUrl.searchParams.entries());

          const customReq = {
            method: req.method,
            headers: req.headers,
            query,
            body
          };

          const customRes = {
            statusCode: 200,
            setHeader(name, value) {
              res.setHeader(name, value);
            },
            status(code) {
              this.statusCode = code;
              res.statusCode = code;
              return this;
            },
            send(data) {
              res.statusCode = this.statusCode;
              res.end(data);
            },
            json(data) {
              res.statusCode = this.statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
            end(data) {
              res.statusCode = this.statusCode;
              res.end(data);
            }
          };

          await handler(customReq, customRes);
        } catch (err) {
          console.error('Local serverless proxy middleware error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const buildInfo = getGitBuildInfo();

  return {
    define: {
      __APP_BUILD_INFO__: JSON.stringify(buildInfo)
    },
    plugins: [react(), tailwindcss(), serverlessProxyPlugin()],
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
        },
        '/api-proxy/stl-mandaue': {
          target: 'https://stl-mandaue-api.com',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-proxy\/stl-mandaue/, '')
        }
      }
    }
  };
});