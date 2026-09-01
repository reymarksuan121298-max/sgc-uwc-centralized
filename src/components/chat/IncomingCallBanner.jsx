import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, Building2, Shield, Radio } from 'lucide-react';

export default function IncomingCallBanner({
  incomingCall,
  onAccept,
  onDecline
}) {
  const ringtoneTimerRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Play synthetic incoming ringtone (with autoplay unlock)
  useEffect(() => {
    if (!incomingCall) return;

    let ringtoneTimer = null;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const startRinging = () => {
        if (!audioCtxRef.current || ctx.state !== 'running') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880; // High frequency melodic ring
        gain.gain.setValueAtTime(0.15, ctx.currentTime);

        let isRing = true;
        ringtoneTimer = setInterval(() => {
          if (!audioCtxRef.current || ctx.state !== 'running') return;
          if (isRing) {
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
          } else {
            gain.gain.setValueAtTime(0, ctx.currentTime);
          }
          isRing = !isRing;
        }, 900);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
      };

      if (ctx.state === 'running') {
        startRinging();
      } else {
        ctx.resume().then(() => startRinging()).catch(() => {});
      }
    } catch {
      // safe fallback if audio context blocked
    }

    return () => {
      if (ringtoneTimer) clearInterval(ringtoneTimer);
      try {
        if (audioCtxRef.current) audioCtxRef.current.close();
      } catch {}
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const callerName = incomingCall.callerName || incomingCall.callerUsername || 'Branch Officer';
  const callerSubOffice = incomingCall.callerSubOffice || 'Sub-Office Branch';
  const callerRole = incomingCall.callerRole || 'Sales Service Representative';
  const initials = callerName.slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-75 pointer-events-auto">
      {/* Dynamic ambient background glow */}
      <div className="absolute w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute w-80 h-80 bg-blue-600/20 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />

      {/* Main Calling Card */}
      <div className="relative bg-gradient-to-b from-[#001D47]/95 via-slate-900/98 to-slate-950 text-white border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.8)] max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-75">
        
        {/* Top Calling Badge */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3.5 py-1 rounded-full text-xs font-black tracking-wide uppercase shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Radio size={13} className="text-emerald-400" />
          <span>INCOMING GLOBAL HD VIDEO CALL</span>
        </div>

        {/* Large Concentric Glowing Avatar */}
        <div className="relative flex items-center justify-center my-4">
          {/* Animated ripple rings */}
          <div className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 border-emerald-500/30 animate-ping duration-1000 pointer-events-none" />
          <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-500/10 animate-pulse pointer-events-none" />

          {/* Core Avatar */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-[#002B66] via-blue-600 to-[#FFD700] border-4 border-white text-white flex items-center justify-center font-mono font-black text-2xl sm:text-3xl shadow-2xl z-10">
            {initials}
            
            {/* Live Camera Badge */}
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-full ring-4 ring-slate-950 shadow-md animate-bounce">
              <Video size={16} />
            </span>
          </div>
        </div>

        {/* Caller Info */}
        <div className="space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
            {callerName}
          </h3>
          
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-300">
            <span className="inline-flex items-center gap-1 bg-blue-950/80 border border-blue-800/60 px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-blue-200">
              <Building2 size={12} className="text-blue-400" />
              {callerSubOffice}
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-800/80 border border-slate-700 px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-slate-300 uppercase">
              <Shield size={12} className="text-emerald-400" />
              {callerRole}
            </span>
          </div>

          <p className="text-xs text-slate-400 font-medium animate-pulse pt-1">
            Ringing... Click Answer to connect live video & ticket scanner
          </p>
        </div>

        {/* Full-Width Action Buttons */}
        <div className="pt-2 flex items-center justify-center gap-6 sm:gap-8">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onDecline(incomingCall)}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 transition-all border-2 border-rose-400/40 cursor-pointer group"
              title="Decline Call"
            >
              <PhoneOff size={24} className="group-hover:rotate-12 transition-transform" />
            </button>
            <span className="text-xs font-bold text-rose-400">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onAccept(incomingCall)}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-emerald-950/80 transition-all border-2 border-emerald-300 ring-4 ring-emerald-500/30 animate-pulse cursor-pointer group"
              title="Accept Video Call"
            >
              <Phone size={24} className="group-hover:-rotate-12 transition-transform" />
            </button>
            <span className="text-xs font-bold text-emerald-400">Answer</span>
          </div>
        </div>

      </div>
    </div>
  );
}
