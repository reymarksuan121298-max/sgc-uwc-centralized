/**
 * Anti-Inspect Lockdown Module
 * 
 * Protects financial records, winning tickets, and internal ledger UI
 * from client-side inspection, unauthorized DevTools access, context menu extraction,
 * and prunes sensitive cached ticket data from localStorage/sessionStorage across all page navigation.
 */

import { proxyFetch } from '../services/proxyClient';

let isLockdownActive = false;
let cleanupHandlers = [];
let devtoolsOpen = false;
const devtoolsListeners = new Set();
let devtoolsIntervalId = null;

/**
 * Scrubs sensitive ticket arrays & ledger caches from both localStorage and sessionStorage
 */
export function scrubSensitiveStorage() {
  if (typeof window === 'undefined') return;
  try {
    const localKeysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('stl_unclaimed_cache_') ||
        key.startsWith('stl_unclaimed_ts_') ||
        key.startsWith('stl_claimed_cache_')
      )) {
        localKeysToRemove.push(key);
      }
    }
    localKeysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore storage write restriction */
      }
    });
  } catch {
    /* ignore fallback */
  }

  try {
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('stl_unclaimed_cache_') ||
        key.startsWith('stl_unclaimed_ts_') ||
        key.startsWith('stl_claimed_cache_')
      )) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(k => {
      try {
        sessionStorage.removeItem(k);
      } catch {
        /* ignore storage write restriction */
      }
    });
  } catch {
    /* ignore fallback */
  }
}

/**
 * Sanitizes sensitive one-time tokens from URL address bar without page reload
 */
export function sanitizeUrlParameters() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    const sensitiveParams = ['pw_token', 'hr_approval_transId', 'hr_transId', 'hr_token', 'hr_email', 'token'];
    sensitiveParams.forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    });
    if (changed) {
      const cleanUrl = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch {
    /* ignore history state error */
  }
}

/**
 * Check whether DevTools is open (docked or opened)
 */
export function checkDevTools() {
  if (typeof window === 'undefined') return false;
  const threshold = 160;
  const widthDiff = window.outerWidth - window.innerWidth > threshold;
  const heightDiff = window.outerHeight - window.innerHeight > threshold;
  const isOpen = widthDiff || heightDiff;

  if (isOpen !== devtoolsOpen) {
    devtoolsOpen = isOpen;
    devtoolsListeners.forEach(cb => {
      try {
        cb(devtoolsOpen);
      } catch {
        /* ignore callback error */
      }
    });
  }
  return devtoolsOpen;
}

/**
 * Subscribe to DevTools status changes
 */
export function subscribeDevToolsStatus(callback) {
  if (typeof callback !== 'function') return () => {};
  devtoolsListeners.add(callback);
  callback(devtoolsOpen);
  return () => {
    devtoolsListeners.delete(callback);
  };
}

export function isDevToolsOpen() {
  return devtoolsOpen;
}

/**
 * Enforce Anti-Inspect and Security Sanitation across any page navigation
 */
export function enforceLockdownOnNavigation(targetTab = '') {
  if (typeof window === 'undefined') return;
  if (targetTab) {
    // Navigation target context verified
  }

  // 1. Wipe console history to clear retained references to ticket arrays
  try {
    console.clear();
  } catch {
    /* ignore console restriction */
  }

  // 2. Scrub sensitive storage
  scrubSensitiveStorage();

  // 3. Clean sensitive query parameters from URL history
  sanitizeUrlParameters();

  // 4. Verify DevTools status
  checkDevTools();
}

/**
 * Global Fetch Safeguard:
 * Automatically reroutes direct gateway fetches through Serverless Proxy (/api/proxy)
 */
export function installGlobalFetchSafeguard() {
  if (typeof window === 'undefined' || window.__GATEWAY_PROXY_INTERCEPTOR_ACTIVE__) return;
  window.__GATEWAY_PROXY_INTERCEPTOR_ACTIVE__ = true;

  const originalFetch = window.fetch;
  window.fetch = async function(resource, init = {}) {
    try {
      const urlStr = typeof resource === 'string' ? resource : (resource?.url || '');
      const lower = urlStr.toLowerCase();

      // Intercept direct gateway calls and rewrite to Serverless Proxy
      if (
        (lower.includes('stl-mandaue-api.com') || lower.includes('stl-ldn-api.com') || lower.startsWith('/api-proxy/')) &&
        !lower.startsWith('/api/proxy')
      ) {
        return proxyFetch(urlStr, init);
      }
    } catch {
      /* fallback to original fetch on any intercept error */
    }
    return originalFetch.apply(this, arguments);
  };
}

/**
 * Initialize Anti-Inspect Lockdown
 */
export function initAntiInspectLockdown() {
  if (typeof window === 'undefined' || isLockdownActive) return;
  isLockdownActive = true;

  // 1. Scrub storage immediately on activation
  scrubSensitiveStorage();

  // 2. Install global fetch proxy safeguard
  installGlobalFetchSafeguard();

  // 3. Disable Right-Click Context Menu (prevents "Inspect", "Inspect Element", "View Source")
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
  window.addEventListener('contextmenu', handleContextMenu, { capture: true });
  cleanupHandlers.push(() => window.removeEventListener('contextmenu', handleContextMenu, { capture: true }));

  // 4. Intercept & Block Developer Tools Key Combinations
  const handleKeyDown = (e) => {
    const key = e.key ? e.key.toLowerCase() : '';
    const code = e.keyCode || e.which;

    // F12
    if (key === 'f12' || code === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + Shift + (I, J, C) or Cmd + Option + (I, J, C)
    const isModifier = e.ctrlKey || e.metaKey;
    if (isModifier && e.shiftKey) {
      if (['i', 'j', 'c'].includes(key) || [73, 74, 67].includes(code)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

    // Ctrl + U or Cmd + Option + U (View Source)
    if (isModifier && (key === 'u' || code === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + S (Save Page)
    if (isModifier && (key === 's' || code === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  window.addEventListener('keydown', handleKeyDown, { capture: true });
  cleanupHandlers.push(() => window.removeEventListener('keydown', handleKeyDown, { capture: true }));

  // 5. DevTools window resize detection
  const handleResize = () => {
    checkDevTools();
  };
  window.addEventListener('resize', handleResize);
  cleanupHandlers.push(() => window.removeEventListener('resize', handleResize));

  devtoolsIntervalId = setInterval(checkDevTools, 1500);
  cleanupHandlers.push(() => {
    if (devtoolsIntervalId) clearInterval(devtoolsIntervalId);
  });

  // 6. Suppress sensitive console outputs in production
  if (import.meta.env.PROD) {
    try {
      const noop = () => {};
      window.console.log = noop;
      window.console.debug = noop;
      window.console.info = noop;
    } catch {
      /* ignore console rewrite */
    }
  }

  // Initial check
  checkDevTools();

  return () => {
    cleanupHandlers.forEach(cleanup => cleanup());
    cleanupHandlers = [];
    isLockdownActive = false;
  };
}
