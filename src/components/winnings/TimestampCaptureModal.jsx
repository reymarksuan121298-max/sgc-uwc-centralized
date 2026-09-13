import React from 'react';
import { X, Clock, Wifi, RefreshCw } from 'lucide-react';
import { useServerTime } from '../../services/serverTimeService';

export default function TimestampCaptureModal({ isOpen, onClose }) {
  const {
    formattedDate,
    formattedTime,
    isSynced,
    isLoading,
    resync
  } = useServerTime(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#E8F0FA] flex flex-col items-center justify-center animate-in fade-in duration-200 select-none">
      
      {/* 
        Subtle Background Pattern (diagonal stripes or grid)
        We use a simple CSS repeating linear gradient to mimic the monitor moiré/texture shown in the reference image
      */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 43, 102, .1) 25%, rgba(0, 43, 102, .1) 26%, transparent 27%, transparent 74%, rgba(0, 43, 102, .1) 75%, rgba(0, 43, 102, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 43, 102, .1) 25%, rgba(0, 43, 102, .1) 26%, transparent 27%, transparent 74%, rgba(0, 43, 102, .1) 75%, rgba(0, 43, 102, .1) 76%, transparent 77%, transparent)',
          backgroundSize: '30px 30px'
        }}
      />

      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/60 hover:bg-white text-slate-800 rounded-full shadow-lg transition-all cursor-pointer z-50 hover:scale-105 active:scale-95"
        title="Close Capture Screen"
      >
        <X size={28} />
      </button>

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-4">
        
        {/* Header with Server Sync Status */}
        <div className="flex items-center gap-2.5 text-slate-500 font-black uppercase tracking-wider mb-2 flex-wrap justify-center">
          <Clock size={20} className="text-[#002B66]" />
          <span className="text-[#002B66] text-sm sm:text-base font-black">Current System Date & Time</span>
          
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono tracking-normal border ${
            isSynced 
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`} />
            <span>{isSynced ? 'SERVER SYNCED (PST / UTC+8)' : 'SYNCING SERVER TIME...'}</span>
          </span>

          <button
            type="button"
            onClick={resync}
            disabled={isLoading}
            className="text-slate-400 hover:text-[#002B66] p-1 rounded transition-colors cursor-pointer"
            title="Re-sync with server clock"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin text-[#002B66]' : ''} />
          </button>
        </div>
        
        {/* Live Server Date & Time display */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-[#002B66] text-center drop-shadow-sm mb-12 tabular-nums tracking-tight">
          {formattedDate} at {formattedTime}
        </h1>

        {/* Ticket Placement Placeholder */}
        <div className="relative w-64 h-96 border-4 border-dashed border-[#002B66]/60 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm shadow-xl">
          <div className="absolute -top-4 -left-4 w-8 h-8 border-t-4 border-l-4 border-[#002B66]" />
          <div className="absolute -top-4 -right-4 w-8 h-8 border-t-4 border-r-4 border-[#002B66]" />
          <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-4 border-l-4 border-[#002B66]" />
          <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-4 border-r-4 border-[#002B66]" />
          
          <div className="flex flex-col items-center text-[#002B66]/60 gap-3">
            <span className="font-extrabold text-sm uppercase tracking-widest text-[#002B66]">Position physical</span>
            <span className="font-extrabold text-sm uppercase tracking-widest text-[#002B66]">ticket here</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
