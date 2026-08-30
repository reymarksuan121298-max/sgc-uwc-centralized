import React from 'react';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFound({ onGoHome }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="w-16 h-16 bg-blue-50 text-[#002B66] rounded-2xl flex items-center justify-center border border-blue-100 shadow-xs">
        <AlertCircle size={32} />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-[#002B66]">404 — Page Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          The page or tab you requested does not exist or you do not have permission to view it.
        </p>
      </div>
      {onGoHome && (
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
        >
          <Home size={14} />
          <span>Return to Dashboard</span>
        </button>
      )}
    </div>
  );
}
