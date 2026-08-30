import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Menu, RefreshCw, MessageSquare, Bell, Search, 
  CheckCircle2, ArrowRight, X, Sparkles, ExternalLink,
  Users, Building2, ShieldCheck, UserCheck, Circle,
  ChevronDown, LogOut, User, Shield, Plus,
  Volume2, VolumeX, ShieldAlert, CheckCheck, Trash2,
  Sliders, BellOff, Info, Check
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { formatRoleName, isSSRRole, isUnclaimedSpecialistRole, isAdminRole } from '../../utils/permissions';
import { notificationService } from '../../services/notificationService';
import CreateGroupChatModal from '../chat/CreateGroupChatModal';
import AgentMascotAvatar from '../chat/AgentMascotAvatar';

// Deterministic avatar color helper
const getUserAvatarColor = (name = '', subOffice = '') => {
  const colors = [
    'bg-[#002B66] text-[#FFD700]',
    'bg-blue-600 text-white',
    'bg-emerald-600 text-white',
    'bg-teal-600 text-white',
    'bg-indigo-600 text-white',
    'bg-purple-600 text-white',
    'bg-rose-600 text-white',
    'bg-amber-600 text-white'
  ];
  const str = `${name}_${subOffice}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function Header({ 
  activeTab, 
  onSelectTab = null,
  onToggleSidebar, 
  onSync, 
  loading,
  currentUser,
  onLogout,
  pendingTicketsChatCount = 0,
  onOpenTicketChat = null,
  onOpenBot = null,
  notifications = [],
  onMarkNotificationRead = null,
  onMarkAllNotificationsRead = null,
  onClearNotifications = null
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMiniWidgetOpen, setIsMiniWidgetOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState('all'); // 'all' | 'chat' | 'audit'
  const [permissionStatus, setPermissionStatus] = useState(() => notificationService.getPermissionStatus());
  const [notifSettings, setNotifSettings] = useState(() => {
    const userKey = currentUser?.id || currentUser?.username || 'default';
    return notificationService.getSettings(userKey);
  });
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [chatCategory, setChatCategory] = useState('all'); // 'all' | 'groups' | 'direct'
  const [latestMessages, setLatestMessages] = useState({});

  // Track read status per conversation
  const [readTimes, setReadTimes] = useState(() => {
    try {
      const myKey = currentUser?.id || currentUser?.username || 'user';
      const saved = localStorage.getItem(`stl_chat_read_times_${myKey}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const markAsRead = (contactKey) => {
    if (!contactKey) return;
    const myKey = currentUser?.id || currentUser?.username || 'user';
    const nowIso = new Date().toISOString();
    setReadTimes((prev) => {
      const next = { ...prev, [contactKey]: nowIso };
      try {
        localStorage.setItem(`stl_chat_read_times_${myKey}`, JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };

  // Helper to format message time preview
  const formatMsgTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Custom persistent chat groups
  const [chatGroups, setChatGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('stl_custom_chat_groups');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'group-all-branches-ssr',
        name: 'All Branches SSR Desk',
        sub_office: 'All',
        isGroup: true,
        created_by: 'Mandaue Central',
        created_by_role: 'Unclaimed Specialist',
        members: []
      }
    ];
  });

  const isSSR = isSSRRole(currentUser?.role);
  const canCreateGroup = isUnclaimedSpecialistRole(currentUser?.role) || isAdminRole(currentUser?.role);

  const handleCreateGroup = (newGroup) => {
    setChatGroups(prev => {
      const updated = [newGroup, ...prev.filter(g => g.id !== newGroup.id)];
      localStorage.setItem('stl_custom_chat_groups', JSON.stringify(updated));
      return updated;
    });
    setIsMiniWidgetOpen(false);
    if (onOpenTicketChat) {
      onOpenTicketChat(newGroup);
    }
  };

  const profileRef = useRef(null);
  const messengerRef = useRef(null);
  const notificationRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (messengerRef.current && !messengerRef.current.contains(e.target)) {
        setIsMiniWidgetOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const userKey = currentUser?.id || currentUser?.username || 'default';

  // Request browser web push notification permission
  const handleRequestPermission = async () => {
    const res = await notificationService.requestPermission();
    setPermissionStatus(res);
    if (res === 'granted') {
      notificationService.playTone('chat', userKey);
    }
  };

  // Toggle notification settings
  const handleToggleSound = () => {
    const nextVal = !notifSettings.sound;
    const updated = notificationService.saveSettings(userKey, { sound: nextVal });
    setNotifSettings(updated);
    if (nextVal) notificationService.playTone('chat', userKey);
  };

  const handleToggleChatNotifs = () => {
    const updated = notificationService.saveSettings(userKey, { chatNotifications: !notifSettings.chatNotifications });
    setNotifSettings(updated);
  };

  const handleToggleAuditNotifs = () => {
    const updated = notificationService.saveSettings(userKey, { auditNotifications: !notifSettings.auditNotifications });
    setNotifSettings(updated);
  };

  // Click on a notification item
  const handleClickNotificationItem = (notif) => {
    if (!notif) return;
    if (onMarkNotificationRead) {
      onMarkNotificationRead(notif.id);
    }
    setIsNotificationOpen(false);

    if (notif.type === 'chat') {
      if (onOpenTicketChat) {
        if (notif.roomId) {
          onOpenTicketChat({
            id: notif.roomId,
            name: notif.senderName || 'Chat Room',
            sub_office: notif.subOffice || '',
            isGroup: String(notif.roomId).startsWith('group-')
          });
        } else {
          onOpenTicketChat({
            id: notif.senderId || notif.senderName,
            username: notif.senderName,
            full_name: notif.senderName,
            sub_office: notif.subOffice || ''
          });
        }
      }
    } else if (notif.type === 'audit') {
      if (onSelectTab) {
        onSelectTab('audit_logs');
      }
    }
  };

  const unreadNotificationsCount = useMemo(() => {
    return (notifications || []).filter(n => !n.read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const list = notifications || [];
    if (notificationTab === 'chat') return list.filter(n => n.type === 'chat');
    if (notificationTab === 'audit') return list.filter(n => n.type === 'audit');
    return list;
  }, [notifications, notificationTab]);

  // Fetch all active users from database
  const fetchActiveUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, full_name, role, sub_office, is_active, last_login_at')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (data && data.length > 0) {
        setActiveUsers(data);
      }
    } catch (err) {
      console.warn('Failed to load active users for header messenger:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch latest message snippets for previews
  const fetchLatestMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_verification_chats')
        .select('id, sender_id, sender_name, recipient_id, recipient_name, room_id, message_text, image_url, ocr_data, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        const myId = String(currentUser?.id || currentUser?.username || '').toLowerCase();
        const myName = String(currentUser?.full_name || currentUser?.username || '').toLowerCase();

        const map = {};
        data.forEach((msg) => {
          const sId = String(msg.sender_id || '').toLowerCase();
          const sName = String(msg.sender_name || '').toLowerCase();
          const rId = String(msg.recipient_id || msg.ocr_data?.recipient_id || '').toLowerCase();
          const rName = String(msg.recipient_name || msg.ocr_data?.recipient_name || '').toLowerCase();
          const roomId = msg.room_id || msg.ocr_data?.roomId;
          const isGroup = msg.ocr_data?.isGroup;

          if (isGroup || (roomId && roomId.startsWith('group-'))) {
            const gKey = roomId || 'group-all-branches-ssr';
            if (!map[gKey]) {
              map[gKey] = msg;
            }
          } else {
            // Direct 1-on-1
            let partnerId = null;
            let partnerName = null;
            if (sId === myId || sName === myName) {
              partnerId = rId;
              partnerName = rName;
            } else {
              partnerId = sId;
              partnerName = sName;
            }

            if (partnerId && !map[partnerId]) map[partnerId] = msg;
            if (partnerName && !map[partnerName]) map[partnerName] = msg;
            if (roomId && !map[roomId]) map[roomId] = msg;
          }
        });
        setLatestMessages(map);
      }
    } catch (err) {
      console.warn('Failed to load latest messages for previews:', err);
    }
  };

  useEffect(() => {
    fetchActiveUsers();
    fetchLatestMessages();

    // Listen to user status & new chat message updates in real-time
    const channelUsers = supabase
      .channel('header_active_users_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => {
        fetchActiveUsers();
      })
      .subscribe();

    const channelChats = supabase
      .channel('header_latest_chats_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_verification_chats' }, () => {
        fetchLatestMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelUsers);
      supabase.removeChannel(channelChats);
    };
  }, [currentUser]);

  // Filter users by role permissions, excluding the logged-in user, and applying search query
  const filteredUsers = useMemo(() => {
    let list = activeUsers.filter(u => {
      const isMyUsername = currentUser?.username && u.username?.toLowerCase() === currentUser.username.toLowerCase();
      const isMyId = currentUser?.id && String(u.id) === String(currentUser.id);
      const isMyName = currentUser?.full_name && u.full_name?.toLowerCase() === currentUser.full_name.toLowerCase();
      return !isMyUsername && !isMyId && !isMyName;
    });

    // When the logged-in user is a Sales Service Representative (SSR), only Admin and Unclaimed Specialist accounts appear
    if (isSSRRole(currentUser?.role)) {
      list = list.filter(u => isAdminRole(u.role) || isUnclaimedSpecialistRole(u.role));
    }

    const q = userSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(u => 
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (formatRoleName(u.role) || '').toLowerCase().includes(q) ||
      (u.sub_office || '').toLowerCase().includes(q)
    );
  }, [activeUsers, userSearch, currentUser]);

  // Filter groups visible to the current user
  const filteredGroups = useMemo(() => {
    let list = chatGroups;
    if (isSSRRole(currentUser?.role)) {
      list = list.filter(g => 
        g.sub_office === 'All' || 
        g.sub_office === currentUser?.sub_office ||
        g.member_ids?.includes(currentUser?.id || currentUser?.username)
      );
    }
    const q = userSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(g =>
      (g.name || '').toLowerCase().includes(q) ||
      (g.sub_office || '').toLowerCase().includes(q)
    );
  }, [chatGroups, userSearch, currentUser]);

  const getTabTitle = (tab) => {
    switch (tab) {
      case 'dashboard':
      case 'superadmin':
        return 'Superadmin Command Center';
      case 'collections':
        return 'Total Collections & Commission Remittance Ledger';
      case 'verification':
      case 'remittance_verification':
        return 'Remittance Proofs Verification Desk';
      case 'users':
        return 'User Accounts & Access Management';
      case 'config':
      case 'system_config':
        return 'System Settings & Configurations';
      case 'audit':
      case 'audit_logs':
        return 'Enterprise Immutable Activity Logs';
      case 'receipts':
        return 'Sub-Office Remittance Receipts';
      case 'suboffices':
        return 'Sub-Office Branches Management';
      case 'settlement':
        return 'Settlement Agreements Management';
      case 'returned':
        return 'Returned Winnings Official Audit Trail & Remittance';
      case 'pending':
      case 'unclaimed':
      default:
        return 'Unclaimed Winnings Official Registry';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-3 sm:px-5 md:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs z-20 shrink-0 w-full min-w-0">
      
      {/* LEFT SECTION: BRAND TAB TITLE */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button 
          type="button"
          onClick={onToggleSidebar} 
          className="lg:hidden p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 shrink-0 cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md hidden sm:inline">
              MANDAUE STL PORTAL
            </span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Gateway Active
            </span>
          </div>
          <h1 className="text-sm sm:text-base font-black text-[#002B66] truncate uppercase tracking-tight">
            {getTabTitle(activeTab)}
          </h1>
        </div>
      </div>

      {/* RIGHT ACTION CONTROLS */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* MANUAL SYNC BUTTON */}
        <button
          type="button"
          onClick={onSync}
          disabled={loading}
          className="flex items-center gap-1.5 sm:gap-2 bg-[#002B66] hover:bg-blue-900 text-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black tracking-wider uppercase transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-95 shrink-0"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[#FFD700]' : 'text-[#FFD700]'} />
          <span className="hidden sm:inline">{loading ? 'Syncing...' : 'SYNC LEDGER'}</span>
        </button>


        {/* WEB MESSENGER ACTIVE USERS & CLAIM VERIFICATION WIDGET */}
        <div className="relative" ref={messengerRef}>
          <button
            type="button"
            onClick={() => {
              setIsMiniWidgetOpen(!isMiniWidgetOpen);
              if (pendingTicketsChatCount > 0 && currentUser) {
                const userKey = currentUser.id || currentUser.username || 'user';
                localStorage.setItem(`stl_chat_last_read_${userKey}`, new Date().toISOString());
              }
            }}
            className={`p-2 rounded-full transition-all cursor-pointer relative shadow-2xs ${
              isMiniWidgetOpen 
                ? 'bg-[#002B66] text-[#FFD700] ring-2 ring-[#FFD700]' 
                : 'text-[#002B66] hover:bg-blue-50 border border-blue-200'
            }`}
            title="Active Users & Claim Verification Desk"
          >
            <MessageSquare size={17} />
            {pendingTicketsChatCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-mono text-[9.5px] font-black min-w-[19px] h-[19px] px-1 rounded-full flex items-center justify-center animate-bounce shadow-md border-2 border-white z-10">
                {pendingTicketsChatCount > 99 ? '99+' : pendingTicketsChatCount}
              </span>
            ) : (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            )}
          </button>

          {/* MESSENGER ACTIVE USERS DROPDOWN */}
          {isMiniWidgetOpen && (
            <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-xs z-[10002] animate-in fade-in zoom-in-95 space-y-3">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-slate-900 uppercase tracking-wide">Cashier & Team Desk</h4>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {filteredUsers.length + filteredGroups.length} Active
                    </span>
                  </div>
                </div>

                {/* Create Group Button for Unclaimed Specialists & Admins */}
                {canCreateGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMiniWidgetOpen(false);
                      setIsCreateGroupOpen(true);
                    }}
                    className="bg-[#002B66] hover:bg-blue-900 text-[#FFD700] text-[10px] font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
                    title="Create Group Chat with Sales Service Representatives"
                  >
                    <Plus size={12} className="stroke-[3]" />
                    <span>New Group</span>
                  </button>
                )}
              </div>



              {/* Live Search Box */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={isSSR ? "Search Admin, Group, or branch..." : "Search representative, group, or branch..."}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#002B66] outline-none"
                />
                {userSearch && (
                  <button 
                    onClick={() => setUserSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Messenger List Body */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5 divide-y divide-slate-50">
                
                {/* 1. Group Channels Section */}
                {(chatCategory === 'all' || chatCategory === 'groups') && filteredGroups.length > 0 && (
                  <div className="space-y-1 pb-1">
                    {chatCategory === 'all' && (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1 pt-1">
                        Group Channels
                      </span>
                    )}
                    {filteredGroups.map((group) => {
                      const groupKey = group.id;
                      const latestMsg = latestMessages[group.id] || latestMessages['group-all-branches-ssr'];
                      const isMeSender = latestMsg && (
                        String(latestMsg.sender_id) === String(currentUser?.id) ||
                        String(latestMsg.sender_name).toLowerCase() === String(currentUser?.full_name || currentUser?.username).toLowerCase()
                      );
                      const lastRead = readTimes[groupKey];
                      const isUnread = latestMsg && !isMeSender && (!lastRead || new Date(latestMsg.created_at).getTime() > new Date(lastRead).getTime());

                      return (
                        <div
                          key={group.id}
                          onClick={() => {
                            markAsRead(groupKey);
                            setIsMiniWidgetOpen(false);
                            if (onOpenTicketChat) onOpenTicketChat(group);
                          }}
                          className={`group flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                            isUnread 
                              ? 'bg-blue-100/70 hover:bg-blue-100 border-blue-300 shadow-2xs' 
                              : 'bg-blue-50/40 hover:bg-blue-50/90 border-blue-100/60 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-[#002B66] text-[#FFD700] flex items-center justify-center text-xs font-black shadow-xs shrink-0 relative">
                              <Users size={16} />
                              {isUnread && (
                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#0084FF] border-2 border-white animate-pulse" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`text-xs truncate ${isUnread ? 'font-black text-slate-950' : 'font-extrabold text-slate-900 group-hover:text-[#002B66]'}`}>
                                    {group.name}
                                  </span>
                                  <span className="bg-[#FFD700] text-[#002B66] text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase shrink-0">
                                    Group
                                  </span>
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-[#0084FF] shrink-0 animate-pulse" title="New Message" />
                                  )}
                                </div>
                                {latestMsg && (
                                  <span className={`text-[9.5px] font-mono shrink-0 ${isUnread ? 'text-[#0084FF] font-black' : 'text-slate-400'}`}>
                                    {formatMsgTime(latestMsg.created_at)}
                                  </span>
                                )}
                              </div>

                              {latestMsg ? (
                                <p className={`text-[10.5px] truncate leading-tight mt-0.5 ${isUnread ? 'font-black text-slate-950' : 'text-slate-600 font-normal'}`}>
                                  <span className={isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}>
                                    {latestMsg.sender_name?.split(' ')[0]}:{' '}
                                  </span>
                                  {latestMsg.image_url ? '📷 Ticket Receipt Photo' : (latestMsg.message_text || 'Sent an attachment')}
                                </p>
                              ) : (
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                                  <span className="font-bold text-slate-500 truncate">
                                    {group.sub_office || 'All Branches'}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-semibold text-blue-700 truncate">
                                    {group.members?.length ? `${group.members.length} SSRs` : 'All SSRs'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 pl-2 text-right">
                            <span className="hidden group-hover:inline-flex items-center gap-1 text-[10px] font-black text-[#002B66] bg-[#FFD700] px-2 py-0.5 rounded-lg shadow-2xs">
                              <span>Open</span>
                              <ArrowRight size={10} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Direct Messages Section */}
                {(chatCategory === 'all' || chatCategory === 'direct') && (
                  <div className="space-y-1 pt-1">
                    {chatCategory === 'all' && filteredGroups.length > 0 && (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1 pt-1">
                        Direct Messages
                      </span>
                    )}
                    {!filteredUsers.length ? (
                      <div className="py-6 text-center text-slate-400 font-medium">
                        <Users size={20} className="mx-auto mb-1 text-slate-300" />
                        <span>{isSSR ? 'No active Admin or Unclaimed Specialist found.' : 'No active users found.'}</span>
                      </div>
                    ) : (
                      filteredUsers.map((user) => {
                        const userKey = user.id || user.username;
                        const avatarBg = getUserAvatarColor(user.full_name || user.username, user.sub_office);
                        const initial = (user.full_name || user.username || 'U')[0].toUpperCase();
                        const latestMsg = latestMessages[String(user.id).toLowerCase()] || 
                                          latestMessages[String(user.username).toLowerCase()] ||
                                          latestMessages[String(user.full_name || '').toLowerCase()];

                        const isMeSender = latestMsg && (
                          String(latestMsg.sender_id) === String(currentUser?.id) ||
                          String(latestMsg.sender_name).toLowerCase() === String(currentUser?.full_name || currentUser?.username).toLowerCase()
                        );

                        const lastRead = readTimes[userKey] || readTimes[user.username] || (user.id ? readTimes[user.id] : null);
                        const isUnread = latestMsg && !isMeSender && (!lastRead || new Date(latestMsg.created_at).getTime() > new Date(lastRead).getTime());

                        return (
                          <div
                            key={user.id || user.username}
                            onClick={() => {
                              markAsRead(userKey);
                              setIsMiniWidgetOpen(false);
                              if (onOpenTicketChat) onOpenTicketChat(user);
                            }}
                            className={`group flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                              isUnread 
                                ? 'bg-blue-50/90 hover:bg-blue-100/90 border-blue-200 shadow-2xs' 
                                : 'hover:bg-slate-100/80 border-transparent hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="relative shrink-0">
                                <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center font-mono font-black text-xs border-2 border-white shadow-xs`}>
                                  {initial}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                                {isUnread && (
                                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#0084FF] border-2 border-white animate-pulse" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`text-xs truncate ${isUnread ? 'font-black text-slate-950' : 'font-extrabold text-slate-900 group-hover:text-[#002B66]'}`}>
                                      {user.full_name || user.username}
                                    </span>
                                    {isUnread && (
                                      <span className="w-2 h-2 rounded-full bg-[#0084FF] shrink-0 animate-pulse" title="New Message" />
                                    )}
                                  </div>
                                  {latestMsg && (
                                    <span className={`text-[9.5px] font-mono shrink-0 ${isUnread ? 'text-[#0084FF] font-black' : 'text-slate-400'}`}>
                                      {formatMsgTime(latestMsg.created_at)}
                                    </span>
                                  )}
                                </div>

                                {latestMsg ? (
                                  <p className={`text-[10.5px] truncate leading-tight mt-0.5 ${isUnread ? 'font-black text-slate-950' : 'text-slate-600 font-normal'}`}>
                                    {isMeSender && <span className="font-bold text-slate-800">You: </span>}
                                    {latestMsg.image_url ? '📷 Ticket Photo' : (latestMsg.message_text || 'Sent an attachment')}
                                  </p>
                                ) : (
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                                    <span className="font-bold text-slate-500 truncate">
                                      {user.sub_office || 'All'}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="font-semibold text-emerald-700 truncate">
                                      {formatRoleName(user.role)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 pl-2 text-right">
                              <span className="hidden group-hover:inline-flex items-center gap-1 text-[10px] font-black text-[#002B66] bg-[#FFD700] px-2 py-0.5 rounded-lg shadow-2xs">
                                <span>Chat</span>
                                <ArrowRight size={10} />
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/* NOTIFICATIONS CENTER BELL & DROPDOWN */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className={`p-2 rounded-full transition-all cursor-pointer relative border ${
              isNotificationOpen
                ? 'bg-blue-50/90 text-[#002B66] border-[#002B66]/30 ring-2 ring-[#002B66]/15'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
            }`}
            title="System & Chat Notifications"
          >
            <Bell size={17} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION CENTER DROPDOWN / MOBILE POPUP PANEL */}
          {isNotificationOpen && (
            <>
              {/* Mobile Backdrop Overlay */}
              <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10001] sm:hidden animate-in fade-in duration-150"
                onClick={() => setIsNotificationOpen(false)}
              />

              <div className="fixed inset-x-2.5 top-14 bottom-6 sm:bottom-auto sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 max-h-[85vh] sm:max-h-[540px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[10002] animate-in fade-in zoom-in-95 flex flex-col">
              
              {/* Header */}
              <div className="p-3.5 bg-gradient-to-r from-[#001D47] to-[#002B66] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#FFD700]">
                    <Bell size={15} />
                  </div>
                  <div>
                    <h4 className="font-black text-xs tracking-tight uppercase flex items-center gap-1.5">
                      <span>Notifications</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="bg-[#FFD700] text-[#002B66] text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                          {unreadNotificationsCount} new
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-blue-200/80 font-medium">Real-time chat & audit log feed</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Sound Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      notifSettings.sound ? 'text-[#FFD700] hover:bg-white/10' : 'text-slate-400 hover:bg-white/10'
                    }`}
                    title={notifSettings.sound ? 'Notification Chimes: ON (Click to Mute)' : 'Notification Chimes: MUTED (Click to Enable)'}
                  >
                    {notifSettings.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  </button>

                  {/* Mark All As Read */}
                  {unreadNotificationsCount > 0 && onMarkAllNotificationsRead && (
                    <button
                      type="button"
                      onClick={onMarkAllNotificationsRead}
                      className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck size={15} />
                    </button>
                  )}

                  {/* Clear All */}
                  {(notifications || []).length > 0 && onClearNotifications && (
                    <button
                      type="button"
                      onClick={onClearNotifications}
                      className="p-1.5 text-blue-200 hover:text-rose-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      title="Clear notification history"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  {/* Close */}
                  <button
                    type="button"
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer ml-0.5"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Web Push Permission Banner */}
              {permissionStatus !== 'granted' && (
                <div className="bg-amber-50 border-b border-amber-200/80 p-2.5 px-3 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                    <p className="text-[11px] text-amber-900 font-semibold truncate">
                      Enable Web Push for background alerts
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="bg-[#002B66] text-[#FFD700] hover:bg-[#001D47] font-black text-[10px] uppercase px-2.5 py-1 rounded-md shadow-2xs shrink-0 cursor-pointer transition-all active:scale-95"
                  >
                    Allow
                  </button>
                </div>
              )}

              {/* Category Filter Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50/70 p-1 gap-1 text-[11px] font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setNotificationTab('all')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    notificationTab === 'all'
                      ? 'bg-white text-[#002B66] shadow-2xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({(notifications || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationTab('chat')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    notificationTab === 'chat'
                      ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare size={12} />
                  <span>Chats ({((notifications || []).filter(n => n.type === 'chat')).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationTab('audit')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    notificationTab === 'audit'
                      ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Shield size={12} />
                  <span>Audit ({((notifications || []).filter(n => n.type === 'audit')).length})</span>
                </button>
              </div>

              {/* Notification List Scroll Area */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[160px] max-h-[320px]">
                {filteredNotifications.length === 0 ? (
                  <div className="py-10 px-4 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <BellOff size={22} />
                    </div>
                    <h5 className="font-bold text-slate-700 text-xs">No notifications yet</h5>
                    <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                      Incoming chat messages and audit trail activities will appear here in real-time.
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const isUnread = !notif.read;
                    const isChat = notif.type === 'chat';

                    return (
                      <div
                        key={notif.id || notif.timestamp}
                        onClick={() => handleClickNotificationItem(notif)}
                        className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5 group ${
                          isUnread ? 'bg-blue-50/40 border-l-3 border-[#002B66]' : ''
                        }`}
                      >
                        {/* Icon / Avatar */}
                        <div className="shrink-0 mt-0.5">
                          {isChat ? (
                            <div className="w-8 h-8 rounded-full bg-[#002B66] text-[#FFD700] flex items-center justify-center font-black text-xs font-mono shadow-2xs">
                              {(notif.senderName || 'U')[0].toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center shadow-2xs">
                              <ShieldAlert size={15} />
                            </div>
                          )}
                        </div>

                        {/* Text Details */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="font-extrabold text-slate-900 text-xs truncate">
                              {notif.title || (isChat ? notif.senderName : notif.action)}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {formatMsgTime(notif.timestamp)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            {notif.message || notif.details || ''}
                          </p>

                          <div className="flex items-center gap-1.5 pt-0.5 text-[9px] font-mono">
                            {notif.subOffice && (
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                                {notif.subOffice}
                              </span>
                            )}
                            {notif.action && (
                              <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-1.5 py-0.2 rounded font-bold uppercase">
                                {notif.action.replace(/_/g, ' ')}
                              </span>
                            )}
                            {isUnread && (
                              <span className="text-[#002B66] font-black text-[9px] ml-auto">
                                • Unread
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Arrow on Hover */}
                        <div className="shrink-0 text-slate-300 group-hover:text-[#002B66] transition-colors self-center">
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Notification Center Footer Settings */}
              <div className="bg-slate-50 border-t border-slate-100 p-2.5 px-3 flex items-center justify-between text-[10px] font-semibold text-slate-500 shrink-0">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={notifSettings.chatNotifications}
                      onChange={handleToggleChatNotifs}
                      className="rounded text-[#002B66] focus:ring-0 cursor-pointer w-3 h-3"
                    />
                    <span>Chat Alerts</span>
                  </label>

                  <label className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={notifSettings.auditNotifications}
                      onChange={handleToggleAuditNotifs}
                      className="rounded text-[#002B66] focus:ring-0 cursor-pointer w-3 h-3"
                    />
                    <span>Audit Alerts</span>
                  </label>
                </div>

                <span className="font-mono text-[9px] text-slate-400">
                  {permissionStatus === 'granted' ? '🟢 Push Active' : '⚪ Push Inactive'}
                </span>
              </div>

            </div>
          </>
        )}
        </div>

        {/* COLLAPSIBLE USER PROFILE */}
        <div className="relative pl-1 border-l border-slate-200" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center gap-1 p-1 rounded-xl transition-all cursor-pointer ${
              isProfileOpen 
                ? 'bg-blue-50/80 ring-2 ring-[#002B66]/20' 
                : 'hover:bg-slate-100'
            }`}
            title="Toggle User Profile"
          >
            <div className="w-8 h-8 rounded-full bg-[#002B66] text-[#FFD700] border-2 border-white shadow-xs flex items-center justify-center font-black text-xs font-mono shrink-0">
              {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
            </div>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180 text-[#002B66]' : ''}`} />
          </button>

          {/* COLLAPSIBLE PROFILE DROPDOWN MENU */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-xs z-[10002] animate-in fade-in zoom-in-95 space-y-3.5">
              
              {/* Profile Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-11 h-11 rounded-full bg-[#002B66] text-[#FFD700] border-2 border-[#FFD700]/50 shadow-sm flex items-center justify-center font-black text-base font-mono shrink-0">
                  {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">
                    {currentUser?.full_name || currentUser?.username || 'Authenticated User'}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono font-semibold truncate">
                    @{currentUser?.username || 'user'}
                  </p>
                </div>
              </div>

              {/* Profile Metadata Pills */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-2 font-sans">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Shield size={12} className="text-[#002B66]" /> Role
                  </span>
                  <span className="font-extrabold text-[#002B66] bg-blue-100/70 px-2 py-0.5 rounded-md">
                    {formatRoleName(currentUser?.role)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Building2 size={12} className="text-[#002B66]" /> Sub-Office
                  </span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                    {currentUser?.sub_office && currentUser.sub_office !== 'All' ? currentUser.sub_office : 'All Branches'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Status
                  </span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active Session
                  </span>
                </div>
              </div>

              {/* Logout Action Button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-black py-2 px-3 rounded-xl text-center text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <LogOut size={13} className="text-rose-600" />
                  <span>LOG OUT</span>
                </button>
              )}

            </div>
          )}
        </div>

      </div>

      {/* CREATE SSR GROUP CHAT MODAL */}
      <CreateGroupChatModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        currentUser={currentUser}
        activeUsers={activeUsers}
        onCreateGroup={handleCreateGroup}
      />
    </header>
  );
}
