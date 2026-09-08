import React from 'react';
import { X, Mail, Phone, Building2, Shield, Calendar, CheckCircle2, MessageSquare, User } from 'lucide-react';
import { formatRoleName } from '../../utils/permissions';
import { presenceService } from '../../services/presenceService';

export default function ViewUserProfileModal({ user, isOpen, onClose, onStartChat, isOnline, onlineUserIds = null }) {
  if (!isOpen || !user) return null;

  const fullName = user.full_name || user.fullName || user.username || 'User Profile';
  const username = user.username ? `@${user.username}` : '';
  const roleName = formatRoleName(user.role);
  const subOffice = user.sub_office || user.subOffice || 'All Branches';

  const isUserCurrentlyOnline = isOnline !== undefined 
    ? isOnline 
    : (onlineUserIds ? presenceService.isUserOnline(user, onlineUserIds) : false);

  const initials = (fullName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 relative">
        
        {/* Header Gradient Banner */}
        <div className="h-24 bg-gradient-to-r from-[#002B66] via-blue-900 to-[#002B66] relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-6 pb-6 pt-0 relative -mt-12 text-center flex flex-col items-center">
          
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 shadow-md flex items-center justify-center text-xl font-black font-mono text-[#002B66] overflow-hidden mb-2 relative">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#002B66] text-[#FFD700] flex items-center justify-center font-black">
                {initials}
              </div>
            )}
            <span 
              className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white shadow-xs ${isUserCurrentlyOnline ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-slate-400'}`} 
              title={isUserCurrentlyOnline ? 'Active now' : 'Offline'} 
            />
          </div>

          <h3 className="text-lg font-black text-slate-900">{fullName}</h3>
          {username && <p className="text-xs text-slate-500 font-semibold">{username}</p>}

          <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${isUserCurrentlyOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isUserCurrentlyOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {isUserCurrentlyOnline ? 'Active now' : 'Offline'}
            </span>
            <span className="bg-blue-50 text-[#002B66] border border-blue-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {roleName}
            </span>
            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              {subOffice}
            </span>
          </div>

          {/* Information Block */}
          <div className="w-full mt-4 space-y-2.5 text-left text-xs bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
            <div className="flex items-center gap-2.5 text-slate-700">
              <Mail size={15} className="text-[#0084FF] shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Email Address</span>
                <span className="font-semibold truncate block">{user.email || 'No email provided'}</span>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center gap-2.5 text-slate-700 pt-2 border-t border-slate-200/60">
                <Phone size={15} className="text-[#0084FF] shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Phone Contact</span>
                  <span className="font-semibold">{user.phone}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 text-slate-700 pt-2 border-t border-slate-200/60">
              <Building2 size={15} className="text-[#0084FF] shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Sub-Office / Branch</span>
                <span className="font-semibold">{subOffice}</span>
              </div>
            </div>

            {user.bio && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none mb-1">About / Bio</span>
                <p className="text-slate-600 text-[11.5px] italic leading-relaxed">{user.bio}</p>
              </div>
            )}
          </div>

          {/* Optional Action Button */}
          {onStartChat && (
            <button
              type="button"
              onClick={() => {
                onStartChat(user);
                onClose();
              }}
              className="w-full mt-4 bg-[#0084FF] hover:bg-blue-600 text-white py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <MessageSquare size={16} />
              <span>Send Direct Message</span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
