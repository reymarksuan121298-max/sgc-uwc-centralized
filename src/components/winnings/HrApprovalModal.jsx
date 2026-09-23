import { useState, useEffect } from 'react';
import {
  ShieldCheck, Check, X, AlertTriangle, Clock, Building2, UserCheck,
  CheckCircle2, Mail, Loader2, Sparkles, FileText, Ban
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { formatDrawTime } from '../../utils/formatters';
import { systemService } from '../../services/systemService';

export default function HrApprovalModal({
  isOpen,
  onClose,
  transId,
  hrEmail,
  onApproved
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [branchHeadName, setBranchHeadName] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverEmail, setApproverEmail] = useState(hrEmail || '');
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null); // 'APPROVED' | 'REJECTED'

  useEffect(() => {
    if (!isOpen || !transId) return;

    let isMounted = true;
    async function fetchTicket() {
      setLoading(true);
      setError(null);
      setActionSuccess(null);
      setBranchHeadName('');
      try {
        const { data, error: qErr } = await supabase
          .from('returned_winnings')
          .select('*')
          .eq('transactionId', transId)
          .maybeSingle();

        if (qErr) throw qErr;
        if (!data) {
          setError(`No record found for Transaction ID: "${transId}". Please verify the link.`);
          return;
        }

        if (isMounted) {
          setTicket(data);
          if (data.hr_valid_email && !approverEmail) {
            setApproverEmail(data.hr_valid_email);
          }

          // Fetch and pre-populate Branch Head / Manager Name from Sub-Office
          const targetOffice = data.sub_office || data.location || data.address || '';
          try {
            const details = await systemService.resolveSubOfficeDetails(targetOffice);
            if (details?.head_name) {
              const head = details.head_name.trim();
              setBranchHeadName(head);
              setApproverName(head);
            }
          } catch (soErr) {
            console.warn('Could not resolve sub-office branch head:', soErr);
          }

          if (data.unclaimed_approval_status === 'APPROVED') {
            setActionSuccess('APPROVED');
          } else if (data.unclaimed_approval_status === 'REJECTED') {
            setActionSuccess('REJECTED');
          }
        }
      } catch (err) {
        console.error('Failed to load ticket for HR approval:', err);
        if (isMounted) setError(err.message || 'Failed to fetch ticket data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchTicket();
    return () => {
      isMounted = false;
    };
  }, [isOpen, transId]);

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!approverName.trim()) {
      alert("Please provide the HR Approver's Full Name.");
      return;
    }

    setIsProcessing(true);
    try {
      const finalApprover = `${approverName.trim()} (HR: ${approverEmail.trim() || 'Verified'})`;
      const issueText = remarks.trim() || `Approved ${ticket?.teller_status || 'Inactive'} status via HR Email link`;

      const { error: updErr } = await supabase
        .from('returned_winnings')
        .update({
          unclaimed_approval_status: 'APPROVED',
          unclaimed_approved_by: finalApprover,
          unclaimed_approval_issue: issueText
        })
        .eq('transactionId', transId);

      if (updErr) throw updErr;

      // Write to audit logs
      try {
        await supabase.from('audit_logs').insert([{
          actor_username: approverName.trim(),
          actor_role: 'HR Officer',
          action: 'HR_TELLER_STATUS_APPROVED',
          target_type: 'returned_winnings',
          target_id: transId,
          sub_office: ticket?.sub_office || 'All',
          details: {
            teller_status: ticket?.teller_status,
            hr_email: approverEmail.trim(),
            notes: issueText
          }
        }]);
      } catch (logErr) {
        console.warn('Audit log insert warning:', logErr);
      }

      setActionSuccess('APPROVED');
      if (onApproved) onApproved(transId, 'APPROVED');
    } catch (err) {
      console.error('Approval failed:', err);
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!approverName.trim()) {
      alert("Please provide the HR Approver's Full Name.");
      return;
    }

    setIsProcessing(true);
    try {
      const finalApprover = `${approverName.trim()} (HR: ${approverEmail.trim() || 'Verified'})`;
      const issueText = remarks.trim() || `Rejected ${ticket?.teller_status || 'Inactive'} status by HR`;

      const { error: updErr } = await supabase
        .from('returned_winnings')
        .update({
          unclaimed_approval_status: 'REJECTED',
          unclaimed_approved_by: finalApprover,
          unclaimed_approval_issue: issueText
        })
        .eq('transactionId', transId);

      if (updErr) throw updErr;

      try {
        await supabase.from('audit_logs').insert([{
          actor_username: approverName.trim(),
          actor_role: 'HR Officer',
          action: 'HR_TELLER_STATUS_REJECTED',
          target_type: 'returned_winnings',
          target_id: transId,
          sub_office: ticket?.sub_office || 'All',
          details: {
            teller_status: ticket?.teller_status,
            hr_email: approverEmail.trim(),
            notes: issueText
          }
        }]);
      } catch (logErr) {
        console.warn('Audit log insert warning:', logErr);
      }

      setActionSuccess('REJECTED');
      if (onApproved) onApproved(transId, 'REJECTED');
    } catch (err) {
      console.error('Rejection failed:', err);
      alert(`Rejection error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    // Clear the HR query params from URL cleanly
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('hr_approval_transId');
      url.searchParams.delete('hr_transId');
      url.searchParams.delete('hr_email');
      url.searchParams.delete('hr_token');
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-xs flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Navy and Gold Brand Header */}
        <div className="bg-[#002B66] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#FFD700] shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD700] text-[#002B66] p-2 rounded-xl font-black shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-1.5">
                <span>HR Approval Portal</span>
                <span className="text-[10px] bg-blue-800 text-[#FFD700] px-2 py-0.5 rounded-full font-bold">Official HR Desk</span>
              </h2>
              <p className="text-[11px] text-blue-200 font-medium mt-0.5">
                AWOL / Pull-Out / Terminated Teller Status Verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-300 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 font-semibold">
              <Loader2 size={32} className="animate-spin text-[#002B66]" />
              <span>Fetching ticket & verification details...</span>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center space-y-2">
              <AlertTriangle size={28} className="text-rose-600 mx-auto" />
              <h3 className="font-black text-rose-900 uppercase text-xs">Record Not Found or Link Expired</h3>
              <p className="text-slate-600 text-xs">{error}</p>
            </div>
          ) : ticket ? (
            <>
              {/* Notice Banner */}
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3">
                <Mail size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="text-slate-700 leading-relaxed text-xs">
                  <p className="font-bold text-amber-900">
                    Direct HR Verification Request
                  </p>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    This ticket requires direct HR confirmation for the teller status 
                    <strong className="text-[#002B66] font-black uppercase"> ({ticket.teller_status || 'Inactive'})</strong>. 
                    Unclaimed Specialists do not approve this record.
                  </p>
                </div>
              </div>

              {/* Status Outcome Banner if already processed */}
              {actionSuccess === 'APPROVED' ? (
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 text-center space-y-2 animate-in zoom-in-95">
                  <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
                  <h3 className="font-black text-emerald-900 uppercase text-sm">Teller Status Approved by HR</h3>
                  <p className="text-emerald-800 text-xs">
                    This ticket ({ticket.transactionId}) has been verified and approved under <strong>{ticket.teller_status}</strong>.
                  </p>
                  {ticket.unclaimed_approved_by && (
                    <div className="inline-block bg-white border border-emerald-300 px-3 py-1 rounded-lg text-[11px] font-bold text-emerald-800">
                      Approved By: {ticket.unclaimed_approved_by}
                    </div>
                  )}
                </div>
              ) : actionSuccess === 'REJECTED' ? (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-center space-y-2 animate-in zoom-in-95">
                  <Ban size={36} className="text-rose-600 mx-auto" />
                  <h3 className="font-black text-rose-900 uppercase text-sm">Teller Status Rejected by HR</h3>
                  <p className="text-rose-800 text-xs">
                    This status has been rejected. The ticket will remain flagged for review.
                  </p>
                </div>
              ) : null}

              {/* Ticket Details Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans font-extrabold text-[10px] uppercase tracking-wider">Transaction ID:</span>
                  <span className="font-black text-[#002B66] text-xs">{ticket.transactionId}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans font-extrabold text-[10px] uppercase tracking-wider">Teller / Outlet:</span>
                  <span className="font-bold text-slate-800 uppercase">{ticket.fullName || ticket.outlet || 'N/A'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans font-extrabold text-[10px] uppercase tracking-wider">Sub-Office / Branch:</span>
                  <span className="font-bold text-slate-700">{ticket.sub_office || 'Central Office'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans font-extrabold text-[10px] uppercase tracking-wider">Draw Schedule:</span>
                  <span className="font-semibold text-slate-700">{formatDrawTime ? formatDrawTime(ticket.drawTime || ticket.drawDate) : ticket.drawTime || 'N/A'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans font-extrabold text-[10px] uppercase tracking-wider">Winning Amount:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    ₱{parseFloat(ticket.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-500 font-sans font-extrabold text-[10px] uppercase tracking-wider">Teller Status to Approve:</span>
                  <span className="font-black text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider">
                    {ticket.teller_status || 'INACTIVE'}
                  </span>
                </div>
              </div>

              {/* HR Form Inputs (Only visible if not already decided) */}
              {!actionSuccess && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                        Branch Head / Manager Name <span className="text-rose-600">*</span>
                      </label>
                      {branchHeadName && (
                        <span className="text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          Fetched from Branch: {branchHeadName}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder={branchHeadName ? `e.g. ${branchHeadName}` : "e.g. Maria Santos (Branch Head / Manager)"}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#002B66]/20 focus:border-[#002B66] transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      HR Email Address <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      value={approverEmail}
                      onChange={(e) => setApproverEmail(e.target.value)}
                      placeholder="hr@example.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-[#002B66]/20 focus:border-[#002B66] transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Approval Remarks / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="e.g. Employee separation/AWOL verified with regional office..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#002B66]/20 focus:border-[#002B66] transition-all"
                    />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 font-black uppercase text-[11px] text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {actionSuccess ? 'Close Window' : 'Cancel'}
          </button>

          {!actionSuccess && ticket && (
            <>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing || !approverName.trim()}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-black uppercase text-[11px] transition-all cursor-pointer disabled:opacity-50"
              >
                Reject Status
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessing || !approverName.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#002B66] hover:bg-blue-900 text-white font-black uppercase text-[11px] tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 size={14} className="animate-spin text-[#FFD700]" />
                ) : (
                  <Check size={14} className="text-[#FFD700] stroke-[3]" />
                )}
                <span>Approve Teller Status</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
