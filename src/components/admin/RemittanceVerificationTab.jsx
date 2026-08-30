import { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, XCircle, Clock, Eye, Download, Search, 
  Smartphone, Building2, Landmark, FileText, Check, AlertCircle, RefreshCw 
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import ConfirmPopover from '../common/ConfirmPopover';

export default function RemittanceVerificationTab({ currentUser, onDataUpdated }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [approvingReceipt, setApprovingReceipt] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // Default to PENDING for fast queue triage
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('remittance_receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setReceipts([]);
        return;
      }
      setReceipts(data || []);
    } catch (err) {
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const filteredList = useMemo(() => {
    return receipts.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.verification_status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        (r.transactionId || '').toLowerCase().includes(q) ||
        (r.reference_number || '').toLowerCase().includes(q) ||
        (r.sub_office || '').toLowerCase().includes(q) ||
        (r.sender_name || '').toLowerCase().includes(q) ||
        (r.uploaded_by_user || '').toLowerCase().includes(q)
      );
      return matchStatus && matchSearch;
    });
  }, [receipts, statusFilter, searchQuery]);

  const handleApprove = (receipt) => {
    setApprovingReceipt(receipt);
  };

  const executeApprove = async () => {
    if (!approvingReceipt) return;
    const receipt = approvingReceipt;
    const displayId = receipt.batch_serial_no || receipt.transactionId || receipt.reference_number || 'Batch';

    setIsProcessing(true);
    try {
      // 1. Update remittance_receipts
      const { error: rErr } = await supabase
        .from('remittance_receipts')
        .update({
          verification_status: 'VERIFIED',
          verified_by: currentUser?.full_name || currentUser?.username || 'Staff',
          verified_at: new Date().toISOString()
        })
        .eq('id', receipt.id);

      if (rErr) throw rErr;

      // 2. Update returned_winnings
      if (receipt.batch_serial_no) {
        await supabase
          .from('returned_winnings')
          .update({ receipt_status: 'VERIFIED' })
          .eq('batch_serial_no', receipt.batch_serial_no);
      } else if (receipt.transactionId) {
        await supabase
          .from('returned_winnings')
          .update({ receipt_status: 'VERIFIED' })
          .eq('transactionId', receipt.transactionId);
      }

      // 3. Log into audit trail
      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'user',
        actor_role: currentUser?.role || 'Staff',
        action: 'RECEIPT_VERIFIED',
        target_type: 'RECEIPT',
        target_id: displayId,
        sub_office: receipt.sub_office,
        details: {
          ref: receipt.reference_number,
          amount: receipt.remittance_amount,
          batchSerial: receipt.batch_serial_no || null
        }
      }]);

      showToast(`Receipt for ${displayId} marked VERIFIED!`);
      setApprovingReceipt(null);
      fetchReceipts();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      console.error('Approve failed:', err);
      showToast(`Failed to approve receipt: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedReceipt) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    const displayId = selectedReceipt.batch_serial_no || selectedReceipt.transactionId || selectedReceipt.reference_number || 'Batch';
    setIsProcessing(true);
    try {
      // 1. Update remittance_receipts
      const { error: rErr } = await supabase
        .from('remittance_receipts')
        .update({
          verification_status: 'REJECTED',
          verified_by: currentUser?.full_name || currentUser?.username || 'Staff',
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', selectedReceipt.id);

      if (rErr) throw rErr;

      // 2. Update returned_winnings
      if (selectedReceipt.batch_serial_no) {
        await supabase
          .from('returned_winnings')
          .update({ receipt_status: 'REJECTED' })
          .eq('batch_serial_no', selectedReceipt.batch_serial_no);
      } else if (selectedReceipt.transactionId) {
        await supabase
          .from('returned_winnings')
          .update({ receipt_status: 'REJECTED' })
          .eq('transactionId', selectedReceipt.transactionId);
      }

      // 3. Log audit trail
      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'user',
        actor_role: currentUser?.role || 'Staff',
        action: 'RECEIPT_REJECTED',
        target_type: 'RECEIPT',
        target_id: displayId,
        sub_office: selectedReceipt.sub_office,
        details: {
          reason: rejectionReason.trim(),
          ref: selectedReceipt.reference_number,
          batchSerial: selectedReceipt.batch_serial_no || null
        }
      }]);

      showToast(`Receipt for ${displayId} marked as REJECTED.`);
      setRejectModalOpen(false);
      setSelectedReceipt(null);
      setRejectionReason('');
      await fetchReceipts();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border-l-4 border-[#FFD700] text-xs font-bold animate-bounce">
          <CheckCircle2 size={16} className="text-[#FFD700]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search SRN, Ref No, Branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 focus:border-[#002B66] outline-none"
          >
            <option value="PENDING">Pending Review ({receipts.filter(r => r.verification_status === 'PENDING').length})</option>
            <option value="VERIFIED">Verified ({receipts.filter(r => r.verification_status === 'VERIFIED').length})</option>
            <option value="REJECTED">Rejected ({receipts.filter(r => r.verification_status === 'REJECTED').length})</option>
            <option value="ALL">All Receipts ({receipts.length})</option>
          </select>
        </div>

        <button
          onClick={fetchReceipts}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-[#002B66] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Verification Queue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 font-bold uppercase tracking-wider text-xs">
            Loading verification queue...
          </div>
        ) : !filteredList.length ? (
          <div className="col-span-full p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 font-bold uppercase tracking-wider text-xs">
            No receipts matching current filter.
          </div>
        ) : (
          filteredList.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              
              {/* Card Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SRN</span>
                  <span className="font-mono font-black text-sm text-[#002B66]">{item.batch_serial_no || item.transactionId || item.reference_number || 'SRN'}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  item.verification_status === 'VERIFIED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.verification_status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.verification_status}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 text-xs">
                
                {/* Proof Image Preview */}
                {item.receipt_image_url ? (
                  <div 
                    onClick={() => setSelectedReceipt(item)}
                    className="cursor-pointer group relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 h-36 flex items-center justify-center"
                  >
                    <img 
                      src={item.receipt_image_url} 
                      alt="Receipt" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-1 text-xs">
                      <Eye size={16} /> Click to Inspect
                    </div>
                  </div>
                ) : (
                  <div className="h-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 font-medium text-xs">
                    No image attached
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-[11px]">
                  <div>
                    <span className="text-[9px] font-sans font-bold text-slate-400 uppercase block">Branch / Office</span>
                    <span className="font-bold text-slate-800">{item.sub_office}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-sans font-bold text-slate-400 uppercase block">Channel</span>
                    <span className="font-bold text-[#002B66]">{item.payment_channel}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-sans font-bold text-slate-400 uppercase block">Ref Number</span>
                    <span className="font-extrabold text-slate-900 truncate block">{item.reference_number}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-sans font-bold text-slate-400 uppercase block">Amount Out</span>
                    <span className="font-black text-emerald-700">₱{parseFloat(item.remittance_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {item.rejection_reason && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded-lg text-[11px]">
                    <span className="font-bold block text-[9px] uppercase">Rejection Reason:</span>
                    {item.rejection_reason}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => setSelectedReceipt(item)}
                  className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Inspect</span>
                </button>

                {item.verification_status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-xs font-black shadow-xs transition-colors cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => { setSelectedReceipt(item); setRejectModalOpen(true); }}
                      disabled={isProcessing}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                      title="Reject"
                    >
                      <XCircle size={16} />
                    </button>
                  </>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* Inspector Modal */}
      {selectedReceipt && !rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#002B66] text-white px-5 py-3 flex items-center justify-between border-b-2 border-[#FFD700]">
              <span className="font-extrabold text-xs uppercase tracking-wider text-white">
                Inspect Remittance Proof — {selectedReceipt.batch_serial_no || selectedReceipt.transactionId || selectedReceipt.reference_number || 'SRN'}
              </span>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-300 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            <div className="p-4 space-y-3">
              {selectedReceipt.receipt_image_url && (
                <div className="bg-slate-100 rounded-xl p-2 max-h-[50vh] overflow-auto flex items-center justify-center border border-slate-200">
                  <img 
                    src={selectedReceipt.receipt_image_url} 
                    alt="Receipt Full View" 
                    className="max-h-[45vh] w-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-[9px] font-sans text-slate-400 block uppercase">SRN</span>
                  <span className="font-black text-[#002B66]">{selectedReceipt.batch_serial_no || selectedReceipt.transactionId || selectedReceipt.reference_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-sans text-slate-400 block uppercase">Remitted Amount</span>
                  <span className="font-extrabold text-emerald-700">₱{parseFloat(selectedReceipt.remittance_amount || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-sans text-slate-400 block uppercase">Channel & Ref</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.payment_channel} • {selectedReceipt.reference_number}</span>
                </div>
                <div>
                  <span className="text-[9px] font-sans text-slate-400 block uppercase">Sub-Office & Officer</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.sub_office} ({selectedReceipt.uploaded_by_user})</span>
                </div>
              </div>

              {selectedReceipt.verification_status === 'PENDING' && (
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                  <button
                    onClick={() => setRejectModalOpen(true)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 cursor-pointer"
                  >
                    Reject Receipt
                  </button>
                  <button
                    onClick={() => handleApprove(selectedReceipt)}
                    disabled={isProcessing}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-md cursor-pointer"
                  >
                    Approve & Mark Verified
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-600 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <h4 className="font-black text-sm uppercase text-rose-700">
              Reject Remittance Proof ({selectedReceipt.transactionId})
            </h4>
            <p className="text-xs text-slate-600">
              Please provide a clear reason for rejecting this remittance receipt so the sub-office can correct it:
            </p>
            <textarea
              rows={3}
              required
              placeholder="e.g. Reference number does not match amount in GCash ledger, image blurred."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-rose-600 outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE REMITTANCE CONFIRM POPOVER */}
      <ConfirmPopover
        isOpen={Boolean(approvingReceipt)}
        title="Verify Remittance Receipt"
        type="success"
        confirmText="Verify & Approve"
        isLoading={isProcessing}
        onCancel={() => setApprovingReceipt(null)}
        onConfirm={executeApprove}
      >
        {approvingReceipt && (
          <div className="space-y-3">
            <p className="text-slate-700">
              Are you sure you want to <strong>APPROVE and VERIFY</strong> this remittance proof?
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                <span className="text-slate-500 font-sans font-bold">Reference / SRN:</span>
                <span className="font-black text-[#002B66]">{approvingReceipt.reference_number || approvingReceipt.batch_serial_no}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                <span className="text-slate-500 font-sans font-bold">Sub-Office / Channel:</span>
                <span className="font-bold text-slate-800">{approvingReceipt.sub_office} ({approvingReceipt.payment_channel})</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 font-sans font-bold">Remitted Amount:</span>
                <span className="font-extrabold text-emerald-800 text-sm">
                  ₱{parseFloat(approvingReceipt.remittance_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              This will update the remittance status to VERIFIED and mark all enclosed returned tickets as verified.
            </p>
          </div>
        )}
      </ConfirmPopover>

    </div>
  );
}
