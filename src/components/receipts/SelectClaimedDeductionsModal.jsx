import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Check,
  X,
  Clock,
  CheckCircle2,
  Ticket,
  MinusCircle
} from 'lucide-react';

export default function SelectClaimedDeductionsModal({
  isOpen,
  onClose,
  items = [],
  selectedKeys = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  formatDrawTime
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Search filter
  const filteredItems = useMemo(() => {
    if (!items || !items.length) return [];
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase().trim();
    return items.filter(item => {
      const transId = String(item.transactionId || item.transId || item.transaction_id || '').toLowerCase();
      const teller = String(item.fullName || item.teller_outlet || item.outlet || item.username || '').toLowerCase();
      const betNo = String(item.betNo || item.bet_no || '').toLowerCase();
      const betCode = String(item.betCode || item.bet_code || '').toLowerCase();
      const reason = String(item.deletion_request_reason || item.reason || '').toLowerCase();
      return transId.includes(q) || teller.includes(q) || betNo.includes(q) || betCode.includes(q) || reason.includes(q);
    });
  }, [items, searchTerm]);

  // Selected totals
  const selectedCount = useMemo(() => {
    return items.filter(i => {
      const k = String(i.transactionId || i.transId || i.transaction_id || i.id).trim();
      return selectedKeys.has(k);
    }).length;
  }, [items, selectedKeys]);

  const selectedDeductionTotal = useMemo(() => {
    return items
      .filter(i => {
        const k = String(i.transactionId || i.transId || i.transaction_id || i.id).trim();
        return selectedKeys.has(k);
      })
      .reduce((sum, i) => sum + parseFloat(i.winAmount || i.win_amount || 0), 0);
  }, [items, selectedKeys]);

  const isAllSelected = items.length > 0 && selectedCount === items.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER - Pag-IBIG Navy & Gold */}
        <div className="bg-[#002B66] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#FFD700] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-wider text-xs sm:text-sm text-white flex items-center gap-2">
                Include Claimed Tickets in Remittance Batch
              </h3>
              <p className="text-[10px] text-blue-200">
                Select claimed Trans IDs to include in this batch. Their amounts will be deducted from your remittance total.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* NOTICE BANNER */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-tight">
            <span className="font-extrabold uppercase text-[10px] tracking-wide text-amber-800 block">
              Batch Addition & Remittance Deduction
            </span>
            <span className="text-[11px] text-amber-900">
              Claimed tickets requested for deletion will be included as additions in the batch report, and their winning liabilities will automatically be deducted from your Total Remittance Amount.
            </span>
          </div>
        </div>

        {/* SEARCH & SELECT CONTROLS */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Trans ID, Outlet, Bet No..."
              className="w-full bg-white border border-slate-300 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#002B66] focus:ring-1 focus:ring-[#002B66]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#002B66] border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>
            <div className="bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg text-right">
              <span className="text-[9px] font-extrabold text-rose-500 uppercase block leading-none">Deduction Total</span>
              <span className="font-mono text-xs font-black text-rose-700">
                -₱{selectedDeductionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* TABLE BODY */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold uppercase text-xs border border-dashed border-slate-200 rounded-xl">
              No claimed deletion tickets found.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#002B66]/5 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200 sticky top-0 bg-slate-100 z-10">
                  <tr>
                    <th className="p-2.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={onToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#002B66] focus:ring-[#002B66] cursor-pointer accent-[#002B66]"
                      />
                    </th>
                    <th className="p-2.5 border-l border-slate-200">Trans ID</th>
                    <th className="p-2.5 border-l border-slate-200">Outlet / Teller</th>
                    <th className="p-2.5 border-l border-slate-200 text-center">Draw / Combination</th>
                    <th className="p-2.5 border-l border-slate-200 text-right">Win / Deduct</th>
                    <th className="p-2.5 border-l border-slate-200">Reason / Requester</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredItems.map((item, idx) => {
                    const key = String(item.transactionId || item.transId || item.transaction_id || item.id || idx).trim();
                    const transId = item.transactionId || item.transId || item.transaction_id || `REC-${idx + 1}`;
                    const isChecked = selectedKeys.has(key);
                    const winAmt = parseFloat(item.winAmount || item.win_amount || 0);
                    const teller = item.fullName || item.teller_outlet || item.outlet || 'N/A';
                    const betNo = item.betNo || item.bet_no || 'N/A';
                    const betCode = item.betCode || item.bet_code || 'RS3';
                    const draw = item.drawTime || item.draw_time || 'N/A';
                    const reason = item.deletion_request_reason || item.reason || 'Ticket claimed';
                    const requester = item.requested_by || item.username || 'SSR';
                    const status = item.deletion_request_status || item.status || 'PENDING_APPROVAL';

                    return (
                      <tr
                        key={key}
                        onClick={() => onToggleSelect(key)}
                        className={`cursor-pointer transition-colors select-none ${
                          isChecked
                            ? 'bg-amber-50/70 hover:bg-amber-100/60 font-semibold'
                            : 'bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleSelect(key)}
                            className="w-4 h-4 rounded border-slate-300 text-[#002B66] focus:ring-[#002B66] cursor-pointer accent-[#002B66]"
                          />
                        </td>
                        <td className="p-2.5 border-l border-slate-200 font-mono font-bold text-[#002B66] whitespace-nowrap">
                          {transId}
                          <span className="block text-[9px] font-sans font-bold text-slate-400">
                            {item.sub_office || 'All'}
                          </span>
                        </td>
                        <td className="p-2.5 border-l border-slate-200 font-bold text-slate-800 uppercase whitespace-nowrap max-w-[220px] truncate" title={teller}>
                          {teller}
                        </td>
                        <td className="p-2.5 border-l border-slate-200 text-center whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-700">{betNo}</span>
                          <span className="text-[10px] font-extrabold text-[#002B66] ml-1">({betCode})</span>
                          <span className="block text-[10px] text-slate-500">
                            {formatDrawTime ? formatDrawTime(draw) : draw}
                          </span>
                        </td>
                        <td className="p-2.5 border-l border-slate-200 text-right whitespace-nowrap">
                          <span className="font-mono font-black text-rose-700 text-xs">
                            -₱{winAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="p-2.5 border-l border-slate-200 text-[10px] text-slate-500 max-w-[260px] truncate" title={reason}>
                          <span className="font-bold text-slate-700 block truncate">@{requester}</span>
                          <span className="text-slate-500 block truncate">{reason}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Ticket size={16} className="text-[#002B66]" />
            <span className="text-xs font-bold text-slate-700">
              <span className="font-black text-[#002B66]">{selectedCount}</span> of {items.length} ticket(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-white transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] rounded-xl font-black transition-colors cursor-pointer text-xs shadow-sm flex items-center gap-1.5"
            >
              <Check size={14} className="text-[#FFD700]" />
              Include & addition Trans IDs ({selectedCount} Selected • -₱{selectedDeductionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
