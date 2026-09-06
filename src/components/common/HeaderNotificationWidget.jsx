import React from 'react';
import { Bell, BellOff, CheckCircle2, FileText, AlertTriangle, ShieldAlert, MessageSquare } from 'lucide-react';

export default function HeaderNotificationWidget({
  isNotificationOpen,
  setIsNotificationOpen,
  unreadNotificationsCount,
  isSSR,
  permissionStatus,
  handleRequestPermission,
  onMarkAllNotificationsRead,
  cleanNotifications,
  handleClickNotificationItem,
  getNotificationVisuals,
  formatTimeAgo,
}) {
  return (
    <>
      {isNotificationOpen && (
        <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px] bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden z-[10002] animate-in fade-in zoom-in-95 flex flex-col max-h-[82vh] sm:max-h-[520px]">
          
          {/* Clean Mockup Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100/90 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                Notifications
              </h3>
              {!isSSR && permissionStatus === 'granted' && (
                <span className="bg-emerald-50 text-emerald-700 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Push On
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onMarkAllNotificationsRead && (
                <button
                  type="button"
                  onClick={onMarkAllNotificationsRead}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Web Push Permission Banner (Hidden on SSR Side) */}
          {!isSSR && permissionStatus !== 'granted' && (
            <div className="bg-blue-50/90 border-b border-blue-100 p-2.5 px-4 flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[#0084FF] animate-ping shrink-0" />
                <p className="text-[11px] text-[#002B66] font-bold truncate">
                  Enable Web Push for background desktop alerts
                </p>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="bg-[#002B66] text-[#FFD700] hover:bg-blue-900 font-black text-[10px] uppercase px-3 py-1 rounded-lg shadow-2xs shrink-0 cursor-pointer transition-all active:scale-95"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification Items List */}
          <div className="p-3 space-y-2.5 overflow-y-auto max-h-[440px]">
            {(!cleanNotifications || cleanNotifications.length === 0) ? (
              <div className="py-12 px-4 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <BellOff size={20} />
                </div>
                <h5 className="font-bold text-slate-700 text-xs">No notifications yet</h5>
                <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                  System activity logs, settlement agreements, and verifications will appear here.
                </p>
              </div>
            ) : (
              cleanNotifications.map((notif) => {
                const isUnread = !notif.read;
                const { title, icon, badgeBg } = getNotificationVisuals(notif);

                return (
                  <div
                    key={notif.id || notif.timestamp}
                    onClick={() => handleClickNotificationItem(notif)}
                    className="p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100/80 transition-all flex items-start gap-3.5 cursor-pointer relative border border-slate-100/80 group"
                  >
                    {/* Left Circular Badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${badgeBg}`}>
                      {icon}
                    </div>

                    {/* Middle Text Details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-black text-slate-900 text-xs sm:text-[13px] leading-snug">
                        {title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5 break-words">
                        {notif.message || notif.details || ''}
                      </p>
                      <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                        {formatTimeAgo(notif.timestamp)}
                      </span>
                    </div>

                    {/* Blue Unread Dot on Top Right */}
                    {isUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0066FF] shrink-0 mt-1 shadow-2xs animate-pulse" />
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}
    </>
  );
}
