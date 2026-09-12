import { useState, useRef } from 'react';
import { 
  Trash2, X, AlertTriangle, Send, Loader2, UploadCloud, 
  Image as ImageIcon, Camera, CheckCircle2, ShieldAlert,
  Clock
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { getTicketTransId } from '../../utils/formatters';
import { compressImageFile } from '../../utils/imageCompressor';
import TimestampCaptureModal from './TimestampCaptureModal';
import { isAdminRole, isSuperAdminRole, isSSRRole } from '../../utils/permissions';

export default function RequestDeleteModal({
  isOpen,
  onClose,
  ticket,
  currentUser,
  onSuccess
}) {
  const [reason, setReason] = useState('Winning ticket has been claimed in the system. Requesting deletion and deduction from collections.');
  const [ticketImage, setTicketImage] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTimestampModalOpen, setIsTimestampModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const canUseTimestampScreen = currentUser && (
    isSSRRole(currentUser.role) || 
    isAdminRole(currentUser.role) || 
    isSuperAdminRole(currentUser.role)
  );

  if (!isOpen || !ticket) return null;

  const transId = getTicketTransId(ticket, 'N/A');
  const winAmount = parseFloat(ticket.winAmount ?? 0);
  const displayAccount = ticket.fullName || ticket.outlet || ticket.username || 'Accountable Teller';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size should be less than 15MB.');
      return;
    }

    setErrorMessage('');
    setIsCompressing(true);

    try {
      // Compress to lightweight high-quality base64 (<150KB)
      const compressedDataUrl = await compressImageFile(file, 1280, 1280, 0.82);
      setTicketImage(compressedDataUrl);
    } catch (err) {
      console.error('Image compression failed:', err);
      setErrorMessage('Failed to process image. Please try another file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    setIsCompressing(true);
    setErrorMessage('');

    try {
      const compressedDataUrl = await compressImageFile(file, 1280, 1280, 0.82);
      setTicketImage(compressedDataUrl);
    } catch (err) {
      console.error('Drop compression error:', err);
      setErrorMessage('Failed to process image file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!ticketImage) {
      setErrorMessage('⚠️ Please upload a clear photo of the Hard Copy Winning Ticket before submitting.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Please provide a reason or justification for the deletion request.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        deletion_request_status: 'PENDING_ADMIN_APPROVAL',
        deletion_request_reason: reason.trim(),
        deletion_request_by: currentUser?.full_name || currentUser?.username || 'SSR / Specialist',
        deletion_request_attachment: ticketImage,
        hard_copy_ticket_url: ticketImage,
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
            deletion_request_reason: reason.trim(),
            deletion_request_attachment: ticketImage,
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
          actor_role: currentUser?.role || 'SSR',
          action: 'CLAIMED_TICKET_DELETION_REQUESTED',
          target_type: 'RETURNED_WINNING',
          target_id: transId,
          sub_office: ticket.sub_office || currentUser?.sub_office || 'All',
          details: {
            transId,
            winAmount,
            requester: currentUser?.username,
            reason: payload.deletion_request_reason,
            hasHardCopyProof: true
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
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="bg-rose-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-700/80 rounded-xl border border-rose-500/60 text-white">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">Request Claimed Ticket Deletion</h3>
              <p className="text-[10px] text-rose-100 font-semibold">Attach Hard Copy Ticket • Admin Approval Required</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
          {/* Informational Alert */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              To request deletion and collection deduction for this ticket, you <strong>MUST upload a clear photo or scan of the physical hard copy ticket</strong> for Unclaimed Specialist verification.
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
              <span className="font-sans text-slate-500 font-bold">Win Amount:</span>
              <span className="font-extrabold text-emerald-700 text-sm">₱{winAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* HARD COPY TICKET UPLOAD SECTION (MANDATORY) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={13} className="text-rose-600" />
                <span>Hard Copy Winning Ticket Photo</span>
                <span className="text-rose-600 font-black">*</span>
              </label>
              <span className="text-[9.5px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Required Proof
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {canUseTimestampScreen && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTimestampModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex-1 cursor-pointer"
                >
                  <Clock size={16} />
                  <span>Open Timestamp Screen</span>
                </button>
              </div>
            )}

            {!ticketImage ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  errorMessage && !ticketImage
                    ? 'border-rose-400 bg-rose-50/50 hover:bg-rose-50'
                    : 'border-slate-300 hover:border-[#002B66] bg-slate-50/60 hover:bg-blue-50/40'
                }`}
              >
                {isCompressing ? (
                  <div className="space-y-2 py-2">
                    <Loader2 size={24} className="animate-spin text-[#002B66] mx-auto" />
                    <p className="font-bold text-slate-600 text-[11px]">Compressing Ticket Photo...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 text-[#002B66] mb-2">
                      <UploadCloud size={24} />
                    </div>
                    <p className="font-black text-slate-800 text-[11px]">
                      Click or Drag & Drop to Upload Ticket Photo
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Supports JPG, PNG, WEBP • Max 15MB
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="relative border border-emerald-300 bg-emerald-50/40 rounded-xl p-3 flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-900 border border-emerald-300 shrink-0 relative group">
                  <img
                    src={ticketImage}
                    alt="Hard copy ticket preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ImageIcon size={18} className="text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span className="truncate">Hard Copy Attached</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Image ready for verification inspection
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-bold text-[#002B66] hover:underline cursor-pointer"
                    >
                      Change Photo
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setTicketImage(null)}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Reason / Justification <span className="text-rose-500">*</span>
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

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium text-[11px] flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
              disabled={isSubmitting || !ticketImage}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-black uppercase text-[11px] shadow-sm transition-all cursor-pointer active:scale-95 ${
                !ticketImage
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Submit to Unclaimed Specialist</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>

      {/* Fullscreen Timestamp Capture Modal */}
      <TimestampCaptureModal 
        isOpen={isTimestampModalOpen} 
        onClose={() => setIsTimestampModalOpen(false)} 
      />
    </>
  );
}
