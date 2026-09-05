import React from 'react';
import { 
  Landmark, X, ShieldCheck, LogOut, Coins, CheckCircle2, 
  CalendarCheck, ArrowLeftRight, Receipt, FileText, Users, Settings, Clock, CreditCard, Building2,
  MessageSquare, Sparkles
} from 'lucide-react';
import { isSuperAdminRole, isSSRRole, isAdminRole, formatRoleName } from '../../utils/permissions';

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab = () => {},
  currentUser,
  onLogout,
  returnedCount = 0,
  receiptsCount = 0,
  pendingReceiptsCount = 0,
  pendingTicketsChatCount = 0,
  onOpenTicketChat = null
}) {
  const isSuperAdmin = isSuperAdminRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);
  const isSSR = isSSRRole(currentUser?.role);

  let navItems = [];
  if (isSuperAdmin || isAdmin) {
    navItems = [
      { id: 'dashboard', label: 'Dashboard', Icon: ShieldCheck },
      { id: 'collections', label: 'Collections & Commissions', Icon: Coins },
      { id: 'pending', label: 'Unclaimed Winnings', Icon: CalendarCheck },
      { id: 'returned', label: 'Returned Winnings', Icon: ArrowLeftRight, badge: returnedCount },
      { id: 'receipts', label: 'Remittance Proofs', Icon: Receipt, badge: receiptsCount },
      { id: 'settlement', label: 'Settlement Agreements', Icon: FileText },
      { id: 'suboffices', label: 'Sub-Office Branches', Icon: Building2 },
      { id: 'users', label: 'User Accounts', Icon: Users },
      { id: 'config', label: 'System Configuration', Icon: Settings },
      { id: 'audit', label: 'Audit Logs', Icon: Clock },
    ];
  } else if (isSSR) {
    navItems = [
      { id: 'pending', label: 'Unclaimed Winnings', Icon: CalendarCheck },
      { id: 'returned', label: 'Returned Winnings', Icon: ArrowLeftRight, badge: returnedCount },
      { id: 'settlement', label: 'Settlement Agreements', Icon: FileText },
    ];
  } else {
    navItems = [
      { id: 'collections', label: 'Collections & Commissions', Icon: Coins },
      { id: 'pending', label: 'Unclaimed Winnings', Icon: CalendarCheck },
      { id: 'returned', label: 'Returned Winnings', Icon: ArrowLeftRight, badge: returnedCount },
      { id: 'receipts', label: 'Remittance Proofs', Icon: Receipt, badge: receiptsCount },
      { id: 'settlement', label: 'Settlement Agreements', Icon: FileText },
    ];
  }

  const isItemActive = (id) => {
    if (activeTab === id) return true;
    if (id === 'dashboard' && activeTab === 'superadmin') return true;
    if (id === 'pending' && activeTab === 'unclaimed') return true;
    if (id === 'verification' && activeTab === 'remittance_verification') return true;
    if (id === 'config' && activeTab === 'system_config') return true;
    if (id === 'audit' && activeTab === 'audit_logs') return true;
    return false;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      {/* Enterprise Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#002B66] text-white flex flex-col justify-between transform transition-transform duration-200 ease-in-out border-r border-blue-950 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="overflow-y-auto">
          {/* Top Brand Header */}
          <div className="p-4 border-b border-blue-900/60 flex items-center justify-between bg-[#001D47]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-[#FFD700] p-2 rounded-lg text-[#002B66] shadow-md shrink-0">
                <Landmark size={20} className="stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xs font-extrabold tracking-wider text-white uppercase leading-snug break-words">CENTRALIZED</h1>
                <span className="text-[9px] text-[#FFD700] font-bold uppercase tracking-widest block mt-0.5">Unclaimed Winnings</span>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 py-3 bg-blue-950/50 text-[10px] font-bold text-blue-300 uppercase tracking-wider border-b border-blue-900/40 flex items-center justify-between">
            <span>{isSuperAdmin ? 'Superadmin Suite' : isSSR ? 'SSR Remittance Portal' : 'Branch Navigation'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map(({ id, label, Icon, badge }) => {
              const active = isItemActive(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { 
                    if (id === 'ticket_chat' && typeof onOpenTicketChat === 'function') {
                      onOpenTicketChat();
                    } else if (typeof onSelectTab === 'function') {
                      onSelectTab(id); 
                    }
                    if (typeof onClose === 'function') onClose(); 
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                    active
                      ? 'bg-[#FFD700] text-[#002B66] shadow-lg font-black lg:translate-x-1' 
                      : 'hover:bg-blue-950/60 text-blue-100 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                  {badge > 0 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                      active ? 'bg-[#002B66] text-[#FFD700]' : 'bg-emerald-600 text-white shadow-xs'
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Profile Designation Section */}
        <div className="p-3.5 border-t border-blue-900/60 bg-[#001D47] shrink-0">
          <div className="bg-blue-950/80 p-3 rounded-2xl border border-blue-900/70 shadow-inner flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#002B66] border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700] font-mono font-black text-sm shrink-0 shadow-xs">
              {(currentUser?.full_name || currentUser?.fullName || currentUser?.username || 'Aizah Condrado')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black text-white block truncate tracking-tight">
                {currentUser?.full_name || currentUser?.fullName || currentUser?.username || 'Aizah Condrado'}
              </span>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-[#FFD700] text-[#002B66] uppercase shadow-2xs">
                  {formatRoleName(currentUser?.role) || 'Unclaimed Specialist'}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-900/80 text-blue-200 border border-blue-800/80 truncate max-w-[120px]">
                  {currentUser?.sub_office && currentUser.sub_office !== 'All' ? currentUser.sub_office : 'All'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
