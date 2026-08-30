import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading({ message = 'Loading ledger data...' }) {
  return (
    <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider text-xs bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 shadow-xs">
      <Loader2 size={24} className="animate-spin text-[#002B66]" />
      <span>{message}</span>
    </div>
  );
}
