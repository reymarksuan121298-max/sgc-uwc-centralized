import React from 'react';
import { Users, Search, Plus, ArrowRight } from 'lucide-react';
import { formatRoleName } from '../../utils/permissions';
import { presenceService } from '../../services/presenceService';

export default function HeaderMessengerWidget({
  isMiniWidgetOpen,
  setIsMiniWidgetOpen,
  filteredUsers,
  filteredGroups,
  canCreateGroup,
  setIsCreateGroupOpen,
  isSSR,
  userSearch,
  setUserSearch,
  chatCategory,
  latestMessages,
  currentUser,
  readTimes,
  markAsRead,
  onOpenTicketChat,
  formatMsgTime,
  getUserAvatarColor,
  onlineUserIds = new Set()
}) {
  const onlineCount = (filteredUsers || []).filter(u => presenceService.isUserOnline(u, onlineUserIds)).length + (currentUser ? 1 : 0);

  return (
    <>
      {/* MESSENGER ACTIVE USERS DROPDOWN */}
      {isMiniWidgetOpen && (
            <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-xs z-[10002] animate-in fade-in zoom-in-95 space-y-3 max-h-[82vh] overflow-y-auto">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-slate-900 uppercase tracking-wide">Cashier & Team Desk</h4>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {onlineCount} Active Now
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
                                <div className={`w-9 h-9 rounded-full ${user.avatar_url ? 'bg-slate-100' : avatarBg} flex items-center justify-center font-mono font-black text-xs border-2 border-white shadow-xs overflow-hidden shrink-0`}>
                                  {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                                  ) : (
                                    initial
                                  )}
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
    </>
  );
}