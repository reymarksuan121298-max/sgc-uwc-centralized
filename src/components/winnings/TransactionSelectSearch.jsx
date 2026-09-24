import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Ticket, Sparkles, User, DollarSign } from 'lucide-react';

export default function TransactionSelectSearch({
  tickets = [],
  selectedId = '',
  onSelect,
  placeholder = 'Select or search transaction ID...',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Helper to extract clean ticket ID
  const getTicketId = (t) => t?.transactionId || t?.transId || t?.receipt_no || t?.ticket_no || '';

  // Find currently selected ticket object
  const selectedTicket = useMemo(() => {
    return tickets.find((t) => getTicketId(t) === selectedId) || tickets[0] || null;
  }, [tickets, selectedId]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter tickets by search query
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase().trim().replace(/[\s-]+/g, '');

    return tickets.filter((item) => {
      const tid = getTicketId(item).toLowerCase().replace(/[\s-]+/g, '');
      const rawTid = getTicketId(item).toLowerCase();
      const name = (item.fullName || item.outlet || item.username || '').toLowerCase();
      const bet = String(item.betNo || item.CombiNo || '').toLowerCase();
      const office = (item.sub_office || item.subOffice || item.branch || '').toLowerCase();
      const amount = String(item.winAmount || '');

      return (
        tid.includes(q) ||
        rawTid.includes(searchQuery.toLowerCase().trim()) ||
        name.includes(searchQuery.toLowerCase().trim()) ||
        bet.includes(searchQuery.toLowerCase().trim()) ||
        office.includes(searchQuery.toLowerCase().trim()) ||
        amount.includes(searchQuery.toLowerCase().trim())
      );
    });
  }, [tickets, searchQuery]);

  const handleSelect = (ticket) => {
    const tid = getTicketId(ticket);
    onSelect?.(tid, ticket);
    setIsOpen(false);
  };

  const selectedTid = selectedTicket ? getTicketId(selectedTicket) : '';
  const selectedPayer = selectedTicket?.fullName || selectedTicket?.outlet || selectedTicket?.username || 'Accountable Payer';
  const selectedAmount = selectedTicket?.winAmount !== undefined ? parseFloat(selectedTicket.winAmount).toLocaleString() : '0';

  return (
    <div ref={containerRef} className={`relative w-full md:w-[420px] ${className}`}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-3 bg-white hover:bg-slate-50 border px-3.5 py-2.5 rounded-xl shadow-xs transition-all duration-150 cursor-pointer text-left outline-none ${
          isOpen
            ? 'border-[#002B66] ring-2 ring-[#002B66]/20 shadow-sm'
            : 'border-blue-200 hover:border-blue-300'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#002B66] flex items-center justify-center shrink-0 border border-blue-200">
            <Ticket size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-[#002B66] tracking-tight truncate">
                {selectedTid || placeholder}
              </span>
              {selectedTicket && (
                <span className="text-[10px] font-black px-1.5 py-0.2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded shrink-0">
                  ₱{selectedAmount}
                </span>
              )}
            </div>
            {selectedTicket && (
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {selectedPayer}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#002B66]' : ''}`}
          />
        </div>
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 mt-1.5 w-full bg-white rounded-2xl border border-blue-200/90 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top"
          role="listbox"
        >
          {/* Header Strip */}
          <div className="h-1 bg-gradient-to-r from-[#002B66] via-blue-600 to-[#FFD700]" />

          {/* SEARCH BAR INPUT */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transaction ID, payer name..."
                className="w-full bg-white border border-slate-300 pl-9 pr-8 py-2 text-xs font-semibold rounded-xl outline-none focus:border-[#002B66] focus:ring-2 focus:ring-[#002B66]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Results Count & Quick Hint */}
            <div className="flex items-center justify-between mt-2 px-1 text-[10.5px] font-bold text-slate-500">
              <span>
                {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'} available
                {searchQuery.trim() && ` matching "${searchQuery}"`}
              </span>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          {/* TICKET LIST */}
          <div className="p-2 max-h-72 overflow-y-auto space-y-1 custom-scrollbar">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((item, idx) => {
                const tid = getTicketId(item) || `TID-${idx}`;
                const isSelected = tid === selectedTid;
                const payer = item.fullName || item.outlet || item.username || 'Accountable Payer';
                const amt = parseFloat(item.winAmount || 0).toLocaleString();
                const office = item.sub_office || item.subOffice || item.branch;

                return (
                  <button
                    key={item.id || `${tid}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-xs transition-all text-left cursor-pointer group ${
                      isSelected
                        ? 'bg-[#002B66] text-white shadow-xs'
                        : 'hover:bg-blue-50/70 text-slate-700'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-mono font-bold ${
                          isSelected
                            ? 'bg-white/20 text-[#FFD700]'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-[#002B66]'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-xs tracking-tight ${
                              isSelected ? 'text-[#FFD700]' : 'text-[#002B66]'
                            }`}
                          >
                            {tid}
                          </span>
                        </div>

                        <div
                          className={`text-[11px] font-medium truncate mt-0.5 ${
                            isSelected ? 'text-white/80' : 'text-slate-600'
                          }`}
                        >
                          {payer}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span
                        className={`font-mono font-bold text-xs ${
                          isSelected ? 'text-emerald-300' : 'text-emerald-700'
                        }`}
                      >
                        ₱{amt}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#FFD700]">
                          <Check size={12} className="stroke-[3]" /> Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-8 px-4 text-center space-y-2">
                <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Search size={18} />
                </div>
                <p className="text-xs font-bold text-slate-700">No transaction matching "{searchQuery}"</p>
                <p className="text-[11px] text-slate-400">
                  Try searching by different digits of the transaction ID or claimant name.
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="inline-block mt-1 text-xs font-bold text-[#002B66] hover:underline"
                  >
                    Clear Search Query
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
