import React from 'react';
import { 
  X, Sparkles, CheckCircle2, ArrowRight, 
  Calendar, Shield, Rocket, Check, Tag, GitBranch
} from 'lucide-react';
import { formatRoleName } from '../../utils/permissions';

export default function WhatsNewFeatureModal({
  isOpen,
  onClose,
  feature,
  currentUser,
  onAcknowledge,
  onNavigateTab
}) {
  if (!isOpen || !feature) return null;

  const userRole = formatRoleName(currentUser?.role || 'Staff');

  const handleGotIt = () => {
    if (onAcknowledge) onAcknowledge();
    onClose();
  };

  const handleAction = () => {
    if (feature.actionTab && onNavigateTab) {
      onNavigateTab(feature.actionTab);
    }
    handleGotIt();
  };

  return (
    <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* HEADER - Pag-IBIG Navy & Gold */}
        <div className="bg-[#002B66] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#FFD700] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-[#FFD700]/50 flex items-center justify-center text-[#FFD700] shadow-sm">
              <Rocket size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase bg-[#FFD700] text-[#002B66] px-2 py-0.5 rounded-full font-sans">
                  {feature.tag || 'SYSTEM UPDATE'}
                </span>
                <span className="text-[11px] font-mono text-blue-200">
                  v{feature.version || '2.5.0'}
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base text-white uppercase tracking-tight mt-0.5">
                {feature.title || "What's New in This Update"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* Metadata Banner */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#002B66]" />
              <span className="font-semibold text-[11px]">
                Released: <strong className="text-slate-800">{feature.releaseDate || 'Today'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {feature.buildInfo?.branch && (
                <div className="flex items-center gap-1.5 bg-white border border-blue-200 px-2.5 py-1 rounded-lg font-mono text-[10px] text-slate-700">
                  <GitBranch size={12} className="text-[#002B66]" />
                  <span>{feature.buildInfo.branch}</span>
                  {feature.buildInfo.commitSha && (
                    <span className="text-slate-400">({feature.buildInfo.commitSha})</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white border border-blue-200 px-2.5 py-1 rounded-lg">
                <Shield size={12} className="text-[#002B66]" />
                <span className="text-[10px] font-bold text-slate-700">
                  Audience: <strong className="text-[#002B66]">{userRole}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Feature Summary */}
          {feature.summary && (
            <p className="text-slate-700 text-xs sm:text-[13px] font-medium leading-relaxed">
              {feature.summary}
            </p>
          )}

          {/* Highlights List */}
          {feature.highlights && feature.highlights.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Key Improvements & Highlights
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {feature.highlights.map((h, idx) => {
                  const isStr = typeof h === 'string';
                  const title = isStr ? h : h.title;
                  const desc = isStr ? null : h.description;

                  return (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 transition-all hover:bg-slate-100/70"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                        <Check size={12} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          {title}
                        </h4>
                        {desc && (
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                            {desc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Acknowledgment Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
            <strong>Role Acknowledgment:</strong> Dismissing or confirming this update will record it for your role (<strong>{userRole}</strong>) so the marquee announcement will not show again.
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-white transition-colors cursor-pointer text-xs"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {feature.actionTab && (
              <button
                type="button"
                onClick={handleAction}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              >
                <span>{feature.actionLabel || 'View Feature'}</span>
                <ArrowRight size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={handleGotIt}
              className="px-5 py-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] rounded-xl font-black transition-colors cursor-pointer text-xs shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} className="text-[#FFD700]" />
              <span>Got It, Acknowledge</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
