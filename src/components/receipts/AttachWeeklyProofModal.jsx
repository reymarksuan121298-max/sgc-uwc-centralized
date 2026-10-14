import React, { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { 
  X, UploadCloud, FileText, CheckCircle2, 
  Smartphone, Building2, Landmark, Image as ImageIcon, Loader2,
  AlertTriangle, ShieldCheck, Search, Sparkles, Eye
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { isAdminRole, isSuperAdminRole } from '../../utils/permissions';
import { generateRemittanceSerial, isEligibleForRemittanceProof, isInactiveTellerRecord } from '../../utils/formatters';
import SelectClaimedDeductionsModal from './SelectClaimedDeductionsModal';

// Fast Date Formatter (cached, avoids heavy toLocaleString overhead on every render)
const fastFormatTimestamp = (timestampStr) => {
  if (!timestampStr) return 'N/A';
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return timestampStr;
  }
};

// Helper key generators for robust identification
const getItemKey = (t) => String(t.id || t.transactionId || t.transId || '');

// 1. ISOLATED MEMOIZED TICKETS TABLE (Will NEVER re-render when user types in reference number / amount / sender info)
const BatchTicketsTable = memo(function BatchTicketsTable({
  items,
  selectedClaimedItems = [],
  selectedKeys,
  onToggleSelect,
  onToggleSelectAll,
  selectedWinTotal,
  selectedDeductionTotal = 0,
  totalWin,
  modalTableSearch,
  onSearchChange,
  formatDrawTime
}) {
  const masterCheckboxRef = React.useRef(null);
  const isAllSelected = items.length > 0 && items.every(i => selectedKeys.has(getItemKey(i)));
  const isSomeSelected = items.some(i => selectedKeys.has(getItemKey(i))) && !isAllSelected;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const selectedInViewCount = items.filter(i => selectedKeys.has(getItemKey(i))).length;
  const totalIncludedRecords = selectedInViewCount + (selectedClaimedItems?.length || 0);
  const totalPossibleRecords = items.length + (selectedClaimedItems?.length || 0);
  const netRemittanceTotal = Math.max(0, Number(selectedWinTotal || 0) - Number(selectedDeductionTotal || 0));

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={15} className="text-[#002B66] shrink-0" />
          <span className="font-extrabold text-[11px] text-[#002B66] uppercase tracking-wider truncate">
            Included Returned Winnings & Additions ({totalIncludedRecords} of {items.length + (selectedClaimedItems?.length || 0)} Total)
          </span>
          {selectedClaimedItems.length > 0 && (
            <span className="bg-amber-100 text-amber-800 border border-amber-300 font-black px-1.5 py-0.2 rounded text-[9.5px]">
              +{selectedClaimedItems.length} Claimed Included
            </span>
          )}
        </div>
        
        {/* Live Search & Quick Toggle inside Modal */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="text-[10px] font-bold text-[#002B66] hover:text-blue-800 bg-white hover:bg-blue-50 border border-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors shrink-0"
            title="Toggle selection for all tickets"
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>
          <div className="relative min-w-[150px] sm:min-w-[170px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets in batch..."
              value={modalTableSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white border border-slate-300 pl-7 pr-2 py-1 rounded-md text-[10px] font-medium text-slate-800 outline-none focus:border-[#002B66]"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full" title="Gross Returned Winnings">
              Gross: ₱{Number(selectedWinTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            {selectedDeductionTotal > 0 && (
              <span className="font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full" title="Claimed Deduction">
                -₱{Number(selectedDeductionTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-52 overflow-y-auto overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] sticky top-0 border-b border-slate-200 shadow-2xs z-10">
            <tr>
              <th className="px-2.5 py-1.5 border-r border-slate-200 text-center w-8">
                <input
                  ref={masterCheckboxRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#002B66] focus:ring-[#002B66] cursor-pointer accent-[#002B66]"
                  title={isAllSelected ? "Deselect all tickets" : "Select all tickets"}
                />
              </th>
              <th className="px-3 py-1.5 border-r border-slate-200">#</th>
              <th className="px-3 py-1.5 border-r border-slate-200">Trans ID</th>
              <th className="px-3 py-1.5 border-r border-slate-200">Outlet / Teller</th>
              <th className="px-3 py-1.5 border-r border-slate-200 text-center">Draw</th>
              <th className="px-3 py-1.5 border-r border-slate-200 text-center">Bet & Code</th>
              <th className="px-3 py-1.5 border-r border-slate-200 text-right">Bet Amount</th>
              <th className="px-3 py-1.5 border-r border-slate-200 text-right">Win Amount</th>
              <th className="px-3 py-1.5 text-center">Date Returned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {!items.length && !selectedClaimedItems.length ? (
              <tr>
                <td colSpan={9} className="p-5 text-center text-slate-400 font-bold uppercase text-xs">
                  {modalTableSearch ? 'No tickets matched your search query.' : 'No returned winning tickets found in this batch.'}
                </td>
              </tr>
            ) : (
              <>
                {items.map((t, idx) => {
                  const key = getItemKey(t) || `REC-${idx + 1}`;
                  const transId = t.transactionId || t.transId || `REC-${idx + 1}`;
                  const recordTimestamp = t.date_returned || t.created_at;
                  const isSelected = selectedKeys.has(key);

                  return (
                    <tr 
                      key={key} 
                      className={`transition-colors cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-blue-50/60 hover:bg-blue-50/90 text-slate-800' 
                          : 'bg-white opacity-60 hover:opacity-100 hover:bg-slate-50 text-slate-500'
                      }`}
                      onClick={() => onToggleSelect(key)}
                    >
                      <td 
                        className="px-2.5 py-1.5 border-r border-slate-100 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(key)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-[#002B66] focus:ring-[#002B66] cursor-pointer accent-[#002B66]"
                        />
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-100 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                      <td className={`px-3 py-1.5 border-r border-slate-100 font-mono font-bold ${isSelected ? 'text-[#002B66]' : 'text-slate-500'}`}>
                        {transId}
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-100 uppercase font-semibold truncate max-w-[220px]" title={t.fullName || t.outlet || t.username || 'N/A'}>{t.fullName || t.outlet || t.username || 'N/A'}</td>
                      <td className="px-3 py-1.5 border-r border-slate-100 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap">{formatDrawTime ? formatDrawTime(t.drawTime || t.drawDate || t.created_at) : 'N/A'}</td>
                      <td className="px-3 py-1.5 border-r border-slate-100 text-center font-mono font-bold text-slate-800">
                        {t.betNo || 'N/A'} <span className="bg-slate-100 text-slate-600 text-[9px] px-1 py-0.5 rounded font-medium">({t.betCode || 'RS3'})</span>
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-100 text-right font-mono text-slate-800">₱{parseFloat(t.betAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={`px-3 py-1.5 border-r border-slate-100 text-right font-mono font-extrabold ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>
                        ₱{parseFloat(t.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-1.5 text-center font-mono text-[10px] text-slate-500 whitespace-nowrap">{fastFormatTimestamp(recordTimestamp)}</td>
                    </tr>
                  );
                })}

                {/* Claimed Tickets Added to Batch as Inclusions with Deduction (Appears ONLY when selected in modal) */}
                {selectedClaimedItems.map((c, cIdx) => {
                  const key = String(c.transactionId || c.transId || c.id).trim();
                  const isApproved = String(c.deletion_request_status || c.status || '').toUpperCase() === 'APPROVED';

                  return (
                    <tr 
                      key={`claimed-${key}`} 
                      className="bg-amber-50/70 hover:bg-amber-100/60 text-slate-800 border-l-4 border-l-amber-500 font-medium transition-colors"
                    >
                      <td className="px-2.5 py-1.5 border-r border-slate-200 text-center">
                        <input 
                          type="checkbox" 
                          checked={true} 
                          readOnly
                          className="w-3.5 h-3.5 rounded text-amber-600 accent-amber-600 cursor-default" 
                          title="Claimed ticket included in remittance"
                        />
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-amber-800 font-mono text-[10px]">+{cIdx + 1}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-mono font-black text-amber-900 whitespace-nowrap">
                        {c.transactionId || c.transId}
                        <span className="ml-1.5 border font-black text-[8.5px] px-1.5 py-0.2 rounded uppercase bg-amber-200 text-amber-900 border-amber-300">
                          {isApproved ? 'APPROVED DELETION' : 'CLAIMED ADDITION'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200 uppercase font-semibold truncate max-w-[220px] text-amber-950" title={c.fullName || c.outlet || c.username || 'Claimed Ticket'}>
                        {c.fullName || c.outlet || c.username || 'Claimed Ticket'}
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap">
                        {formatDrawTime ? formatDrawTime(c.drawTime || c.drawDate || c.created_at) : 'N/A'}
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                        {c.betNo || 'N/A'} <span className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0.5 rounded font-medium">({c.betCode || 'RS3'})</span>
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right font-mono text-slate-800">
                        ₱{parseFloat(c.betAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right font-mono font-black whitespace-nowrap text-rose-700">
                        -₱{parseFloat(c.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-[8.5px] text-rose-600 block font-normal">(Deduction)</span>
                      </td>
                      <td className="px-3 py-1.5 text-center font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {fastFormatTimestamp(c.date_returned || c.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-200 text-[10px] sticky bottom-0">
            <tr>
              <td colSpan={6} className="px-3 py-1.5 text-right uppercase text-slate-600 font-extrabold">
                Selected Subtotal:
                {selectedDeductionTotal > 0 && (
                  <span className="ml-1.5 font-normal text-[9px] text-rose-600 lowercase">
                    (-₱{selectedDeductionTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} deducted)
                  </span>
                )}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-slate-900 border-r border-slate-200">
                ₱{(items.filter(i => selectedKeys.has(getItemKey(i))).reduce((s, i) => s + parseFloat(i.betAmount ?? 0), 0) + (selectedClaimedItems || []).reduce((s, c) => s + parseFloat(c.betAmount ?? 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-1.5 text-right font-mono font-extrabold text-emerald-800 border-r border-slate-200">
                ₱{netRemittanceTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-1.5 text-center font-mono text-slate-500">
                {totalIncludedRecords} of {totalPossibleRecords} Total Records
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

// 2. MAIN MODAL CONTAINER
function AttachWeeklyProofModal({
  isOpen,
  onClose,
  batchSerialNumber,
  filteredData = [],
  claimedAdjustmentItems = [],
  currentUser,
  formatDrawTime,
  onSuccess
}) {
  const [paymentChannel, setPaymentChannel] = useState('GCASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [customRemittanceAmount, setCustomRemittanceAmount] = useState('');
  const [senderName, setSenderName] = useState(currentUser?.full_name || '');
  const [senderMobile, setSenderMobile] = useState('');
  const [bankName, setBankName] = useState('BDO Unibank');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositedCharges, setDepositedCharges] = useState('');
  const [notes, setNotes] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalTableSearch, setModalTableSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  // Claimed Deletions Deduction State
  const [selectedClaimedKeys, setSelectedClaimedKeys] = useState(() => new Set());
  const [isClaimedModalOpen, setIsClaimedModalOpen] = useState(false);
  const [showUnselectedClaimedWarning, setShowUnselectedClaimedWarning] = useState(false);
  const [allowBypassClaimed, setAllowBypassClaimed] = useState(false);

  const isAdmin = isAdminRole(currentUser?.role) || isSuperAdminRole(currentUser?.role);

  // Target batch calculation: all active unremitted returned winning tickets
  const targetBatch = useMemo(() => {
    const unremitted = filteredData.filter(i => isEligibleForRemittanceProof(i));
    const winTotal = unremitted.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);
    return {
      label: batchSerialNumber ? `Batch Serial #${batchSerialNumber}` : 'All Active Unremitted Returns',
      serialNo: batchSerialNumber || 'SRN-DEFAULT',
      items: unremitted,
      totalWin: winTotal,
      count: unremitted.length
    };
  }, [batchSerialNumber, filteredData]);

  // Selected tickets calculation
  const selectedItems = useMemo(() => {
    if (!targetBatch?.items) return [];
    return targetBatch.items.filter(t => selectedKeys.has(getItemKey(t)));
  }, [targetBatch.items, selectedKeys]);

  const selectedWinTotal = useMemo(() => {
    return selectedItems.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);
  }, [selectedItems]);

  const selectedCount = selectedItems.length;

  // Claimed deductions calculation
  const selectedDeductionTotal = useMemo(() => {
    return (claimedAdjustmentItems || [])
      .filter(i => {
        const k = String(i.transactionId || i.transId || i.id).trim();
        return selectedClaimedKeys.has(k);
      })
      .reduce((sum, i) => sum + parseFloat(i.winAmount || i.win_amount || 0), 0);
  }, [claimedAdjustmentItems, selectedClaimedKeys]);

  const selectedClaimedCount = useMemo(() => {
    return (claimedAdjustmentItems || []).filter(i => {
      const k = String(i.transactionId || i.transId || i.id).trim();
      return selectedClaimedKeys.has(k);
    }).length;
  }, [claimedAdjustmentItems, selectedClaimedKeys]);

  const totalClaimedWinAmount = useMemo(() => {
    return (claimedAdjustmentItems || []).reduce((sum, i) => sum + parseFloat(i.winAmount || i.win_amount || 0), 0);
  }, [claimedAdjustmentItems]);

  const selectedClaimedItems = useMemo(() => {
    return (claimedAdjustmentItems || []).filter(i => {
      const k = String(i.transactionId || i.transId || i.id).trim();
      return selectedClaimedKeys.has(k);
    });
  }, [claimedAdjustmentItems, selectedClaimedKeys]);

  const hasUnselectedClaimed = (claimedAdjustmentItems?.length || 0) > 0 && selectedClaimedKeys.size === 0;

  const netPayableTotal = useMemo(() => {
    return Math.max(0, (parseFloat(selectedWinTotal || 0) || 0) - selectedDeductionTotal);
  }, [selectedWinTotal, selectedDeductionTotal]);

  // Sync initial state on modal open
  useEffect(() => {
    if (isOpen) {
      setFormError('');
      setReferenceNumber('');
      setPreviewImage(null);
      setNotes('');
      setModalTableSearch('');
      setSenderName(currentUser?.full_name || '');
      setAllowBypassClaimed(false);
      setShowUnselectedClaimedWarning(false);
      setIsClaimedModalOpen(false);

      // Default unchecked for claimed deletion tickets
      setSelectedClaimedKeys(new Set());

      const unremitted = filteredData.filter(i => isEligibleForRemittanceProof(i));
      const initialKeys = new Set(unremitted.map(t => getItemKey(t)));
      setSelectedKeys(initialKeys);

      const targetAmount = unremitted.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);
      setCustomRemittanceAmount(targetAmount.toFixed(2));
    }
  }, [isOpen, filteredData, currentUser]);

  // Toggle single ticket selection
  const handleToggleSelect = useCallback((key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      const newItems = (targetBatch?.items || []).filter(t => next.has(getItemKey(t)));
      const newGross = newItems.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);
      const newNet = Math.max(0, newGross - selectedDeductionTotal);
      setCustomRemittanceAmount(newNet.toFixed(2));
      return next;
    });
  }, [targetBatch, selectedDeductionTotal]);

  // Toggle select all visible / batch tickets
  const handleToggleSelectAll = useCallback(() => {
    if (!targetBatch?.items) return;
    setSelectedKeys(prev => {
      const visibleKeys = targetBatch.items.map(t => getItemKey(t));
      const allSelected = visibleKeys.length > 0 && visibleKeys.every(k => prev.has(k));
      if (allSelected) {
        setCustomRemittanceAmount('0.00');
        return new Set();
      } else {
        const fullTotal = targetBatch.items.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);
        const newNet = Math.max(0, fullTotal - selectedDeductionTotal);
        setCustomRemittanceAmount(newNet.toFixed(2));
        return new Set(visibleKeys);
      }
    });
  }, [targetBatch, selectedDeductionTotal]);

  // Toggle claimed deduction tickets
  const handleToggleClaimedSelect = useCallback((key) => {
    setSelectedClaimedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      const newDeductions = (claimedAdjustmentItems || [])
        .filter(i => next.has(String(i.transactionId || i.transId || i.id).trim()))
        .reduce((sum, i) => sum + parseFloat(i.winAmount || i.win_amount || 0), 0);
      const newNet = Math.max(0, (parseFloat(selectedWinTotal || 0) || 0) - newDeductions);
      setCustomRemittanceAmount(newNet.toFixed(2));
      return next;
    });
  }, [claimedAdjustmentItems, selectedWinTotal]);

  const handleToggleAllClaimed = useCallback(() => {
    if (!claimedAdjustmentItems || !claimedAdjustmentItems.length) return;
    setSelectedClaimedKeys(prev => {
      const allKeys = claimedAdjustmentItems.map(i => String(i.transactionId || i.transId || i.id).trim());
      const isAll = allKeys.length > 0 && allKeys.every(k => prev.has(k));
      if (isAll) {
        setCustomRemittanceAmount((parseFloat(selectedWinTotal || 0) || 0).toFixed(2));
        return new Set();
      } else {
        const fullDeductions = claimedAdjustmentItems.reduce((sum, i) => sum + parseFloat(i.winAmount || i.win_amount || 0), 0);
        const newNet = Math.max(0, (parseFloat(selectedWinTotal || 0) || 0) - fullDeductions);
        setCustomRemittanceAmount(newNet.toFixed(2));
        return new Set(allKeys);
      }
    });
  }, [claimedAdjustmentItems, selectedWinTotal]);

  // Dynamically compute Remittance Serial Number based on sub-office and remittance date
  const effectiveBatchSrn = useMemo(() => {
    const subOfficeName = currentUser?.sub_office && currentUser.sub_office !== 'All'
      ? currentUser.sub_office
      : (selectedItems[0]?.sub_office || targetBatch?.items[0]?.sub_office || 'Mandaue Central');
    
    // Parse receiptDate (or fallback to current date)
    const dateObj = receiptDate ? new Date(`${receiptDate}T12:00:00`) : new Date();

    if (!selectedItems || selectedItems.length === 0) {
      return generateRemittanceSerial(subOfficeName, '892301', dateObj);
    }

    // 1. Single specific ticket selected -> generate format [SUB-OFFICE]-[YYMMDD]-[6-DIGIT CODE]
    if (selectedItems.length === 1) {
      const single = selectedItems[0];
      const transId = single.transactionId || single.transId || single.id;
      return generateRemittanceSerial(subOfficeName, transId, dateObj);
    }

    // 2. Multiple tickets selected -> derive 6-digit sequence from first selected ticket
    const firstSelected = selectedItems[0];
    const firstTransId = firstSelected?.transactionId || firstSelected?.transId || firstSelected?.id;
    return generateRemittanceSerial(subOfficeName, firstTransId, dateObj);
  }, [selectedItems, targetBatch, currentUser, receiptDate]);

  // Fast filtered tickets list
  const filteredTickets = useMemo(() => {
    if (!targetBatch?.items) return [];
    if (!modalTableSearch.trim()) return targetBatch.items;
    const q = modalTableSearch.toLowerCase().trim();
    return targetBatch.items.filter(item => {
      const transId = String(item.transactionId || item.transId || '').toLowerCase();
      const name = String(item.fullName || item.outlet || item.username || '').toLowerCase();
      const bet = String(item.betNo || '').toLowerCase();
      const code = String(item.betCode || '').toLowerCase();
      const draw = String(item.drawTime || item.drawDate || '').toLowerCase();
      return transId.includes(q) || name.includes(q) || bet.includes(q) || code.includes(q) || draw.includes(q);
    });
  }, [targetBatch, modalTableSearch]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size should be less than 5MB.');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const handleInitiateSubmit = (e) => {
    e.preventDefault();
    if (selectedCount === 0) {
      setFormError('Please select at least one Trans ID ticket to attach remittance proof.');
      return;
    }

    // SUBMISSION ALERT WARNING GATE:
    // If there are claimed deletion requests and SSR has 0 selected, intercept with Insufficient Balance alert!
    if (hasUnselectedClaimed) {
      setFormError('Insufficient balance to continue: please select the Trans ID to include that ticket(s).');
      setShowUnselectedClaimedWarning(true);
      return;
    }

    const effectiveAmount = !isNaN(parseFloat(customRemittanceAmount)) && parseFloat(customRemittanceAmount) > 0 
      ? parseFloat(customRemittanceAmount) 
      : (parseFloat(netPayableTotal || 0) || 0);

    if (!isAdmin && !referenceNumber.trim()) {
      setFormError('Please enter the official remittance reference / control number.');
      return;
    }

    if (effectiveAmount < 0) {
      setFormError('Please enter a valid total remittance amount.');
      return;
    }

    setFormError('');
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
    if (selectedCount === 0) return;

    const effectiveReferenceNumber = (referenceNumber.trim() || effectiveBatchSrn).toUpperCase();
    const effectiveAmount = !isNaN(parseFloat(customRemittanceAmount)) && parseFloat(customRemittanceAmount) > 0 
      ? parseFloat(customRemittanceAmount) 
      : (parseFloat(netPayableTotal || 0) || 0);

    setIsSubmitting(true);
    setFormError('');

    try {
      let uploadedReceiptUrl = null;

      // 1. Upload proof image to Supabase Storage if attached
      if (previewImage && previewImage.startsWith('data:')) {
        try {
          const fileExt = previewImage.substring(previewImage.indexOf('/') + 1, previewImage.indexOf(';base64'));
          const fileName = `remittance_proof_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt || 'png'}`;
          const base64Data = previewImage.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: `image/${fileExt || 'png'}` });

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('remittance_receipts')
            .upload(fileName, blob, {
              contentType: `image/${fileExt || 'png'}`,
              upsert: false
            });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('remittance_receipts')
              .getPublicUrl(fileName);
            uploadedReceiptUrl = publicUrlData?.publicUrl || null;
          } else {
            // If storage bucket is missing or restricted, fallback to base64 data URL
            uploadedReceiptUrl = previewImage;
          }
        } catch (uploadErr) {
          console.warn("Storage upload fallback to data URL:", uploadErr);
          uploadedReceiptUrl = previewImage;
        }
      }

      // 2. Extract transaction IDs in selected batch
      const itemsToRemit = selectedItems;
      const transIds = itemsToRemit.map(t => String(t.transactionId || t.transId).trim()).filter(Boolean);
      const subOfficeName = currentUser?.sub_office && currentUser.sub_office !== 'All' 
        ? currentUser.sub_office 
        : (itemsToRemit[0]?.sub_office || 'Mandaue Central');

      // 3. Create parent remittance receipt entry conforming exactly to Supabase schema (keyed by sub-office serial format)
      const primaryTransId = effectiveBatchSrn || generateRemittanceSerial(subOfficeName, transIds[0] || '892301', receiptDate ? new Date(receiptDate) : new Date());
      const receiptPayload = {
        batch_serial_no: primaryTransId,
        sub_office: subOfficeName,
        uploaded_by_user: currentUser?.username || 'SYSTEM',
        payment_channel: paymentChannel || 'DIRECT_REMITTANCE',
        reference_number: effectiveReferenceNumber,
        sender_name: senderName.trim() || currentUser?.full_name || 'System Administrator',
        sender_mobile: senderMobile.trim() || null,
        bank_name: (paymentChannel === 'BANK_TRANSFER' || paymentChannel === 'BANK_DEPOSIT') ? bankName : null,
        remittance_amount: parseFloat(effectiveAmount) || 0,
        deposited_charges: parseFloat(depositedCharges) || 0,
        receipt_date: receiptDate || new Date().toISOString().split('T')[0],
        receipt_image_url: uploadedReceiptUrl || previewImage || null,
        verification_status: 'PENDING',
        tickets_count: transIds.length,
        notes: notes.trim() || `Batch Remittance for Serial ${effectiveBatchSrn || 'SRN'} (${transIds.length} tickets)`
      };

      const { data: receiptData, error: receiptError } = await supabase
        .from('remittance_receipts')
        .insert([receiptPayload])
        .select()
        .single();

      if (receiptError) throw receiptError;

      // 4. Update status of all selected returned winning records in database
      if (transIds.length > 0) {
        const effectiveRemittanceTimestamp = receiptDate 
          ? new Date(`${receiptDate}T12:00:00`).toISOString() 
          : new Date().toISOString();

        const { error: updateError } = await supabase
          .from('returned_winnings')
          .update({
            receipt_status: 'PENDING_VERIFICATION',
            sub_office: subOfficeName,
            batch_serial_no: effectiveBatchSrn || null,
            updated_at: effectiveRemittanceTimestamp
          })
          .in('transactionId', transIds);

        if (updateError) {
          console.warn("returned_winnings batch update note:", updateError);
        }
      }

      // 4b. Update status of deducted claimed deletion requests in dedicated table
      if (selectedClaimedKeys.size > 0) {
        const deductedTransIds = Array.from(selectedClaimedKeys);
        const { error: deductError } = await supabase
          .from('returned_winnings_deletion_requests')
          .update({
            deducted_from_collections: true,
            updated_at: new Date().toISOString()
          })
          .in('transaction_id', deductedTransIds);

        if (deductError) {
          console.warn("Claimed deletion status update note:", deductError);
        }
      }

      // 5. Create immutable audit trail entry
      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'SYSTEM',
        actor_role: currentUser?.role || 'Admin',
        action: 'BATCH_REMITTANCE_PROOF_ATTACHED',
        target_type: 'remittance_receipts',
        target_id: String(receiptData?.id || effectiveReferenceNumber),
        sub_office: subOfficeName,
        details: {
          referenceNumber: effectiveReferenceNumber,
          amount: effectiveAmount,
          depositedCharges: parseFloat(depositedCharges) || 0,
          channel: paymentChannel,
          ticketsCount: transIds.length,
          batchSerial: effectiveBatchSrn || 'SRN'
        }
      }]);

      setShowConfirmModal(false);
      if (onSuccess) onSuccess(transIds.length);
      onClose();
    } catch (err) {
      console.error("Remittance submission error:", err);
      setFormError(err.message || 'Failed to submit batch remittance proof.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* 1. MODAL HEADER */}
        <div className="bg-[#002B66] text-white px-5 py-3.5 flex justify-between items-center border-b-2 border-[#FFD700] shrink-0">
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs sm:text-sm">
            <UploadCloud size={18} className="text-[#FFD700]" />
            <span>Attach Remittance Proof • {effectiveBatchSrn || 'Batch'}</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={19} />
          </button>
        </div>

        {/* 2. SCROLLABLE FORM BODY */}
        <form 
          id="weekly-remit-form"
          onSubmit={handleInitiateSubmit} 
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs"
        >
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle size={16} className="shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Batch Serial Number & Quick Stats Banner */}
          <div className="bg-gradient-to-br from-blue-50/90 to-slate-50 border border-blue-200/80 rounded-xl p-3.5 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
              <div className="bg-white p-2.5 rounded-lg border border-blue-100/80 shadow-2xs">
                <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">BATCH SERIAL NO.</span>
                <span className="font-black text-[#002B66] truncate block text-xs mt-0.5 underline">{effectiveBatchSrn || 'MAN-260901-892301'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100/80 shadow-2xs">
                <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">Selected Tickets</span>
                <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">
                  <span className="text-[#002B66] font-black">{selectedCount}</span> / {targetBatch.count} Tickets
                </span>
              </div>
              <div 
                onClick={() => claimedAdjustmentItems.length > 0 && setIsClaimedModalOpen(true)}
                className={`p-2.5 rounded-lg border shadow-2xs transition-all ${
                  claimedAdjustmentItems.length > 0 ? (hasUnselectedClaimed ? 'bg-rose-50/70 border-rose-300 cursor-pointer hover:bg-rose-100/70' : 'bg-amber-50/60 border-amber-200 cursor-pointer hover:bg-amber-100/70') : 'bg-white border-blue-100/80'
                }`}
                title={claimedAdjustmentItems.length > 0 ? "Click to select claimed tickets to include & deduct" : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-sans font-extrabold uppercase block ${hasUnselectedClaimed ? 'text-rose-600' : 'text-slate-400'}`}>
                    Claimed Additions
                  </span>
                  {claimedAdjustmentItems.length > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      hasUnselectedClaimed ? 'bg-rose-200 text-rose-900' : 'text-amber-700 bg-amber-100'
                    }`}>
                      {selectedClaimedCount}/{claimedAdjustmentItems.length}
                    </span>
                  )}
                </div>
                <span className={`font-extrabold text-xs mt-0.5 block ${hasUnselectedClaimed ? 'text-rose-700' : 'text-slate-800'}`}>
                  {selectedClaimedCount > 0 
                    ? `-₱${selectedDeductionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : (hasUnselectedClaimed ? '⚠️ Required' : '₱0.00')}
                </span>
              </div>
            </div>
          </div>

          {/* CLAIMED DELETION ALERT WARNING BANNER */}
          {claimedAdjustmentItems.length > 0 && (
            <div
              onClick={() => setIsClaimedModalOpen(true)}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                selectedClaimedCount > 0
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 hover:bg-emerald-100/70'
                  : 'bg-gradient-to-r from-rose-50 via-rose-100/60 to-red-50 border-2 border-rose-400 text-rose-950 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedClaimedCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-200 text-rose-800 animate-pulse'
                }`}>
                  <AlertTriangle size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black uppercase text-[11px] tracking-wide text-slate-800">
                      {selectedClaimedCount > 0
                        ? `Claimed Tickets Included & Deducted (${selectedClaimedCount} of ${claimedAdjustmentItems.length} Selected)`
                        : `⚠️ Insufficient Balance to Continue: Action Required`}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      selectedClaimedCount > 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}>
                      {selectedClaimedCount > 0 ? 'Inclusion Active' : 'Action Required'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 truncate mt-0.5">
                    {selectedClaimedCount > 0
                      ? `Total deduction of -₱${selectedDeductionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} applied to remittance liability. Click to modify.`
                      : `You have ${claimedAdjustmentItems.length} claimed winning ticket(s) available. Please select the Trans ID(s) to include that ticket(s) and deduct their win amount.`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsClaimedModalOpen(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-colors cursor-pointer shadow-2xs ${
                  selectedClaimedCount > 0
                    ? 'bg-[#002B66] text-[#FFD700] hover:bg-blue-900'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {selectedClaimedCount > 0 ? 'Edit Trans IDs' : 'Select Trans IDs →'}
              </button>
            </div>
          )}

          {/* MEMOIZED TICKETS TABLE WITH CHECKBOX SELECTION */}
          <BatchTicketsTable
            items={filteredTickets}
            selectedClaimedItems={selectedClaimedItems}
            selectedKeys={selectedKeys}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            selectedWinTotal={selectedWinTotal}
            selectedDeductionTotal={selectedDeductionTotal}
            totalWin={targetBatch.totalWin}
            modalTableSearch={modalTableSearch}
            onSearchChange={setModalTableSearch}
            formatDrawTime={formatDrawTime}
          />

          {/* Payment Channel Selector (Hidden on Admin side) */}
          {!isAdmin && (
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 uppercase block mb-1.5">
                Remittance Payment Channel
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { id: 'GCASH', name: 'GCash', icon: Smartphone, color: 'text-blue-600' },
                  { id: 'CEBUANA', name: 'Cebuana', icon: Building2, color: 'text-rose-600' },
                  { id: 'BANK_DEPOSIT', name: 'Bank Deposit', icon: Landmark, color: 'text-emerald-600' },
                  { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: Landmark, color: 'text-teal-600' },
                  { id: 'CASH_PALAWAN', name: 'Palawan / Cash', icon: FileText, color: 'text-amber-600' }
                ].map(channel => {
                  const Icon = channel.icon;
                  const isSelected = paymentChannel === channel.id;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setPaymentChannel(channel.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#002B66] text-white border-[#002B66] shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={16} className={isSelected ? 'text-[#FFD700]' : channel.color} />
                      <span className="truncate">{channel.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Fields: Reference, Amount, Sender, Date (Hidden on Admin side) */}
          {!isAdmin && (
            <>
              {/* Reference Number, Amount, and Deposited Charges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase">
                      Official Reference / Control No. *
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10029384758 / CEB-9982 / DEP-48921"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#002B66] focus:bg-white px-3 py-2 rounded-lg font-mono font-bold text-[#002B66] uppercase outline-none transition-all"
                  />
                </div>

                <div>
                  <div className="flex flex-col gap-1 mb-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-[11px] font-black uppercase flex items-center gap-1.5 ${
                        hasUnselectedClaimed ? 'text-rose-600' : 'text-slate-700'
                      }`}>
                        {hasUnselectedClaimed && <AlertTriangle size={13} className="text-rose-600 animate-bounce" />}
                        <span>Total Remittance Amount (₱) *</span>
                      </label>
                      {selectedClaimedCount > 0 && (
                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                          ✓ -₱{selectedDeductionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} deducted
                        </span>
                      )}
                    </div>

                    {hasUnselectedClaimed && (
                      <div 
                        onClick={() => setIsClaimedModalOpen(true)}
                        className="text-[10px] sm:text-[10.5px] font-bold text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-1.5 cursor-pointer hover:bg-rose-100 transition-colors shadow-2xs"
                        title="Click to select Trans IDs to include tickets"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle size={12} className="shrink-0 text-rose-600" />
                          <span>Insufficient balance to continue: please select the Trans ID to include that ticket(s)</span>
                        </span>
                        <span className="text-[9.5px] uppercase font-black underline shrink-0 text-rose-800">
                          Select Trans ID →
                        </span>
                      </div>
                    )}
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    required
                    value={customRemittanceAmount}
                    onChange={(e) => setCustomRemittanceAmount(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg font-mono font-extrabold outline-none transition-all ${
                      hasUnselectedClaimed 
                        ? 'bg-rose-50/70 border-2 border-rose-500 text-rose-800 ring-2 ring-rose-200/80 focus:bg-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-[#002B66] focus:bg-white text-emerald-700'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase">
                      Deposited Money Charges (₱)
                    </label>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={depositedCharges}
                    onChange={(e) => setDepositedCharges(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#002B66] focus:bg-white px-3 py-2 rounded-lg font-mono font-extrabold text-[#002B66] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Bank Name if Bank Transfer or Bank Deposit */}
              {(paymentChannel === 'BANK_TRANSFER' || paymentChannel === 'BANK_DEPOSIT') && (
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase block mb-1">
                    {paymentChannel === 'BANK_DEPOSIT' ? 'Depository Bank' : 'Beneficiary Bank'}
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-bold text-slate-800 outline-none"
                  >
                    <option value="BDO Unibank">BDO Unibank</option>
                    <option value="BPI">Bank of the Philippine Islands (BPI)</option>
                    <option value="Metrobank">Metrobank</option>
                    <option value="UnionBank">UnionBank of the Philippines</option>
                    <option value="Landbank">Landbank</option>
                    <option value="Security Bank">Security Bank</option>
                    <option value="RCBC">RCBC</option>
                    <option value="Other Bank">Other Local Bank</option>
                  </select>
                </div>
              )}

              {/* Sender Details & Receipt Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase block mb-1">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-medium text-slate-800 outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase block mb-1">
                    Sender Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="0917XXXXXXX"
                    value={senderMobile}
                    onChange={(e) => setSenderMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-mono text-slate-800 outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase block mb-1">
                    Remittance Date
                  </label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-bold text-slate-800 outline-none focus:bg-white"
                  />
                </div>
              </div>
            </>
          )}

          {/* Image Upload Area */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase block mb-1">
              Attach Official Remittance Receipt / Deposit Slip
            </label>
            
            {previewImage ? (
              <div className="relative border-2 border-emerald-500 rounded-xl p-3 bg-emerald-50/50 flex flex-col items-center">
                <img 
                  src={previewImage} 
                  alt="Receipt Preview" 
                  className="max-h-44 rounded-lg object-contain border border-emerald-200 shadow-xs cursor-pointer hover:opacity-95" 
                  onClick={() => setIsImageZoomed(true)}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsImageZoomed(true)}
                    className="text-xs font-bold text-[#002B66] hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs"
                  >
                    <Eye size={13} /> View Large
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer bg-white px-3 py-1 rounded-full border border-rose-200 shadow-2xs"
                  >
                    <X size={13} /> Remove & Change Image
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 hover:border-[#002B66] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-all text-center">
                <ImageIcon size={26} className="text-[#002B66]" />
                <div>
                  <span className="font-bold text-[#002B66] text-xs">Click to browse receipt screenshot / deposit slip</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, JPEG up to 5MB</p>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="hidden" 
                />
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase block mb-1">
              Remittance Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Full weekly payout remitted via GCash QR"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-medium text-slate-800 outline-none focus:bg-white"
            />
          </div>

          {/* Notice */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900">
            <ShieldCheck size={16} className="shrink-0 text-amber-700 mt-0.5" />
            <span>
              <strong>Automated Ledger Transition:</strong> Upon submission, all <strong>{selectedCount} selected records{selectedClaimedCount > 0 ? ` and ${selectedClaimedCount} claimed ticket(s)` : ''}</strong> in this Sunday–Saturday batch will immediately move to <strong>Collections & Commissions</strong> with their 4-tier commission pools, and the remittance proof will be queued for superadmin verification.
            </span>
          </div>

        </form>

        {/* 3. FIXED MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>Gross: <strong className="text-slate-700">₱{Number(selectedWinTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
            {selectedDeductionTotal > 0 && (
              <span>• Deductions: <strong className="text-rose-600 font-black">-₱{selectedDeductionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
            )}
            <span>• Net Payable: <strong className="text-emerald-700 font-mono font-black text-xs">₱{netPayableTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="weekly-remit-form"
              disabled={isSubmitting || selectedCount === 0}
              className="flex items-center gap-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-5 py-2 rounded-xl font-black transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
            >
              <CheckCircle2 size={15} />
              <span>Review & Attach Proof ({selectedCount + selectedClaimedCount} Records) →</span>
            </button>
          </div>
        </div>

        {/* 4. CONFIRMATION OVERLAY MODAL */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="bg-[#002B66] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#FFD700] shrink-0">
                <div className="flex items-center gap-2.5 font-black uppercase text-xs sm:text-sm tracking-wider">
                  <ShieldCheck size={18} className="text-[#FFD700]" />
                  <span>Confirm Remittance & Attached Proof</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
                
                <div className="bg-blue-50 border border-blue-200 text-blue-900 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5">
                  <Sparkles size={16} className="text-[#002B66] shrink-0" />
                  <span>Please verify that the attached receipt and remittance details are 100% correct before finalizing.</span>
                </div>

                {/* Proof Image Preview + Details Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                  
                  {/* Left: Receipt Proof Preview Card */}
                  <div className="sm:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 mb-2 block tracking-wider">
                      Attached Proof
                    </span>
                    {previewImage ? (
                      <div className="relative group w-full flex flex-col items-center">
                        <img
                          src={previewImage}
                          alt="Remittance Proof"
                          className="max-h-44 w-full object-contain rounded-lg border border-slate-300 shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setIsImageZoomed(true)}
                        />
                        <button
                          type="button"
                          onClick={() => setIsImageZoomed(true)}
                          className="mt-2 text-[10px] font-bold text-[#002B66] hover:text-blue-800 flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs cursor-pointer"
                        >
                          <Eye size={12} /> Click to Expand
                        </button>
                      </div>
                    ) : (
                      <div className="py-6 px-3 flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon size={32} className="mb-1 text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-500">No Image Attached</span>
                        <span className="text-[10px] text-slate-400">(Reference Number Only)</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Key Remittance Details Table/Summary */}
                  <div className="sm:col-span-7 space-y-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div>
                        <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">
                          Official Reference / Control No.
                        </span>
                        <span className="font-mono font-black text-sm text-[#002B66] block break-all">
                          {(referenceNumber.trim() || effectiveBatchSrn).toUpperCase()}
                        </span>
                      </div>

                      <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">
                            Net Remittance Amount
                          </span>
                          <span className="font-mono font-black text-emerald-700 text-sm block">
                            ₱{parseFloat(customRemittanceAmount || netPayableTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">
                            Payment Channel
                          </span>
                          <span className="font-sans font-bold text-slate-800 text-xs block">
                            {paymentChannel} {(paymentChannel === 'BANK_TRANSFER' || paymentChannel === 'BANK_DEPOSIT') && bankName ? `(${bankName})` : ''}
                          </span>
                        </div>
                      </div>

                      {selectedDeductionTotal > 0 && (
                        <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-[11px] font-mono">
                          <span className="font-sans text-rose-600 font-bold">Claimed Deductions ({selectedClaimedCount} tickets):</span>
                          <span className="font-bold text-rose-600">-₱{selectedDeductionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}

                      {parseFloat(depositedCharges) > 0 && (
                        <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-[11px]">
                          <span className="font-sans text-slate-500">Bank / Channel Charges:</span>
                          <span className="font-mono font-bold text-[#002B66]">₱{parseFloat(depositedCharges).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">
                            Batch Serial (SRN)
                          </span>
                          <span className="font-mono font-bold text-slate-700 text-[11px] block truncate">
                            {effectiveBatchSrn}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">
                            Remittance Date
                          </span>
                          <span className="font-sans font-bold text-slate-700 text-[11px] block">
                            {receiptDate}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-2">
                        <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">
                          Included Tickets
                        </span>
                        <div className="flex items-center justify-between text-xs mt-0.5">
                          <span className="font-sans font-bold text-slate-700">{selectedCount} Tickets Selected</span>
                          <span className="font-mono font-bold text-emerald-800">
                            Total: ₱{Number(selectedWinTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {(senderName || senderMobile) && (
                        <div className="border-t border-slate-200 pt-2 text-[10px] font-sans text-slate-500">
                          <strong>Sender:</strong> {senderName || 'N/A'} {senderMobile ? `(${senderMobile})` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Audit confirmation summary note */}
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    By confirming, these <strong>{selectedCount} returned winning records</strong> will immediately transition to <strong>Collections & Commissions</strong> and be submitted for superadmin review.
                  </span>
                </div>

              </div>

              {/* Confirmation Footer Buttons */}
              <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer text-xs"
                >
                  ← Back to Edit Details
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-black transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Submitting Proof...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Yes, Confirm & Submit Proof</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 5. ENLARGED PROOF IMAGE MODAL */}
        {isImageZoomed && previewImage && (
          <div 
            className="fixed inset-0 z-70 bg-black/90 flex items-center justify-center p-4 animate-in fade-in cursor-zoom-out"
            onClick={() => setIsImageZoomed(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <img 
                src={previewImage} 
                alt="Enlarged Proof" 
                className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/20"
              />
              <button
                type="button"
                onClick={() => setIsImageZoomed(false)}
                className="mt-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-1.5 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
              >
                Close Zoom View
              </button>
            </div>
          </div>
        )}

        {/* 6. SUBMISSION ALERT WARNING PROMPT (When claimed deletions are unselected) */}
        {showUnselectedClaimedWarning && (
          <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white border-2 border-rose-500 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 text-center animate-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-300 flex items-center justify-center mx-auto text-rose-600">
                <AlertTriangle size={30} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm sm:text-base font-black text-rose-700 uppercase tracking-wide">
                  Insufficient Balance to Continue!
                </h3>
                <p className="text-xs text-slate-600">
                  There are <span className="font-black text-slate-900">{claimedAdjustmentItems.length}</span> claimed winning ticket(s) totaling <span className="font-bold text-rose-600 font-mono">₱{totalClaimedWinAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> available. To continue, you must select the Trans ID(s) to include that ticket(s) and deduct their win amount from your remittance liability.
                </p>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-[11px] text-rose-900 text-left font-medium">
                  <strong>Action Required:</strong> Please select the Trans ID to include that ticket(s) into this batch and deduct its amount from your total remittance.
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnselectedClaimedWarning(false);
                    setIsClaimedModalOpen(true);
                  }}
                  className="w-full px-4 py-2.5 bg-[#002B66] text-[#FFD700] hover:bg-blue-900 rounded-xl font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 size={15} />
                  Select Trans ID to Include Ticket(s) →
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnselectedClaimedWarning(false)}
                  className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Back to Review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. CLAIMED DELETIONS DEDUCTION SELECTION MODAL */}
        <SelectClaimedDeductionsModal
          isOpen={isClaimedModalOpen}
          onClose={() => setIsClaimedModalOpen(false)}
          items={claimedAdjustmentItems}
          selectedKeys={selectedClaimedKeys}
          onToggleSelect={handleToggleClaimedSelect}
          onToggleSelectAll={handleToggleAllClaimed}
          formatDrawTime={formatDrawTime}
        />

      </div>
    </div>
  );
}

export default memo(AttachWeeklyProofModal);

