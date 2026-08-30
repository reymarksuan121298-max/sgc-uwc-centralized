import { useState, useRef, useEffect } from 'react';
import { LogIn, User, Lock, ShieldCheck, Sparkles, Bot } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import AnimeBackgroundAnimation from '../../components/common/AnimeBackgroundAnimation';
import Robot3DScene from '../../components/common/Robot3DScene';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Lamp Interactive States
  const [isPulling, setIsPulling] = useState(false);
  const [isLit, setIsLit] = useState(false);

  // Eye tracking coordinates for the lampshade
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const lampRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!lampRef.current) return;
      const rect = lampRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) / 25;
      const deltaY = (e.clientY - centerY) / 25;

      const maxOffset = 4;
      setEyeOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, deltaX)),
        y: Math.max(-maxOffset, Math.min(maxOffset, deltaY)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handlePullCord = () => {
    setIsPulling(true);
    setTimeout(() => {
      setIsPulling(false);
      setIsLit((prev) => !prev);
    }, 350);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // Query database table app_users strictly
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .eq('password', password)
        .maybeSingle();

      if (error || !data) {
        throw new Error('Invalid username or password.');
      }

      if (data.is_active === false) {
        throw new Error('This account has been disabled. Please contact your Super Administrator.');
      }

      // Update last_login_at timestamp only if column is supported
      try {
        if (data.username && 'last_login_at' in data) {
          await supabase
            .from('app_users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('username', data.username);
        }
      } catch (logErr) {
        // Safe non-blocking catch
      }

      if (onLoginSuccess) {
        onLoginSuccess(data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 md:p-8 font-sans relative overflow-hidden select-none bg-[#020617]">
      {/* HD Animated Anime Background (Starry Galaxy, Shooting Stars, Floating Orbs) */}
      <AnimeBackgroundAnimation isLit={isLit} />

      {/* Main Container: 3D Animated Robot (Left) + Login Card (Right) */}
      <div className="w-full max-w-5xl z-10 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 animate-in fade-in zoom-in-95 duration-500 relative">

        {/* ========================================================================= */}
        {/* LEFT COLUMN: 3D ANIMATED ROBOT CHARACTER (THREE.JS WEBGL) */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative lg:min-h-[500px]">
          <Robot3DScene isLit={isLit} isTyping={Boolean(username || password)} />
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: MAIN LOGIN CARD (GLASSMORPHISM) */}
        {/* ========================================================================= */}
        <div className="w-full max-w-[440px] lg:w-1/2 relative">
          {/* Dynamic Ambient Backlight Glow behind Glass */}
          <div
            className={`absolute -inset-2 rounded-[2.5rem] blur-2xl transition-all duration-700 pointer-events-none ${isLit ? 'bg-amber-400/25 opacity-100 scale-105' : 'bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-fuchsia-600/20 opacity-70'
              }`}
          />

          {/* Frosted Glass Container */}
          <div className="relative rounded-[2rem] p-7 sm:p-9 bg-gradient-to-b from-white/[0.12] via-slate-900/40 to-slate-950/60 backdrop-blur-3xl backdrop-saturate-150 border border-white/20 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.4)] overflow-hidden text-slate-100 ring-1 ring-white/10">

            {/* Glass Specular Reflection Highlight Across Top */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="absolute top-0 left-10 right-10 h-0.5 bg-gradient-to-r from-transparent via-[#FFD700]/70 to-transparent opacity-80" />

            {/* Interactive Pixar-style Lamp */}
            <div ref={lampRef} className="relative flex flex-col items-center mb-6 pt-1 select-none">
              <div
                className={`absolute top-14 w-40 h-40 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${isLit ? 'bg-amber-300/45 scale-125' : 'bg-transparent scale-0'
                  }`}
              />

              {/* Lamp Shade */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-2.5 bg-slate-700/90 rounded-t-sm border border-slate-500/40 backdrop-blur-sm" />
                <div className="w-20 h-14 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 rounded-t-[2.5rem] rounded-b-md shadow-lg border border-white/60 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/60" />

                  {/* Animated Eyes */}
                  <div
                    className="flex items-center gap-3 transition-transform duration-75 ease-out relative z-10"
                    style={{
                      transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                    }}
                  >
                    <div className="w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center relative shadow-inner">
                      <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-0.5 right-0.5" />
                    </div>
                    <div className="w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center relative shadow-inner">
                      <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-0.5 right-0.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lamp Base Stand */}
              <div className="w-2.5 h-7 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 rounded-xs -mt-1 shadow-sm" />
              <div className="w-16 h-3 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 rounded-full border border-slate-500/60 shadow-md" />

              {/* Pull Cord String & Knob */}
              <div
                onClick={handlePullCord}
                className={`absolute top-12 right-12 flex flex-col items-center cursor-pointer group transition-transform duration-300 active:scale-95 ${isPulling ? 'translate-y-3' : 'translate-y-0'
                  }`}
                title="Click to toggle light!"
              >
                <div className="w-[1.5px] h-10 bg-white/50 group-hover:bg-[#FFD700] transition-colors" />
                <div className="w-3.5 h-3.5 bg-[#FFD700] rounded-full shadow-md border border-amber-300 ring-2 ring-[#FFD700]/40 group-hover:scale-110 transition-all" />
              </div>
            </div>

            {/* Title Header */}
            <div className="text-center space-y-1.5 mb-6 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/[0.08] border border-white/20 text-[10px] font-black tracking-widest text-[#FFD700] uppercase shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-md mb-0.5">
                <Sparkles size={11} className="text-[#FFD700]" /> Enterprise Portal
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider drop-shadow-md">
                Lucky Betplay Corp.
              </h1>
              <p className="text-xs text-slate-300/90 font-medium">
                Centralized Sub-Office Operations & Ledger
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-4 bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs px-3.5 py-2.5 rounded-2xl font-medium flex items-center gap-2 backdrop-blur-xl shadow-lg shadow-rose-950/40 animate-in fade-in slide-in-from-top-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Glassmorphic Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs relative z-10">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-200 uppercase tracking-wider block">
                  Username
                </label>
                <div className="relative group">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FFD700] transition-colors" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter your system username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/15 focus:border-[#FFD700]/80 focus:ring-2 focus:ring-[#FFD700]/25 rounded-2xl pl-10 pr-3.5 py-3 text-white font-semibold outline-none transition-all placeholder:text-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] backdrop-blur-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-200 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FFD700] transition-colors" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/15 focus:border-[#FFD700]/80 focus:ring-2 focus:ring-[#FFD700]/25 rounded-2xl pl-10 pr-3.5 py-3 text-white font-semibold outline-none transition-all placeholder:text-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] backdrop-blur-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2.5 bg-gradient-to-r from-[#002B66]/90 via-[#003882]/95 to-[#002B66]/90 hover:from-blue-900 hover:via-blue-800 hover:to-blue-900 border border-blue-400/40 text-[#FFD700] py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_10px_25px_-5px_rgba(0,43,102,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 backdrop-blur-md"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Login</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Security Badge with Frosted Glass Pill */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-300 font-semibold">
              <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
              <span>End-to-End Audited & Encrypted</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
