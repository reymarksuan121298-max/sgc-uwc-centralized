import { useState, useEffect } from 'react';
import {
  LogIn,
  User,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
  Database,
  Award,
  Smartphone,
  HelpCircle,
  Landmark,
  Zap,
  Copy,
  Check,
  RefreshCw,
  X,
  Shield,
  Clock,
  Info,
  Bot,
  Sparkles
} from 'lucide-react';
import { supabase } from './supabaseClient';

const SYSTEM_VERSION = 'v2.5.4';
const RELEASE_DATE = 'August 2026';
const SPLINE_URL = 'https://my.spline.design/robotfollowcursorforlandingpage-8scVTHZFTsv3YxeDTlrtDPOj/';

const SYSTEM_SERVICES = [
  {
    title: 'Unclaimed Winnings Registry',
    desc: 'Real-time query and reconciliation of unclaimed tickets across supervisors.',
    icon: FileText
  },
  {
    title: 'Returned Winnings Ledger',
    desc: 'Official cloud-backed repository for surrendered and audited winning tickets.',
    icon: Database
  },
  {
    title: 'Settlement Desk',
    desc: 'Structured installment agreements and supervisor accountability records.',
    icon: Award
  },
  {
    title: 'QR Code Ticket Forensics',
    desc: 'Instant cryptographic verification and 30-day ticket age validation.',
    icon: Smartphone
  }
];

