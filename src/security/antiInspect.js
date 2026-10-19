/**
 * Silent Anti-Inspect Lockdown Module
 * 
 * Protects financial records, winning tickets, and internal ledger UI
 * by silently blocking client-side inspection methods:
 * - Disables Right-Click Context Menu ("Inspect", "Inspect Element", "View Source")
 * - Disables DevTools Keyboard Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Mac Cmd+Opt equivalents)
 * - Sanitizes sensitive URL parameters from address bar history
 * - Silences verbose console output in production
 * 
 * NOTE: This module operates COMPLETELY SILENTLY.
 * It does NOT render any modal, blur filter, overlay, or lockdown page.
 */

let isLockdownActive = false;
let cleanupHandlers = [];

/**
 * Sanitizes sensitive one-time tokens from URL address bar without reloading
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
 * Scrub sensitive cached data on navigation
 */
export function enforceSilentSanitation() {
  if (typeof window === 'undefined') return;

  // Clear console to avoid retaining references to tickets
  try {
    console.clear();
  } catch {
    /* ignore console restriction */
  }

  // Clean sensitive query parameters from URL history
  sanitizeUrlParameters();
}

/**
 * Backward compatibility alias for tab/route changes
 */
export const enforceLockdownOnNavigation = enforceSilentSanitation;

/**
 * Initialize Silent Anti-Inspect Lockdown
 */
export function initAntiInspectLockdown() {
  if (typeof window === 'undefined' || isLockdownActive) return;
  isLockdownActive = true;

  // Initial token sanitation
  sanitizeUrlParameters();

  // 1. Disable Right-Click Context Menu (prevents "Inspect", "Inspect Element", "View Source")
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
  window.addEventListener('contextmenu', handleContextMenu, { capture: true });
  cleanupHandlers.push(() => window.removeEventListener('contextmenu', handleContextMenu, { capture: true }));

  // 2. Intercept & Block Developer Tools Key Combinations
  const handleKeyDown = (e) => {
    const key = e.key ? e.key.toLowerCase() : '';
    const code = e.keyCode || e.which;

    // F12 (Standard DevTools toggle)
    if (key === 'f12' || code === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    const isModifier = e.ctrlKey || e.metaKey;

    // Ctrl + Shift + (I, J, C) or Cmd + Option + (I, J, C)
    if (isModifier && (e.shiftKey || e.altKey)) {
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

    // Ctrl + S or Cmd + S (Save Page)
    if (isModifier && (key === 's' || code === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  window.addEventListener('keydown', handleKeyDown, { capture: true });
  cleanupHandlers.push(() => window.removeEventListener('keydown', handleKeyDown, { capture: true }));

  // 3. Navigation listeners for URL token sanitation
  const handleNavigationEvent = () => {
    enforceSilentSanitation();
  };
  window.addEventListener('popstate', handleNavigationEvent);
  window.addEventListener('hashchange', handleNavigationEvent);
  cleanupHandlers.push(() => {
    window.removeEventListener('popstate', handleNavigationEvent);
    window.removeEventListener('hashchange', handleNavigationEvent);
  });

  // 4. Suppress sensitive console outputs in production builds
  if (import.meta.env.PROD) {
    try {
      const noop = () => {};
      window.console.log = noop;
      window.console.debug = noop;
      window.console.info = noop;
      window.console.dir = noop;
      window.console.table = noop;
    } catch {
      /* ignore console rewrite */
    }
  }

  return () => {
    cleanupHandlers.forEach(cleanup => cleanup());
    cleanupHandlers = [];
    isLockdownActive = false;
  };
}
