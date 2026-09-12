import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';

export default function TimestampCaptureModal({ isOpen, onClose }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!isOpen) return;
    
    // Update time every second
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isOpen]);

  if (!isOpen) return null;

  // Format date similar to: "September 10, 2026 at 5:16:48 PM"
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="fixed inset-0 z-[9999] bg-[#E8F0FA] flex flex-col items-center justify-center animate-in fade-in duration-200">
      
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
        className="absolute top-6 right-6 p-3 bg-white/50 hover:bg-white text-slate-800 rounded-full shadow-lg transition-all cursor-pointer z-50"
        title="Close Capture Screen"
      >
        <X size={28} />
      </button>

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-4">
        
        <div className="flex items-center gap-2 text-slate-500 font-black uppercase tracking-wider mb-2">
          <Clock size={20} className="text-[#002B66]" />
          <span className="text-[#002B66]">Current System Date & Time</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-[#002B66] text-center drop-shadow-sm mb-12 tabular-nums">
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
