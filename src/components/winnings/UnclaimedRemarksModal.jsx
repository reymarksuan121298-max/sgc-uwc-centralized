import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Save, Trash2, Clock, User, AlertTriangle, Sparkles, Check } from 'lucide-react';
import { unclaimedRemarksService } from '../../services/unclaimedRemarksService';

const QUICK_TAGS = [
  'Customer requested extension',
  'Ticket holder out of town',
  'Verifying ticket slip with teller',
  'Awaiting supervisor confirmation',
  'Pending identification requirements',
  'Special handling / endorsement'
];

export default function UnclaimedRemarksModal({
  ticket,
  transId,
  ageDays,
  existingRemark,
  currentUser,
  onClose,
  onSaved
}) {
  const [remarkText, setRemarkText] = useState(existingRemark?.remark || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    setRemarkText(existingRemark?.remark || '');
  }, [existingRemark]);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!transId) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const saved = await unclaimedRemarksService.saveRemark({
        transId,
        remarkText,
        ticket,
        currentUser
      });
      if (onSaved) onSaved(transId, saved);
      onClose();
    } catch (err) {
      console.error('Failed to save remark:', err);
      setErrorMsg(err.message || 'Failed to save remark. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove the remarks for this ticket?')) return;
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await unclaimedRemarksService.deleteRemark(transId, currentUser);
      if (onSaved) onSaved(transId, null);
      onClose();
    } catch (err) {
      console.error('Failed to delete remark:', err);
      setErrorMsg(err.message || 'Failed to delete remark.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApplyTag = (tag) => {
    if (!remarkText.trim()) {
      setRemarkText(tag);
    } else if (!remarkText.includes(tag)) {
      setRemarkText(`${remarkText.trim()}; ${tag}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-[#002B66] bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#FFD700] bg-[#002B66] px-5 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#FFD700] p-2 text-[#002B66] shadow-xs">
              <MessageSquare size={19} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">
                Ticket Action • Pending Remarks
              </p>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2">
                <span>{transId}</span>
                {ageDays !== null && (
                  <span className="text-[10px] bg-rose-500/80 text-white font-mono px-2 py-0.5 rounded-full font-bold">
                    {ageDays} Days Overdue
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={19} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ticket Snapshot Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 font-sans font-bold uppercase block">Teller / Outlet</span>
              <span className="font-extrabold text-slate-800 truncate block">
                {ticket?.fullName || ticket?.outlet || ticket?.username || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-sans font-bold uppercase block">Bet No.</span>
              <span className="font-extrabold text-[#002B66] block">
                {ticket?.betNo || ticket?.CombiNo || 'N/A'}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 font-sans font-bold uppercase block">Win Amount</span>
              <span className="font-extrabold text-emerald-700 block">
                ₱{parseFloat(ticket?.winAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Existing Remark Metadata */}
          {existingRemark?.updatedAt && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-2 font-mono">
              <span className="flex items-center gap-1.5 font-sans">
                <User size={13} className="text-amber-700 shrink-0" />
                <span>Last updated by <strong className="text-slate-800">{existingRemark.author || 'Staff'}</strong></span>
              </span>
              <span className="flex items-center gap-1 text-[10px]">
                <Clock size={12} className="text-amber-700 shrink-0" />
                <span>{new Date(existingRemark.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            </div>
          )}

          {/* Quick Suggestion Tags */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-[#002B66]" /> Quick Remarks Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTag(tag)}
                  className="text-[11px] bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#002B66] border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Remark Text Area */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
              Remarks / Justification
            </label>
            <textarea
              rows={4}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="State reason for overdue pending ticket (e.g., ticket holder out of town, awaiting physical ticket verification, etc.)..."
              className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-[#002B66] focus:ring-2 focus:ring-[#002B66]/20 outline-none leading-relaxed transition-all placeholder:text-slate-400"
              autoFocus
            />
            <p className="text-[10px] text-slate-400">
              Hovering over the ticket row will display this remark in the registry.
            </p>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {existingRemark?.remark ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Deleting...' : 'Remove Remark'}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="inline-flex items-center gap-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Remarks'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
