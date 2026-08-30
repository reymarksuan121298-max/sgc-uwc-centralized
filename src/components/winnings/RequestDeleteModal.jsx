import { useState } from 'react';
import { Trash2, X, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { getTicketTransId } from '../../utils/formatters';

export default function RequestDeleteModal({
  isOpen,
  onClose,
  ticket,
  currentUser,
  onSuccess
}) {
  const [reason, setReason] = useState('Winning ticket has been claimed in the system. Requesting deletion and deduction from collections.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !ticket) return null;

  const transId = getTicketTransId(ticket, 'N/A');
  const winAmount = parseFloat(ticket.winAmount ?? 0);
  const displayAccount = ticket.fullName || ticket.outlet || ticket.username || 'Accountable Teller';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('Please provide a reason for the deletion request.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        deletion_request_status: 'PENDING_ADMIN_APPROVAL',
        deletion_request_reason: reason.trim(),
        deletion_request_by: currentUser?.full_name || currentUser?.username || 'Unclaimed Specialist',
        updated_at: new Date().toISOString()
      };

      // 1. Update returned_winnings record
      let query = supabase.from('returned_winnings').update(payload);
      if (ticket.id) {
        query = query.eq('id', ticket.id);
      } else {
        query = query.eq('transactionId', transId);
      }

      const { error: updateError } = await query;
      if (updateError) {
        // Fallback: If custom deletion columns not yet added to SQL, update status in settlementStatus / remarks
        const fallbackQuery = supabase
          .from('returned_winnings')
          .update({
            deletion_request_status: 'PENDING_ADMIN_APPROVAL',
            updated_at: new Date().toISOString()
          });
        const finalQuery = ticket.id ? fallbackQuery.eq('id', ticket.id) : fallbackQuery.eq('transactionId', transId);
        const { error: fbErr } = await finalQuery;
        if (fbErr) throw updateError;
      }

      // 2. Insert Audit Log
      try {
        await supabase.from('audit_logs').insert([{
          actor_username: currentUser?.username || 'staff',
          actor_role: currentUser?.role || 'Unclaimed Specialist',
          action: 'CLAIMED_TICKET_DELETION_REQUESTED',
          target_type: 'RETURNED_WINNING',
          target_id: transId,
          sub_office: ticket.sub_office || currentUser?.sub_office || 'All',
          details: {
            transId,
            winAmount,
            requester: currentUser?.username,
            reason: payload.deletion_request_reason
          }
        }]);
      } catch (auditErr) {
        console.warn('Audit log write error:', auditErr);
      }

      if (onSuccess) {
        onSuccess(transId);
      }
      onClose();
    } catch (err) {
      console.error('Failed to submit deletion request:', err);
      setErrorMessage(err.message || 'Failed to submit deletion request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="bg-rose-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-700/80 rounded-lg border border-rose-500/60 text-white">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">Request Deletion</h3>
              <p className="text-[10px] text-rose-100 font-semibold">Claimed Winning Ticket • Admin Approval Required</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="text-rose-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Informational Alert */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              This winning ticket is marked as <strong>ALREADY CLAIMED</strong>. Submitting this request will ask the <strong>Admin</strong> to approve deleting it, which will deduct it from total collections.
            </p>
          </div>

          {/* Ticket Details Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-sans text-slate-500 font-bold">Transaction SRN / ID:</span>
              <span className="font-bold text-[#002B66]">{transId}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-sans text-slate-500 font-bold">Claimant / Teller:</span>
              <span className="font-bold text-slate-800 uppercase">{displayAccount}</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="font-sans text-slate-500 font-bold">Win Liability Amount:</span>
              <span className="font-extrabold text-emerald-700 text-sm">₱{winAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium text-[11px]">
              {errorMessage}
            </div>
          )}

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Reason for Deletion Request <span className="text-rose-500">*</span>
            </label>
            <textarea 
              rows={3} 
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for deletion request..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[11px] shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Submit Request to Admin</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
