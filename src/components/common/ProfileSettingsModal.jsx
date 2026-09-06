import React from 'react';
import { X } from 'lucide-react';
import ProfileSettings from '../../pages/Profile/ProfileSettings';

export default function ProfileSettingsModal({ isOpen, onClose, currentUser, onUserUpdated }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Header Ribbon - PAG-IBIG Fund Blue */}
        <div className="bg-[#003B6D] px-6 py-4 flex items-center justify-between border-b border-[#002b54]">
          <div>
            <h3 className="font-black text-xl text-white tracking-tight">Account Preferences</h3>
            <p className="text-xs text-blue-100 font-medium">Manage your profile and security settings.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto w-full custom-scrollbar">
          <ProfileSettings 
            currentUser={currentUser} 
            onUserUpdated={onUserUpdated} 
          />
        </div>
      </div>
    </div>
  );
}
