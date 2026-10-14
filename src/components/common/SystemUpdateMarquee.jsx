import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, X, ChevronRight, Info, 
  ExternalLink, CheckCircle2, Rocket, Volume2
} from 'lucide-react';
import { systemUpdateService } from '../../services/systemUpdateService';
import { formatRoleName } from '../../utils/permissions';
import { supabase } from '../../config/supabaseClient';
import WhatsNewFeatureModal from './WhatsNewFeatureModal';

export default function SystemUpdateMarquee({
  currentUser,
  onNavigateTab
}) {
  const [activeFeature, setActiveFeature] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Auto-detect new features applicable to current user role
  const checkForNewFeatures = useCallback(async () => {
    if (!currentUser) {
      setActiveFeature(null);
      setIsVisible(false);
      return;
    }

    try {
      const detected = await systemUpdateService.detectActiveFeature(currentUser);
      if (detected) {
        setActiveFeature(detected);
        setIsVisible(true);
      } else {
        setActiveFeature(null);
        setIsVisible(false);
      }
    } catch (err) {
      console.warn('Feature auto-detection notice:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    checkForNewFeatures();
  }, [checkForNewFeatures]);

  // Realtime listener for dynamic feature announcements
  useEffect(() => {
    const channel = supabase
      .channel('system_features_auto_detect')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'system_settings' 
      }, () => {
        checkForNewFeatures();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkForNewFeatures]);

  // Acknowledge and dismiss for current user role
  const handleDismiss = () => {
    if (activeFeature && currentUser) {
      systemUpdateService.acknowledgeFeature(activeFeature.id, currentUser.role);
    }
    setIsVisible(false);
  };

  if (!isVisible || !activeFeature) return null;

  const userRole = formatRoleName(currentUser?.role || 'Staff');
  const tagText = activeFeature.tag || '✨ NEW FEATURE';
  const marqueeText = activeFeature.marqueeText || activeFeature.title || 'New system update available.';

  return (
    <>
      {/* ── HIGH-VISIBILITY MARQUEE TAG BANNER ─────────────────────────────── */}
      <div 
        role="region"
        aria-label="System Update Notification"
        className="w-full bg-[#002B66] text-white border-b-2 border-[#FFD700] shadow-md z-30 transition-all duration-300 animate-in slide-in-from-top-2"
      >
        <div className="w-full px-3 sm:px-4 py-2 flex items-center justify-between gap-3 min-w-0">
          
          {/* 1. LEFT TAG / BADGE WITH PULSE DOT */}
          <div 
            onClick={() => setIsDetailsModalOpen(true)}
            className="flex items-center gap-2 shrink-0 cursor-pointer select-none group"
            title="Click to view full feature details"
          >
            <div className="bg-[#FFD700] text-[#002B66] px-2.5 py-1 rounded-lg font-black text-[10px] sm:text-[11px] tracking-wider uppercase flex items-center gap-1.5 shadow-2xs group-hover:bg-yellow-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block"></span>
              <Sparkles size={13} className="text-[#002B66] shrink-0" />
              <span>{tagText}</span>
            </div>
            {activeFeature.version && (
              <span className="text-[10px] font-mono font-bold text-blue-200 hidden md:inline">
                v{activeFeature.version}
              </span>
            )}
          </div>

          {/* 2. CENTER MARQUEE TICKER AREA */}
          <div className="flex-1 min-w-0 overflow-hidden relative marquee-container flex items-center">
            
            {/* Native marquee with modern CSS fallback & pause on hover */}
            <div 
              onClick={() => setIsDetailsModalOpen(true)}
              className="cursor-pointer py-0.5 hover:text-[#FFD700] transition-colors"
              title="Click to read what's new"
            >
              <marquee 
                behavior="scroll" 
                direction="left" 
                scrollamount="6" 
                onMouseOver={(e) => e.target.stop()} 
                onMouseOut={(e) => e.target.start()}
                className="font-medium text-xs sm:text-[12.5px] tracking-wide text-blue-50 hover:text-white select-none block"
              >
                {marqueeText}
              </marquee>
            </div>
          </div>

          {/* 3. RIGHT CONTROLS: "WHAT'S NEW" & DISMISS FOR ROLE */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDetailsModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-[#FFD700] hover:text-white border border-[#FFD700]/40 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
            >
              <span>What's New</span>
              <ChevronRight size={12} />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 sm:p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={`Dismiss announcement for ${userRole}`}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>

        </div>
      </div>

      {/* ── DETAILS MODAL ─────────────────────────────────────────────────── */}
      <WhatsNewFeatureModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        feature={activeFeature}
        currentUser={currentUser}
        onAcknowledge={handleDismiss}
        onNavigateTab={onNavigateTab}
      />
    </>
  );
}
