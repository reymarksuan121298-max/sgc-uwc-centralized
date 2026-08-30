import React from 'react';

export default function AdminLayout({ children, title, subtitle }) {
  return (
    <div className="w-full space-y-4">
      {(title || subtitle) && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            {title && <h3 className="font-extrabold text-[#002B66] text-sm uppercase tracking-wider">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
