import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Building2, Globe, ChevronDown, Check, Search, 
  X, CheckCircle2 
} from 'lucide-react';

export default function SubOfficeSelectPicker({
  value = 'All',
  onChange,
  fullSubOffices = [],
  fallbackList = [],
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation: Escape closes dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Build clean, deduplicated sub-offices list (pure sub-offices, no franchise names)
  const subOfficesList = useMemo(() => {
    const list = [];
    const seenNames = new Set(['all']);

    // 1. Process fullSubOffices
    (fullSubOffices || []).forEach(so => {
      if (!so || !so.name) return;
      const lower = so.name.toLowerCase().trim();
      if (seenNames.has(lower)) return;
      seenNames.add(lower);
      list.push(so);
    });

    // 2. Add any fallback list items not already seen
    (fallbackList || []).forEach(nameStr => {
      if (!nameStr) return;
      const lower = nameStr.toLowerCase().trim();
      if (seenNames.has(lower)) return;
      seenNames.add(lower);
      list.push({
        name: nameStr,
        location: ''
      });
    });

    // Sort alphabetically by sub-office name
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [fullSubOffices, fallbackList]);

  // Filter sub-offices according to search query
  const filteredOffices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return subOfficesList;

    return subOfficesList.filter(o => {
      return (
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.location && o.location.toLowerCase().includes(q)) ||
        (o.head_name && o.head_name.toLowerCase().includes(q))
      );
    });
  }, [subOfficesList, searchQuery]);

  // Resolve currently selected office info
  const selectedOfficeObj = useMemo(() => {
    if (!value || value === 'All') return null;
    return subOfficesList.find(
      s => (s.name || '').toLowerCase().trim() === String(value).toLowerCase().trim()
    );
  }, [value, subOfficesList]);

  const handleSelect = (officeName) => {
    if (onChange) {
      onChange(officeName);
    }
    setIsOpen(false);
  };

  const isAllSelected = !value || value === 'All';
  const showAllInSearch = !searchQuery || 'all branches global central operations hq'.includes(searchQuery.toLowerCase());

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full bg-slate-50 hover:bg-white border rounded-xl px-3 py-2 text-left transition-all duration-150 flex items-center justify-between gap-2 shadow-2xs group cursor-pointer ${
          isOpen 
            ? 'border-[#002B66] ring-2 ring-[#002B66]/15 bg-white' 
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            isAllSelected 
              ? 'bg-[#002B66] text-[#FFD700]' 
              : 'bg-blue-50 text-[#002B66] border border-blue-200'
          }`}>
            {isAllSelected ? <Globe size={15} /> : <Building2 size={15} />}
          </div>

          <div className="min-w-0 flex-1">
            <span className="font-extrabold text-slate-900 text-xs truncate block">
              {isAllSelected ? 'All Branches (Global Central HQ)' : (selectedOfficeObj?.name || value)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {isAllSelected 
                ? 'Full system enterprise access' 
                : (selectedOfficeObj?.location || 'Assigned Sub-Office Branch')}
            </span>
          </div>
        </div>

        <div className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
          isOpen ? 'rotate-180 text-[#002B66]' : ''
        }`}>
          <ChevronDown size={16} />
        </div>
      </button>

      {/* DROPDOWN MENU POPOVER */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-80 sm:max-h-96">
          
          {/* SEARCH BAR HEADER */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search sub-offices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-8 pr-7 py-1.5 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#002B66] focus:ring-1 focus:ring-[#002B66]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* SCROLLABLE ITEMS LIST */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-1.5 text-xs">
            
            {/* OPTION 1: ALL BRANCHES (GLOBAL ACCESS) */}
            {showAllInSearch && (
              <div
                onClick={() => handleSelect('All')}
                className={`p-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all ${
                  isAllSelected
                    ? 'bg-gradient-to-r from-blue-50/90 to-amber-50/70 border border-blue-200 text-[#002B66]'
                    : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    isAllSelected ? 'bg-[#002B66] text-[#FFD700]' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Globe size={15} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs block text-[#002B66]">
                      All Branches (Global Central HQ)
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      Full view across all {subOfficesList.length} sub-offices
                    </span>
                  </div>
                </div>

                {isAllSelected && (
                  <CheckCircle2 size={16} className="text-[#002B66] shrink-0" />
                )}
              </div>
            )}

            {/* PURE SUB-OFFICES LIST (NO FRANCHISE LABELS) */}
            <div className="space-y-0.5 pt-1">
              {filteredOffices.map((so) => {
                const isSelected = String(value).toLowerCase().trim() === (so.name || '').toLowerCase().trim();

                return (
                  <div
                    key={so.name}
                    onClick={() => handleSelect(so.name)}
                    className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#002B66] text-white shadow-xs'
                        : 'hover:bg-blue-50/70 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        isSelected 
                          ? 'bg-white/20 text-[#FFD700]' 
                          : 'bg-slate-100 text-[#002B66]'
                      }`}>
                        <Building2 size={14} />
                      </div>

                      <div className="min-w-0">
                        <span className={`font-bold text-xs block truncate ${
                          isSelected ? 'text-white' : 'text-slate-900'
                        }`}>
                          {so.name}
                        </span>
                        <span className={`text-[10px] block truncate ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                          {so.location || 'Branch Office'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1 text-[#FFD700] shrink-0 font-bold text-[10px]">
                        <Check size={14} strokeWidth={3} />
                        <span>Selected</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* EMPTY STATE */}
            {filteredOffices.length === 0 && !showAllInSearch && (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <Search size={22} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold uppercase text-slate-600">No sub-offices found</p>
                <p className="text-[10px] text-slate-400">
                  No sub-office matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>

          {/* FOOTER BAR */}
          <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 shrink-0 font-medium">
            <span>Select sub-office branch</span>
            <span className="font-mono">{subOfficesList.length} total branches</span>
          </div>

        </div>
      )}
    </div>
  );
}
