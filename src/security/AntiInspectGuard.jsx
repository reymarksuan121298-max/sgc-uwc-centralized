import { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Lock, EyeOff } from 'lucide-react';
import { enforceLockdownOnNavigation, subscribeDevToolsStatus, checkDevTools } from './antiInspect';

/**
 * Enterprise Anti-Inspect Guard Component
 * 
 * Enforces security sanitization across every tab switch and route change:
 * - Purges sensitive local/session storage ticket caches
 * - Clears developer console
 * - Sanitizes URL address bar query tokens
 * - Monitors for active DevTools and displays an enterprise lockdown shield
 */
export default function AntiInspectGuard({ activeTab, children }) {
  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);

  // Enforce lockdown on every tab/page navigation
  useEffect(() => {
    enforceLockdownOnNavigation(activeTab);
  }, [activeTab]);

  // Also enforce on browser history navigation (back/forward)
  useEffect(() => {
    const handleNavigationEvent = () => {
      enforceLockdownOnNavigation(activeTab);
    };

    window.addEventListener('popstate', handleNavigationEvent);
    window.addEventListener('hashchange', handleNavigationEvent);

    return () => {
      window.removeEventListener('popstate', handleNavigationEvent);
      window.removeEventListener('hashchange', handleNavigationEvent);
    };
  }, [activeTab]);

  // Subscribe to real-time DevTools detection
  useEffect(() => {
    const unsubscribe = subscribeDevToolsStatus((isOpen) => {
      setIsDevToolsDetected(isOpen);
    });
    return unsubscribe;
  }, []);

  const handleManualRecheck = () => {
    const open = checkDevTools();
    setIsDevToolsDetected(open);
  };

  return (
    <div className="relative w-full h-full min-h-screen">
      {/* Underlying Application View (Blurred when DevTools is detected) */}
      <div className={isDevToolsDetected ? 'filter blur-md pointer-events-none select-none transition-all duration-300' : 'transition-all duration-300'}>
        {children}
      </div>

      {/* Enterprise Security Lockdown Overlay */}
      {isDevToolsDetected && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center text-rose-500 shadow-2xl shadow-rose-500/30 animate-pulse">
              <ShieldAlert size={44} />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full border-2 border-slate-900 shadow-xs">
              <Lock size={14} />
            </div>
          </div>

          <span className="text-[11px] font-black uppercase tracking-widest text-[#FFD700] px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full mb-3">
            Anti-Inspect Lockdown Active
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase max-w-md">
            Inspection Tools Restricted
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-2.5 max-w-lg font-medium leading-relaxed">
            Developer inspection tools, DOM extraction, and console access are restricted on this enterprise financial portal to protect winning records and ledger data.
          </p>

          <div className="mt-5 p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-3 text-left max-w-md shadow-inner">
            <EyeOff size={18} className="text-amber-400 shrink-0" />
            <p className="text-[11px] font-mono text-slate-300">
              Please <span className="text-white font-bold underline">close Developer Tools</span> (or undock inspector) to restore system access and ledger visibility.
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualRecheck}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-[#002B66] hover:from-blue-600 hover:to-blue-800 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-900/40 cursor-pointer active:scale-95 transition-all"
          >
            <RefreshCw size={14} />
            <span>Re-Check Security Status</span>
          </button>
        </div>
      )}
    </div>
  );
}
