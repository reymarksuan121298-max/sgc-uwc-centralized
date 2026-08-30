import React, { useState } from 'react';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import { CheckCircle2, MessageSquare, ShieldAlert, X, ArrowRight, Bell } from 'lucide-react';

export default function MainLayout({
  currentUser,
  activeTab,
  onSelectTab,
  setActiveTab,
  onLogout,
  onSync,
  loading,
  isSyncing,
  toastMessage,
  returnedCount = 0,
  receiptsCount = 0,
  pendingReceiptsCount = 0,
  pendingTicketsChatCount = 0,
  onOpenTicketChat = null,
  onOpenBot = null,
  isSidebarOpen: controlledSidebarOpen,
  setIsSidebarOpen: setControlledSidebarOpen,
  notifications = [],
  onMarkNotificationRead = null,
  onMarkAllNotificationsRead = null,
  onClearNotifications = null,
  activeNotificationPopup = null,
  onDismissNotificationPopup = null,
  children
}) {
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);
  
  const isSidebarOpen = controlledSidebarOpen !== undefined ? controlledSidebarOpen : internalSidebarOpen;
  const setIsSidebarOpen = setControlledSidebarOpen || setInternalSidebarOpen;

  const handleSelectTab = onSelectTab || setActiveTab || (() => {});
  const syncLoading = isSyncing !== undefined ? isSyncing : Boolean(loading);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased selection:bg-[#002B66] selection:text-white overflow-hidden">
      
      {/* Realtime In-App / Mobile Notification Banner Popup */}
      {activeNotificationPopup && (
        <div 
          onClick={() => {
            if (activeNotificationPopup.type === 'chat') {
              if (onOpenTicketChat) {
                if (activeNotificationPopup.roomId) {
                  onOpenTicketChat({
                    id: activeNotificationPopup.roomId,
                    name: activeNotificationPopup.senderName,
                    sub_office: activeNotificationPopup.subOffice || '',
                    isGroup: String(activeNotificationPopup.roomId).startsWith('group-')
                  });
                } else {
                  onOpenTicketChat({
                    id: activeNotificationPopup.senderId || activeNotificationPopup.senderName,
                    username: activeNotificationPopup.senderName,
                    full_name: activeNotificationPopup.senderName,
                    sub_office: activeNotificationPopup.subOffice || ''
                  });
                }
              }
            } else if (activeNotificationPopup.type === 'audit') {
              handleSelectTab('audit_logs');
            }
            if (onDismissNotificationPopup) onDismissNotificationPopup();
          }}
          className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-[10005] bg-gradient-to-r from-[#001D47] to-[#002B66] text-white p-3 rounded-2xl shadow-2xl border-2 border-[#FFD700]/40 flex items-center gap-3 animate-in slide-in-from-top-4 duration-200 cursor-pointer active:scale-98 hover:shadow-cyan-900/30"
        >
          <div className="shrink-0">
            {activeNotificationPopup.type === 'chat' ? (
              <div className="w-9 h-9 rounded-full bg-[#FFD700] text-[#002B66] flex items-center justify-center font-black text-sm font-mono shadow-xs">
                {(activeNotificationPopup.senderName || 'U')[0].toUpperCase()}
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-purple-500/30 text-purple-200 border border-purple-300/40 flex items-center justify-center shadow-xs">
                <ShieldAlert size={18} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#FFD700] flex items-center gap-1">
                <Bell size={10} />
                {activeNotificationPopup.type === 'chat' ? 'New Message' : 'Audit Activity'}
              </span>
              <span className="text-[9px] text-blue-200 font-mono">Just now</span>
            </div>
            <h5 className="font-extrabold text-xs text-white truncate">
              {activeNotificationPopup.title || activeNotificationPopup.senderName || 'Notification'}
            </h5>
            <p className="text-[11px] text-blue-100 truncate">
              {activeNotificationPopup.message || ''}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onDismissNotificationPopup) onDismissNotificationPopup();
              }}
              className="p-1 text-blue-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border-l-4 border-[#FFD700] text-xs font-semibold animate-bounce max-w-sm sm:max-w-md mx-auto">
          <CheckCircle2 size={16} className="text-[#FFD700] shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Reusable Enterprise Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        onLogout={onLogout}
        returnedCount={returnedCount}
        receiptsCount={receiptsCount}
        pendingReceiptsCount={pendingReceiptsCount}
        pendingTicketsChatCount={pendingTicketsChatCount}
        onOpenTicketChat={onOpenTicketChat}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full min-w-0">
        <Header
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          onSync={onSync}
          loading={syncLoading}
          currentUser={currentUser}
          onLogout={onLogout}
          pendingTicketsChatCount={pendingTicketsChatCount}
          onOpenTicketChat={onOpenTicketChat}
          onOpenBot={onOpenBot}
          notifications={notifications}
          onMarkNotificationRead={onMarkNotificationRead}
          onMarkAllNotificationsRead={onMarkAllNotificationsRead}
          onClearNotifications={onClearNotifications}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 md:p-6 bg-slate-100 w-full min-w-0">
          <div className="w-full space-y-4 min-w-0">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
