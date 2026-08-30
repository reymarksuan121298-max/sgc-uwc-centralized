import React, { useState, useMemo } from 'react';
import { X, Users, Building2, Check, Sparkles, Plus, Search, ShieldCheck } from 'lucide-react';
import { formatRoleName, isSSRRole } from '../../utils/permissions';

export default function CreateGroupChatModal({
  isOpen,
  onClose,
  currentUser,
  activeUsers = [],
  onCreateGroup = () => {}
}) {
  const [groupName, setGroupName] = useState('');
  const [selectedSubOffice, setSelectedSubOffice] = useState('All');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Extract all available sub-offices from activeUsers
  const availableSubOffices = useMemo(() => {
    const offices = new Set(['All']);
    activeUsers.forEach(u => {
      if (u.sub_office && u.sub_office.trim()) {
        offices.add(u.sub_office.trim());
      }
    });
    return Array.from(offices);
  }, [activeUsers]);

  // Filter eligible members (Sales Service Representatives)
  const eligibleSSRs = useMemo(() => {
    return activeUsers.filter(u => {
      // Prioritize Sales Service Representatives, but allow all non-self users if desired
      const isSSR = isSSRRole(u.role);
      const matchesOffice = selectedSubOffice === 'All' || u.sub_office === selectedSubOffice;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.sub_office || '').toLowerCase().includes(q);

      return isSSR && matchesOffice && matchesSearch;
    });
  }, [activeUsers, selectedSubOffice, searchQuery]);

  const handleToggleMember = (userId) => {
    setSelectedMemberIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = eligibleSSRs.map(u => u.id || u.username);
    const allSelected = allFilteredIds.every(id => selectedMemberIds.includes(id));
    if (allSelected) {
      setSelectedMemberIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedMemberIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMsg('Please enter a valid Group Name.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setErrorMsg('Please select at least 1 Sales Service Representative member.');
      return;
    }

    const selectedMembers = activeUsers.filter(u => 
      selectedMemberIds.includes(u.id || u.username)
    );

    const newGroup = {
      id: `group-${crypto.randomUUID()}`,
      name: groupName.trim(),
      sub_office: selectedSubOffice,
      isGroup: true,
      created_by: currentUser?.full_name || currentUser?.username || 'Unclaimed Specialist',
      created_by_role: formatRoleName(currentUser?.role) || 'Unclaimed Specialist',
      created_at: new Date().toISOString(),
      member_ids: selectedMemberIds,
      members: selectedMembers.map(u => ({
        id: u.id || u.username,
        name: u.full_name || u.username,
        role: formatRoleName(u.role),
        sub_office: u.sub_office || 'Mandaue Central'
      }))
    };

    onCreateGroup(newGroup);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#002B66] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#FFD700]">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Create SSR Group Chat</h3>
              <p className="text-[11px] text-blue-200 font-medium">Unclaimed Specialist & Field Team Channel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Group Chat Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Consolacion Field SSRs, Morning Draw Verifications"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#002B66] focus:ring-2 focus:ring-[#002B66]/10 outline-none transition-all"
            />
          </div>

          {/* Sub-Office Filter */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Target Branch / Sub-Office
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableSubOffices.map(office => (
                <button
                  key={office}
                  type="button"
                  onClick={() => setSelectedSubOffice(office)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    selectedSubOffice === office
                      ? 'bg-[#002B66] text-[#FFD700] border-[#002B66] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {office}
                </button>
              ))}
            </div>
          </div>

          {/* Member Selection Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Select Sales Service Representatives ({selectedMemberIds.length} Selected)
              </label>
              {eligibleSSRs.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[11px] font-bold text-[#0084FF] hover:underline cursor-pointer"
                >
                  Select All
                </button>
              )}
            </div>

            {/* Member Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter representatives by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#002B66] outline-none"
              />
            </div>

            {/* Members List */}
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 space-y-1 bg-slate-50/50">
              {eligibleSSRs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-medium">
                  No Sales Service Representatives found for {selectedSubOffice}.
                </div>
              ) : (
                eligibleSSRs.map(user => {
                  const uid = user.id || user.username;
                  const isSelected = selectedMemberIds.includes(uid);

                  return (
                    <div
                      key={uid}
                      onClick={() => handleToggleMember(uid)}
                      className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                        isSelected 
                          ? 'bg-blue-50/90 border-blue-200 text-[#002B66]' 
                          : 'bg-white hover:bg-slate-100/70 border-slate-200/80 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected 
                            ? 'bg-[#002B66] border-[#002B66] text-[#FFD700]' 
                            : 'bg-white border-slate-300'
                        }`}>
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs block truncate">
                            {user.full_name || user.username}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block truncate">
                            {user.sub_office || 'All Branches'} • Sales Service Representative
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#002B66] hover:bg-blue-900 text-[#FFD700] font-black px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Users size={14} />
              <span>Create Group Chat</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
