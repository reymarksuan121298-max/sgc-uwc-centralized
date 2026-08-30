import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
  children
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className={`px-4 py-3 flex justify-between items-center text-white ${isDestructive ? 'bg-rose-600' : 'bg-[#002B66]'}`}>
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
            <AlertTriangle size={16} className={isDestructive ? 'text-amber-300' : 'text-[#FFD700]'} />
            <span>{title}</span>
          </div>
          <button 
            type="button"
            onClick={onCancel} 
            disabled={isLoading}
            className="text-slate-300 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-700 leading-relaxed font-medium">{message}</p>
          {children}
        </div>

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 cursor-pointer ${
              isDestructive 
                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                : 'bg-[#002B66] hover:bg-blue-900 text-[#FFD700]'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
