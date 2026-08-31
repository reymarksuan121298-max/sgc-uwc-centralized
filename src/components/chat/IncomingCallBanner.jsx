import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, Sparkles, Building2 } from 'lucide-react';

export default function IncomingCallBanner({
  incomingCall,
  onAccept,
  onDecline
}) {
  const ringtoneTimerRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Play synthetic incoming ringtone
  useEffect(() => {
    if (!incomingCall) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // High frequency melodic ring
      gain.gain.setValueAtTime(0.12, ctx.currentTime);

      let isRing = true;
      ringtoneTimerRef.current = setInterval(() => {
        if (!audioCtxRef.current) return;
        if (isRing) {
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
        } else {
          gain.gain.setValueAtTime(0, ctx.currentTime);
        }
        isRing = !isRing;
      }, 900);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
    } catch {
      // safe fallback if audio context blocked
    }

    return () => {
      if (ringtoneTimerRef.current) clearInterval(ringtoneTimerRef.current);
      try {
        if (audioCtxRef.current) audioCtxRef.current.close();
      } catch {}
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const callerName = incomingCall.callerName || incomingCall.callerUsername || 'Branch Officer';
  const callerSubOffice = incomingCall.callerSubOffice || 'Sub-Office Desk';
  const callerRole = incomingCall.callerRole || 'Sales Service Representative';
  const initials = callerName.slice(0, 2).toUpperCase();

  return (
    <div className="fixed top-5 right-5 sm:right-8 z-[100000] animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="bg-slate-950/95 backdrop-blur-xl text-white border-2 border-emerald-500/80 rounded-3xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-center gap-4 max-w-sm sm:max-w-md w-full">
        
        {/* Animated Avatar */}
        <div className="relative shrink-0">
          <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#002B66] to-[#0084FF] border-2 border-[#FFD700] text-white flex items-center justify-center font-black text-sm font-mono shadow-lg">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-950 flex items-center justify-center animate-bounce">
            <Video size={9} className="text-white" />
          </span>
        </div>

        {/* Caller Info */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.2 rounded-full inline-block">
              INCOMING VIDEO CALL
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white truncate leading-tight mt-0.5">{callerName}</h4>
          <p className="text-[10px] text-slate-300 flex items-center gap-1 font-mono truncate">
            <Building2 size={10} className="text-slate-400" /> {callerSubOffice} • <span className="text-slate-400 uppercase">{callerRole}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onAccept(incomingCall)}
            className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all shadow-lg shadow-emerald-900/50 cursor-pointer active:scale-95 animate-pulse"
            title="Accept Video Call"
          >
            <Phone size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDecline(incomingCall)}
            className="p-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-all shadow-lg shadow-rose-900/50 cursor-pointer active:scale-95"
            title="Decline Call"
          >
            <PhoneOff size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
