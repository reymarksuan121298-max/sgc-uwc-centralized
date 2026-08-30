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
