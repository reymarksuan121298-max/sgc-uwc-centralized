import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function messengerBotApiPlugin(env) {
  return {
    name: 'messenger-bot-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/send-messenger-report', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(rawBody || '{}');
            const threadId = data.threadId || env.MESSENGER_GROUP_THREAD_ID || '1654605116231296';
            const supervisorName = data.supervisorName || 'Supervisor';

            console.log(`\n🤖 [MESSENGER BOT API] Sending Report for @${supervisorName}`);
            console.log(`   Target Thread: https://www.facebook.com/messages/t/${threadId}`);

            let imgBuffer = null;
            if (data.image) {
              const base64Data = data.image.replace(/^data:image\/\w+;base64,/, '');
              imgBuffer = Buffer.from(base64Data, 'base64');
            }

            // Trigger direct headless browser automation dispatch
            try {
              const { sendDirectToMessengerGroup } = await import('./scripts/messengerDirectAutomation.js');
              // Run in background without blocking response
              sendDirectToMessengerGroup({
                threadId,
                message: data.message,
                imageBuffer: imgBuffer
              }).catch(err => console.error('Direct automation dispatch error:', err));
            } catch (autoErr) {
              console.warn('Automation engine import notice:', autoErr.message);
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              threadId,
              supervisorName,
              message: `Automated dispatch started for @${supervisorName}!`
            }));
          } catch (err) {
            console.error('Error handling messenger report API:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Server error' }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss(), messengerBotApiPlugin(env)],
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