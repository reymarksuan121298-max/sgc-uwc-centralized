import React from 'react';
import { AlertTriangle, CheckCircle2, Trash2, HelpCircle, X } from 'lucide-react';

export default function ConfirmPopover({
  isOpen,
  title = 'Please Confirm',
  message = 'Are you sure you want to perform this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning' | 'danger' | 'info' | 'success'
  isLoading = false,
  onConfirm,
  onCancel,
  children
}) {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      bgHeader: 'bg-gradient-to-r from-rose-600 to-rose-700',
      icon: Trash2,
      iconColor: 'text-rose-200',
      btnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
    },
    warning: {
      bgHeader: 'bg-gradient-to-r from-[#002B66] to-blue-900',
      icon: AlertTriangle,
      iconColor: 'text-[#FFD700]',
      btnClass: 'bg-[#002B66] hover:bg-[#001D47] text-[#FFD700] shadow-blue-200',
    },
    success: {
      bgHeader: 'bg-gradient-to-r from-emerald-600 to-teal-700',
      icon: CheckCircle2,
      iconColor: 'text-emerald-200',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
    },
    info: {
      bgHeader: 'bg-gradient-to-r from-blue-600 to-indigo-700',
      icon: HelpCircle,
      iconColor: 'text-blue-200',
      btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
    }
  };

  const currentConfig = typeConfig[type] || typeConfig.warning;
  const HeaderIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Popover Header */}
        <div className={`px-5 py-3.5 flex justify-between items-center text-white ${currentConfig.bgHeader}`}>
          <div className="flex items-center gap-2.5 font-black uppercase tracking-wider text-xs">
            <HeaderIcon size={18} className={currentConfig.iconColor} />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Popover Body */}
        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-line text-sm">{message}</p>
          {children}
        </div>

        {/* Popover Footer Controls */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 ${currentConfig.btnClass}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