const CHANGELOG = [
  {
    version: 'v2.5.4',
    date: 'August 2026',
    status: 'Current Release',
    highlights: [
      'Containerless, borderless 3D Spline Robot floating seamlessly on the left.',
      'Harmonized cyber-cyan & obsidian glassmorphic theme matching the 3D scene.',
      'High-speed single-step supervisor & admin authentication with Supabase DB.',
      'Enhanced high-resolution PNG snapshot generator for supervisory reporting.'
    ]
  },
  {
    version: 'v2.4.0',
    date: 'July 2026',
    status: 'Stable',
    highlights: [
      'Settlement Agreement Module with automated installment scheduling.',
      'Multi-status tracking (Pending, In-Progress, Fully Settled) synced with database.'
    ]
  },
  {
    version: 'v2.3.0',
    date: 'June 2026',
    status: 'Historical',
    highlights: [
      'Dynamic QR Code ticket generator with instant copy to clipboard.',
      'Automated 30-day ticket age evaluation for incident report workflows.'
    ]
  },
  {
    version: 'v1.0.0',
    date: 'January 2026',
    status: 'Initial Release',
    highlights: [
      'Core Unclaimed Winnings Registry for Lucky Betplay Corporation Mandaue Operations.'
    ]
  }
];

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isSplineLoaded, setIsSplineLoaded] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copiedInfo, setCopiedInfo] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter your Username and Password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password)
        .maybeSingle();

      if (error || !data) {
        throw new Error('Invalid username or password. Please verify your credentials.');
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

  const handleCopySystemInfo = () => {
    const text = `Lucky Betplay Corporation - STL Mandaue Operations Portal\nSystem Version: ${SYSTEM_VERSION} (${RELEASE_DATE})\nCloud DB: Supabase (AES-256 Encrypted)\nServer Time: ${formattedDate} ${formattedTime} (PST)`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedInfo(true);
      setTimeout(() => setCopiedInfo(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans relative overflow-x-hidden select-none selection:bg-cyan-400 selection:text-slate-950 flex flex-col justify-between">
      <div className="fixed top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full bg-cyan-500/15 blur-[180px] pointer-events-none z-0" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[650px] h-[650px] rounded-full bg-teal-500/10 blur-[190px] pointer-events-none z-0" />
      <div className="fixed top-[35%] left-[20%] w-[450px] h-[450px] rounded-full bg-cyan-400/8 blur-[160px] pointer-events-none z-0" />

      <div className="fixed inset-0 bg-[linear-gradient(to_right,#06b6d40a_1px,transparent_1px),linear-gradient(to_bottom,#06b6d40a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      <header className="relative z-20 bg-[#080d1a]/85 border-b border-cyan-900/40 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-teal-500 to-cyan-700 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#060913] rounded-[14px] flex items-center justify-center text-cyan-400">
                <Landmark size={22} className="stroke-[2.5]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white tracking-wide uppercase leading-tight">
                  Lucky Betplay Corporation
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  STL Mandaue
                </span>
              </div>
              <p className="text-[11px] text-cyan-200/70 font-semibold tracking-normal">
                Unclaimed & Returned Winnings Management Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-900/40 text-[11px] font-mono text-slate-300 shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-slate-400">PST:</span>
              <span className="font-bold text-cyan-400">{formattedTime}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowChangelogModal(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-900/40 text-cyan-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Zap size={13} className="text-cyan-400" />
              <span>{SYSTEM_VERSION}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-95 cursor-pointer"
            >
              <HelpCircle size={14} className="stroke-[2.5]" />
              <span>User Guide</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          <div className="lg:col-span-7 relative flex flex-col items-center justify-center min-h-[500px] sm:min-h-[580px] lg:min-h-[660px] w-full select-none -ml-0 lg:-ml-4">
            <div className="absolute top-0 left-0 z-30 flex items-center gap-2 pointer-events-none">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/30 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-md">
                <Bot size={15} className="text-cyan-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider">3D Sentinel Active</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400/80 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 backdrop-blur-sm hidden sm:inline-block">
                Interactive Cursor Tracking
              </span>
            </div>

            <div 
              className="relative w-full h-full flex-1 flex items-center justify-center min-h-[460px] lg:min-h-[620px] overflow-hidden"
              style={{
                WebkitMaskImage: 'radial-gradient(ellipse 52% 50% at 50% 48%, black 15%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.2) 55%, transparent 72%)',
                maskImage: 'radial-gradient(ellipse 52% 50% at 50% 48%, black 15%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.2) 55%, transparent 72%)'
              }}
            >
              {!isSplineLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 border-3 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
                    <Bot size={20} className="absolute text-cyan-400 animate-pulse" />
                  </div>
                  <span className="text-xs text-cyan-300 font-semibold tracking-wide">Initializing 3D Robot...</span>
                </div>
              )}

              <iframe
                src={SPLINE_URL}
                title="Spline 3D Robot Scene"
                onLoad={() => setIsSplineLoaded(true)}
                className={`w-[140%] h-[140%] min-h-[600px] lg:min-h-[800px] scale-120 sm:scale-135 origin-center border-0 transition-opacity duration-700 bg-transparent ${
                  isSplineLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                allow="autoplay; fullscreen; accelerometer; gyroscope; encrypted-media"
              />
            </div>

            <div className="absolute inset-y-0 left-0 w-36 lg:w-48 bg-gradient-to-r from-[#060913] via-[#060913]/90 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#060913] via-[#060913]/90 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#060913] via-[#060913]/90 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#060913] to-transparent pointer-events-none z-20" />

            <div className="absolute bottom-1 left-0 right-0 z-30 flex items-center justify-between text-[11px] text-cyan-200/60 pointer-events-none px-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-cyan-400" />
                <span>Move cursor to interact in 3D</span>
              </div>
              <span className="font-mono text-[10px] text-cyan-400/50 hidden sm:inline-block">WebGL 60FPS</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950/85 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-600" />

            <div>
              <div className="space-y-2 mb-6">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  <Shield size={12} /> Authorized Personnel Gateway
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Portal Sign In
                </h2>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Enter your credentials to access the live STL Mandaue database and audit records.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 bg-rose-950/80 border border-rose-800 text-rose-200 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 shadow-lg animate-shake">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User size={14} className="text-cyan-400" />
                      <span>Username</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Account User ID</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-[#0a0f1d] border border-cyan-900/60 focus:border-cyan-400 text-white placeholder-slate-500 px-4 py-3 rounded-2xl font-medium outline-none focus:ring-3 focus:ring-cyan-400/20 transition-all shadow-inner"
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock size={14} className="text-cyan-400" />
                      <span>Password</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Case-Sensitive</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#0a0f1d] border border-cyan-900/60 focus:border-cyan-400 text-white placeholder-slate-500 pl-4 pr-11 py-3 rounded-2xl font-medium outline-none focus:ring-3 focus:ring-cyan-400/20 transition-all shadow-inner"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 p-1 transition-colors cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 group"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-slate-950" />
                      <span>Verifying Credentials...</span>
                    </div>
                  ) : (
                    <>
                      <LogIn size={16} className="transition-transform group-hover:translate-x-1" />
                      <span>Sign In to Portal</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 p-3.5 bg-[#0a0f1d]/90 rounded-2xl border border-cyan-900/50 text-[11px] text-slate-400 flex items-start gap-2.5">
                <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Forgot password? Contact the Lucky Betplay Corp IT Administrator or Operations Supervisor.
                </span>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-cyan-400" />
                <span>256-bit AES DB</span>
              </span>
              <button
                type="button"
                onClick={() => setShowChangelogModal(true)}
                className="hover:text-cyan-400 font-mono text-[10px] uppercase transition-colors cursor-pointer"
              >
                {SYSTEM_VERSION} Release
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {SYSTEM_SERVICES.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div
                key={idx}
                className="bg-slate-950/60 hover:bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 p-3.5 rounded-2xl backdrop-blur-md transition-all flex items-center gap-3"
              >
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">{srv.title}</h3>
                  <p className="text-[10px] text-slate-400 truncate">{srv.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="relative z-20 bg-[#050811] border-t border-cyan-900/30 py-5 px-4 sm:px-6 lg:px-8 mt-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-xs text-slate-400">
          <div className="space-y-1">
            <p className="font-extrabold text-white uppercase tracking-wider flex items-center justify-center md:justify-start gap-2">
              <Landmark size={14} className="text-cyan-400" />
              <span>Lucky Betplay Corporation • STL Mandaue Branch</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Data protection in compliance with the Philippine Data Privacy Act of 2012 (RA 10173).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold text-slate-400">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              User Guide
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowChangelogModal(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer font-mono"
            >
              Release Notes ({SYSTEM_VERSION})
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleCopySystemInfo}
              className="hover:text-cyan-400 transition-colors font-mono cursor-pointer flex items-center gap-1"
            >
              {copiedInfo ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedInfo ? 'Copied Specs!' : 'PH-CEBU-MANDAUE-01'}</span>
            </button>
          </div>
        </div>
      </footer>

      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0a0f1d] border-2 border-cyan-500/50 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="bg-[#070b16] p-5 border-b border-cyan-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HelpCircle size={20} className="text-cyan-400" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Portal User Guide
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300 max-h-[70vh] overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-[#060913] border border-cyan-900/40 space-y-1">
                <span className="text-cyan-400 font-bold block">1. Unclaimed Winnings Registry</span>
                <p className="text-[11px] text-slate-400">
                  Search and review winning tickets that have not yet been claimed. Filter results by Date Range and Supervisor.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#060913] border border-cyan-900/40 space-y-1">
                <span className="text-cyan-400 font-bold block">2. Returned Winnings Audit Ledger</span>
                <p className="text-[11px] text-slate-400">
                  Use the "Transfer to Returned Winnings" button to formally transfer surrendered winning tickets into the audit ledger.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#060913] border border-cyan-900/40 space-y-1">
                <span className="text-cyan-400 font-bold block">3. Settlement Agreements</span>
                <p className="text-[11px] text-slate-400">
                  Manage supervisor accountabilities and installment payments with structured schedules and promissory records.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#060913] border border-cyan-900/40 space-y-1">
                <span className="text-cyan-400 font-bold block">4. Account Support & Password Reset</span>
                <p className="text-[11px] text-slate-400">
                  For new teller or supervisor credentials, please coordinate directly with the Mandaue Operations IT Administrator.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#070b16] border-t border-cyan-900/40 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangelogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0a0f1d] border-2 border-cyan-500/50 rounded-3xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-cyan-900/40 flex items-center justify-between bg-[#070b16]">
              <div className="flex items-center gap-2.5">
                <Zap size={20} className="text-cyan-400" />
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wide">
                    System Release Notes
                  </h3>
                  <span className="text-[10px] text-cyan-300 font-mono">Current: {SYSTEM_VERSION} ({RELEASE_DATE})</span>
                </div>
              </div>
              <button
                onClick={() => setShowChangelogModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {CHANGELOG.map((item, idx) => (
                <div key={idx} className="relative pl-5 border-l-2 border-cyan-500/40 last:border-transparent">
                  <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-black text-white font-mono">{item.version}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {item.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">({item.date})</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {item.highlights.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#070b16] border-t border-cyan-900/40 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                Lucky Betplay Corporation • STL Mandaue
              </span>
              <button
                onClick={() => setShowChangelogModal(false)}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
