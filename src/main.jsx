import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-reload browser when stale JS bundle chunks or MIME type errors occur after a new deployment
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

window.addEventListener('error', (e) => {
  const msg = e?.message || e?.error?.message || '';
  if (
    msg.includes('Expected a JavaScript-or-Wasm module script') ||
    msg.includes('Failed to fetch dynamically imported module')
  ) {
    console.warn('Stale module script detected after deployment, reloading page...');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
