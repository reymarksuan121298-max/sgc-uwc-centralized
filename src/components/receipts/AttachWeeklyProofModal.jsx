import React, { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { 
  X, UploadCloud, Calendar, FileText, CheckCircle2, 
  Smartphone, Building2, Landmark, Image as ImageIcon, Loader2,
  AlertTriangle, ShieldCheck, Search, Sparkles, Check, ScanText
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { isAdminRole, isSuperAdminRole } from '../../utils/permissions';
import { scanReceiptProof } from '../../utils/receiptOcr';

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
  selectedKeys,
  onToggleSelect,
  onToggleSelectAll,
  selectedWinTotal,
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={15} className="text-[#002B66] shrink-0" />
          <span className="font-extrabold text-[11px] text-[#002B66] uppercase tracking-wider truncate">
            Included Returned Winnings ({selectedInViewCount} of {items.length} Selected)
          </span>
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
          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0" title="Selected tickets total liability">
            ₱{Number(selectedWinTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto overflow-x-auto">
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
              <th className="px-3 py-1.5 border-r border-slate-200 text-right">Win Liability</th>
              <th className="px-3 py-1.5 text-center">Date Returned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {!items.length ? (
              <tr>
                <td colSpan={9} className="p-5 text-center text-slate-400 font-bold uppercase text-xs">
                  {modalTableSearch ? 'No tickets matched your search query.' : 'No returned winning tickets found in this batch.'}
                </td>
              </tr>
            ) : (
              items.map((t, idx) => {
                const key = getItemKey(t) || `REC-${idx + 1}`;
                const transId = t.transactionId || t.transId || `REC-${idx + 1}`;
                const recordTimestamp = t.updated_at || t.created_at;
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
                    <td className="px-3 py-1.5 border-r border-slate-100 uppercase font-semibold truncate max-w-[140px]">{t.fullName || t.outlet || t.username || 'N/A'}</td>
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
              })
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-200 text-[10px] sticky bottom-0">
            <tr>
              <td colSpan={6} className="px-3 py-1.5 text-right uppercase text-slate-600">Selected Subtotal:</td>
              <td className="px-3 py-1.5 text-right font-mono text-slate-900 border-r border-slate-200">
                ₱{items.filter(i => selectedKeys.has(getItemKey(i))).reduce((s, i) => s + parseFloat(i.betAmount ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-1.5 text-right font-mono font-extrabold text-emerald-800 border-r border-slate-200">
                ₱{Number(selectedWinTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-1.5 text-center font-mono text-slate-500">{selectedInViewCount} of {items.length} Selected</td>
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
  const [notes, setNotes] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalTableSearch, setModalTableSearch] = useState('');
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrDetectionNote, setOcrDetectionNote] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const isAdmin = isAdminRole(currentUser?.role) || isSuperAdminRole(currentUser?.role);

  // Target batch calculation: all active unremitted returned winning tickets (excluding under settlement)
  const targetBatch = useMemo(() => {
    const unremitted = filteredData.filter(i => (!i.receipt_status || i.receipt_status === 'NO_RECEIPT') && !i.isUnderSettlement);
    const winTotal = unremitted.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);
    return {
      label: batchSerialNumber ? `Batch Serial #${batchSerialNumber}` : 'All Active Unremitted Returns',
      serialNo: batchSerialNumber || 'SRN-DEFAULT',
      items: unremitted,
      totalWin: winTotal,
      count: unremitted.length
    };
  }, [batchSerialNumber, filteredData]);

  // Sync initial state on modal open (select all unremitted tickets by default)
  useEffect(() => {
    if (isOpen) {
      setFormError('');
      setReferenceNumber('');
      setPreviewImage(null);
      setNotes('');
      setModalTableSearch('');
      setOcrDetectionNote('');
      setIsScanningOcr(false);
      setSenderName(currentUser?.full_name || '');

      const unremitted = filteredData.filter(i => (!i.receipt_status || i.receipt_status === 'NO_RECEIPT') && !i.isUnderSettlement);
      const initialKeys = new Set(unremitted.map(t => getItemKey(t)));
      setSelectedKeys(initialKeys);

      const targetAmount = unremitted.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);
      setCustomRemittanceAmount(targetAmount.toFixed(2));
    }
  }, [isOpen, filteredData, currentUser]);

  // Selected tickets calculation
  const selectedItems = useMemo(() => {
    if (!targetBatch?.items) return [];
    return targetBatch.items.filter(t => selectedKeys.has(getItemKey(t)));
  }, [targetBatch.items, selectedKeys]);

  const selectedWinTotal = useMemo(() => {
    return selectedItems.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);
  }, [selectedItems]);

  const selectedCount = selectedItems.length;

  // Toggle single ticket selection
  const handleToggleSelect = useCallback((key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Toggle select all visible / batch tickets
  const handleToggleSelectAll = useCallback(() => {
    if (!targetBatch?.items) return;
    setSelectedKeys(prev => {
      const visibleKeys = targetBatch.items.map(t => getItemKey(t));
      const allSelected = visibleKeys.length > 0 && visibleKeys.every(k => prev.has(k));
      if (allSelected) {
        return new Set();
      } else {
        return new Set(visibleKeys);
      }
    });
  }, [targetBatch]);

  // Dynamically compute SRN based on selected tickets
  const effectiveBatchSrn = useMemo(() => {
    if (!selectedItems || selectedItems.length === 0) {
      return batchSerialNumber || 'SRN-NONE';
    }

    // 1. Single specific ticket selected -> generate SRN from its Trans ID
    if (selectedItems.length === 1) {
      const single = selectedItems[0];
      if (single.batch_serial_no) return single.batch_serial_no;
      const transId = single.transactionId || single.transId || single.id;
      if (transId) {
        return String(transId).startsWith('SRN-') ? String(transId) : `SRN-${transId}`;
      }
    }

    // 2. All target batch tickets selected and batchSerialNumber provided -> keep batch serial number
    if (targetBatch?.items?.length > 0 && selectedItems.length === targetBatch.items.length && batchSerialNumber) {
      return batchSerialNumber;
    }

    // 3. Specific subset of tickets selected -> derive SRN from the first selected ticket's transId
    const firstSelected = selectedItems[0];
    if (firstSelected?.batch_serial_no) return firstSelected.batch_serial_no;
    const firstTransId = firstSelected?.transactionId || firstSelected?.transId || firstSelected?.id;
    if (firstTransId) {
      return String(firstTransId).startsWith('SRN-') ? String(firstTransId) : `SRN-${firstTransId}`;
    }

    return batchSerialNumber || `SRN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-RW01`;
  }, [selectedItems, batchSerialNumber, targetBatch]);

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
    setOcrDetectionNote('');
    const reader = new FileReader();
    reader.onloadend = async () => {
      setPreviewImage(reader.result);

      // Trigger automatic AI OCR to extract Official Reference / Control Number
      setIsScanningOcr(true);
      setOcrProgress(15);
      try {
        const ocrResult = await scanReceiptProof(file, (pct) => setOcrProgress(pct));
        if (ocrResult?.referenceNumber) {
          setReferenceNumber(ocrResult.referenceNumber);
          setOcrDetectionNote(`Auto-detected: ${ocrResult.referenceNumber}`);
        }
        if (ocrResult?.mobile && !senderMobile) {
          setSenderMobile(ocrResult.mobile);
        }
      } catch (err) {
        console.warn('OCR error:', err);
      } finally {
        setIsScanningOcr(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCount === 0) {
      setFormError('Please select at least one Trans ID ticket to attach remittance proof.');
      return;
    }

    const effectiveReferenceNumber = (referenceNumber.trim() || effectiveBatchSrn || `SRN-BATCH-${Date.now().toString().slice(-6)}`).toUpperCase();
    const effectiveAmount = !isNaN(parseFloat(customRemittanceAmount)) && parseFloat(customRemittanceAmount) > 0 
      ? parseFloat(customRemittanceAmount) 
      : (parseFloat(selectedWinTotal || 0) || 0);

    if (!isAdmin && !referenceNumber.trim()) {
      setFormError('Please enter the official remittance reference / control number.');
      return;
    }

    if (effectiveAmount <= 0) {
      setFormError('Please enter a valid total remittance amount.');
      return;
    }

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

      // 3. Create parent remittance receipt entry conforming exactly to Supabase schema (keyed by dynamic SRN)
      const primaryTransId = effectiveBatchSrn || (transIds.length === 1 ? (String(transIds[0]).startsWith('SRN-') ? transIds[0] : `SRN-${transIds[0]}`) : `SRN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-RW01`);
      const receiptPayload = {
        batch_serial_no: primaryTransId,
        sub_office: subOfficeName,
        uploaded_by_user: currentUser?.username || 'SYSTEM',
        payment_channel: paymentChannel || 'DIRECT_REMITTANCE',
        reference_number: effectiveReferenceNumber,
        sender_name: senderName.trim() || currentUser?.full_name || 'System Administrator',
        sender_mobile: senderMobile.trim() || null,
        bank_name: paymentChannel === 'BANK_TRANSFER' ? bankName : null,
        remittance_amount: parseFloat(effectiveAmount) || 0,
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
        const { error: updateError } = await supabase
          .from('returned_winnings')
          .update({
            receipt_status: 'PENDING_VERIFICATION',
            sub_office: subOfficeName,
            batch_serial_no: effectiveBatchSrn || null,
            updated_at: new Date().toISOString()
          })
          .in('transactionId', transIds);

        if (updateError) {
          console.warn("returned_winnings batch update note:", updateError);
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
          channel: paymentChannel,
          ticketsCount: transIds.length,
          batchSerial: effectiveBatchSrn || 'SRN'
        }
      }]);

      if (onSuccess) onSuccess(transIds.length);
      onClose();
    } catch (err) {
      console.error("Remittance submission error:", err);
      setFormError(err.message || 'Failed to submit batch remittance proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
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
          onSubmit={handleSubmit} 
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
                <span className="font-black text-[#002B66] truncate block text-xs mt-0.5 underline">{effectiveBatchSrn || 'SRN-000000'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100/80 shadow-2xs">
                <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">Selected Tickets</span>
                <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">
                  <span className="text-[#002B66] font-black">{selectedCount}</span> / {targetBatch.count} Tickets
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100/80 shadow-2xs">
                <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">Selected Win Liability</span>
                <span className="font-extrabold text-emerald-700 text-xs mt-0.5 block">₱{Number(selectedWinTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* MEMOIZED TICKETS TABLE WITH CHECKBOX SELECTION */}
          <BatchTicketsTable
            items={filteredTickets}
            selectedKeys={selectedKeys}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            selectedWinTotal={selectedWinTotal}
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'GCASH', name: 'GCash', icon: Smartphone, color: 'text-blue-600' },
                  { id: 'CEBUANA', name: 'Cebuana', icon: Building2, color: 'text-rose-600' },
                  { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: Landmark, color: 'text-emerald-600' },
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
              {/* AI OCR Scanning & Auto-Detect Banner */}
              {isScanningOcr && (
                <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl flex items-center justify-between text-xs font-bold animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <Loader2 size={16} className="animate-spin text-[#002B66]" />
                    <span>AI scanning receipt image for Official Reference / Control No...</span>
                  </div>
                  <span className="font-mono text-xs bg-blue-100 px-2 py-0.5 rounded-full text-[#002B66]">{ocrProgress}%</span>
                </div>
              )}

              {ocrDetectionNote && !isScanningOcr && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs font-bold animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-emerald-600" />
                    <span>{ocrDetectionNote}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 uppercase font-sans font-black bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                    Auto-Fetched ✨
                  </span>
                </div>
              )}

              {/* Reference Number & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase">
                      Official Reference / Control No. *
                    </label>
                    {referenceNumber && ocrDetectionNote && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={11} /> Auto-Fetched
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10029384758 / CEB-9982"
                    value={referenceNumber}
                    onChange={(e) => {
                      setReferenceNumber(e.target.value);
                      if (ocrDetectionNote) setOcrDetectionNote('');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#002B66] focus:bg-white px-3 py-2 rounded-lg font-mono font-bold text-[#002B66] uppercase outline-none transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase">
                      Total Remittance Amount (₱) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomRemittanceAmount(Number(selectedWinTotal || 0).toFixed(2))}
                      className="text-[10px] text-[#002B66] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={11} className="text-amber-500" /> Match Selected Total
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={customRemittanceAmount}
                    onChange={(e) => setCustomRemittanceAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#002B66] focus:bg-white px-3 py-2 rounded-lg font-mono font-extrabold text-emerald-700 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Bank Name if Bank Transfer */}
              {paymentChannel === 'BANK_TRANSFER' && (
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase block mb-1">
                    Beneficiary Bank
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
                  className="max-h-44 rounded-lg object-contain border border-emerald-200 shadow-xs" 
                />
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer bg-white px-3 py-1 rounded-full border border-rose-200 shadow-2xs"
                >
                  <X size={13} /> Remove & Change Image
                </button>
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
              <strong>Automated Ledger Transition:</strong> Upon submission, all <strong>{selectedCount} selected records</strong> in this Sunday–Saturday batch will immediately move to <strong>Collections & Commissions</strong> with their 4-tier commission pools, and the remittance proof will be queued for superadmin verification.
            </span>
          </div>

        </form>

        {/* 3. FIXED MODAL FOOTER (Always visible without scrolling!) */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">
              Target Liability: <strong className="text-emerald-700 font-mono font-black">₱{Number(selectedWinTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </span>
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
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Moving to Collections...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Confirm & Move {selectedCount} Records</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default memo(AttachWeeklyProofModal);

