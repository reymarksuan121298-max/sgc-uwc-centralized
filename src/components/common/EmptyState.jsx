import React from 'react';
import { FileQuestion } from 'lucide-react';

export default function EmptyState({ 
  title = 'No records found', 
  description = 'There are no active entries matching your current filters.' 
}) {
  return (
    <div className="p-8 text-center bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 shadow-xs">
      <div className="p-3 bg-slate-100 text-slate-400 rounded-full">
        <FileQuestion size={24} />
      </div>
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">{title}</h4>
      <p className="text-[11px] text-slate-500 max-w-sm">{description}</p>
    </div>
  );
}
