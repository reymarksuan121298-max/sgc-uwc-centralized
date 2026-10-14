import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, CheckCircle2, Ban, Clock, Search, Eye,
  FileText, ShieldAlert, UserCheck, Image as ImageIcon,
  Check, X, ChevronRight, Filter
} from 'lucide-react';

export default function DeletionRequestsTable({
  requests = [],
  isLoading = false,
  canApprove = false,
  formatDrawTime,
  onApprove,
  onReject,
  onViewTicket,
  onRefresh
}) {
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING_APPROVAL, APPROVED, REJECTED
  const [searchTerm, setSearchTerm] = useState('');

  // Counts
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;

    requests.forEach(r => {
      const st = r.status || 'PENDING_APPROVAL';
      const win = parseFloat(r.win_amount || r.winAmount || 0);
      if (st === 'PENDING_APPROVAL' || st === 'PENDING') {
        pending++;
        pendingAmount += win;
      } else if (st === 'APPROVED') {
        approved++;
        approvedAmount += win;
      } else if (st === 'REJECTED') {
        rejected++;
      }
    });

    return {
      all: requests.length,
      pending,
      approved,
      rejected,
      pendingAmount,
      approvedAmount
    };
  }, [requests]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return requests.filter(r => {
      const st = r.status || 'PENDING_APPROVAL';
      
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING_APPROVAL' && st !== 'PENDING_APPROVAL' && st !== 'PENDING') return false;
        if (statusFilter === 'APPROVED' && st !== 'APPROVED') return false;
        if (statusFilter === 'REJECTED' && st !== 'REJECTED') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const transId = String(r.transaction_id || r.transactionId || r.transId || '').toLowerCase();
        const teller = String(r.teller_outlet || r.fullName || r.outlet || '').toLowerCase();
        const requester = String(r.requested_by || r.username || '').toLowerCase();
        const reason = String(r.reason || r.deletion_request_reason || '').toLowerCase();
        const betNo = String(r.bet_no || r.betNo || '').toLowerCase();
        const subOffice = String(r.sub_office || '').toLowerCase();

        return (
          transId.includes(q) ||
          teller.includes(q) ||
          requester.includes(q) ||
          reason.includes(q) ||
          betNo.includes(q) ||
          subOffice.includes(q)
        );
      }

      return true;
    });
  }, [requests, statusFilter, searchTerm]);

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-3.5">


      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#002B66] text-[#FFD700] shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PENDING_APPROVAL')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === 'PENDING_APPROVAL'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock size={12} />
            <span>Pending ({counts.pending})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 size={12} />
            <span>Approved ({counts.approved})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Ban size={12} />
            <span>Rejected ({counts.rejected})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Trans ID, Teller, Reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#002B66] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#002B66] text-white text-[11px] font-black uppercase tracking-wider border-b border-blue-900">
                <th className="px-3 py-2.5 border-r border-blue-900/60 whitespace-nowrap">Trans. ID</th>
                <th className="px-3 py-2.5 border-r border-blue-900/60 whitespace-nowrap">Teller / Outlet</th>
                <th className="px-3 py-2.5 border-r border-blue-900/60 text-center whitespace-nowrap">Draw & Combination</th>
                <th className="px-3 py-2.5 border-r border-blue-900/60 text-right whitespace-nowrap">Win Amount</th>
                <th className="px-3 py-2.5 border-r border-blue-900/60 text-center whitespace-nowrap">Deposited?</th>
                <th className="px-3 py-2.5 border-r border-blue-900/60 text-center whitespace-nowrap">Proof Photo</th>
                <th className="px-3 py-2.5 border-r border-blue-900/60 whitespace-nowrap">Requester</th>
                <th className="px-3 py-2.5 border-r border-blue-900/60 text-center whitespace-nowrap">Status</th>
                <th className="px-3 py-2.5 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => {
                  const transId = item.transaction_id || item.transactionId || item.transId || `REC-${idx + 1}`;
                  const teller = item.teller_outlet || item.fullName || item.outlet || 'N/A';
                  const subOffice = item.sub_office || 'All';
                  const winAmt = parseFloat(item.win_amount || item.winAmount || 0);
                  const betAmt = parseFloat(item.bet_amount || item.betAmount || 0);
                  const betNo = item.bet_no || item.betNo || 'N/A';
                  const betCode = item.bet_code || item.betCode || 'RS3';
                  const draw = item.draw_time || item.drawTime || item.drawDate || item.draw || 'N/A';
                  const st = item.status || 'PENDING_APPROVAL';
                  const isPending = st === 'PENDING_APPROVAL' || st === 'PENDING';
                  const isApproved = st === 'APPROVED';
                  const isRejected = st === 'REJECTED';
                  const proofImg = item.attachment_url || item.deletion_request_attachment || item.hard_copy_ticket_url || item.ocr_data?.hard_copy_image;
                  const reason = item.reason || item.deletion_request_reason || 'Claimed ticket deletion';
                  const requester = item.requested_by || item.deletion_request_by || item.username || 'SSR';
                  const reqDate = item.requested_at || item.created_at;

                  return (
                    <tr
                      key={item.id || transId || idx}
                      className={`transition-colors hover:bg-slate-50 ${
                        isPending ? 'bg-amber-50/40' : isApproved ? 'bg-emerald-50/20' : 'bg-rose-50/20'
                      }`}
                    >
                      {/* Trans ID */}
                      <td className="px-3 py-2.5 border-r border-slate-100 font-mono font-bold text-[#002B66] whitespace-nowrap">
                        {transId}
                        <span className="block text-[9px] font-sans font-bold text-slate-400">
                          {subOffice !== 'All' ? subOffice : 'All Branches'}
                        </span>
                      </td>

                      {/* Teller / Outlet */}
                      <td className="px-3 py-2.5 border-r border-slate-100 font-bold text-slate-800 uppercase whitespace-nowrap max-w-[140px] truncate" title={teller}>
                        {teller}
                      </td>

                      {/* Draw & Bet Details */}
                      <td className="px-3 py-2.5 border-r border-slate-100 text-center font-mono whitespace-nowrap">
                        <div className="font-bold text-slate-900">{betNo} <span className="text-[10px] text-slate-500 font-medium">({betCode})</span></div>
                        <div className="text-[10px] text-slate-500">{formatDrawTime ? formatDrawTime(draw) : draw}</div>
                      </td>

                      {/* Win Amount */}
                      <td className="px-3 py-2.5 border-r border-slate-100 text-right font-mono font-black text-rose-700 whitespace-nowrap">
                        -₱{winAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="block text-[9px] text-slate-400 font-normal">
                          Bet: ₱{betAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Deposited Status */}
                      <td className="px-3 py-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                        {item.is_already_deposited ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[9.5px] px-2 py-0.5 rounded-full" title="Already deposited in previous collections">
                            <CheckCircle2 size={10} className="text-emerald-700" /> DEPOSITED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 font-semibold text-[9.5px] px-2 py-0.5 rounded-full" title="Not yet deposited in collections">
                            NOT DEPOSITED
                          </span>
                        )}
                      </td>

                      {/* Hard Copy Proof Photo */}
                      <td className="px-3 py-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                        {proofImg ? (
                          <button
                            type="button"
                            onClick={() => onViewTicket?.({ ...item, computedTransId: transId })}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-[10px] font-bold text-[#002B66] cursor-pointer transition-all shadow-2xs"
                            title="Click to zoom hard copy photo"
                          >
                            <ImageIcon size={12} className="text-blue-600" />
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No Photo</span>
                        )}
                      </td>

                      {/* Requester */}
                      <td className="px-3 py-2.5 border-r border-slate-100 whitespace-nowrap" title={reason ? `Reason: ${reason}` : undefined}>
                        <span className="font-bold text-xs text-[#002B66] block">@{requester}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{formatTimestamp(reqDate)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] px-2 py-0.5 rounded-full">
                            <Clock size={10} className="text-amber-700 animate-spin" /> PENDING APPROVAL
                          </span>
                        ) : isApproved ? (
                          <div>
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px] px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} className="text-emerald-700" /> APPROVED
                            </span>
                            {item.reviewed_by && (
                              <span className="block text-[8px] text-slate-400 font-medium mt-0.5">By @{item.reviewed_by}</span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 font-black text-[10px] px-2 py-0.5 rounded-full">
                              <Ban size={10} className="text-rose-700" /> REJECTED
                            </span>
                            {item.reject_reason && (
                              <span className="block text-[8px] text-rose-600 font-medium mt-0.5 max-w-[120px] truncate" title={item.reject_reason}>
                                {item.reject_reason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {isPending && canApprove ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onApprove?.(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-black uppercase cursor-pointer transition-all shadow-xs"
                                title="Approve deletion and deduct from collections"
                              >
                                <Check size={11} /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => onReject?.(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[10px] font-black uppercase cursor-pointer transition-all shadow-2xs"
                                title="Reject deletion request"
                              >
                                <X size={11} /> Reject
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onViewTicket?.({ ...item, computedTransId: transId })}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                            >
                              <Eye size={11} /> Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-slate-400 font-medium text-xs">
                    No deletion requests match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="block md:hidden space-y-2.5">
        {filteredItems.length > 0 ? (
          filteredItems.map((item, idx) => {
            const transId = item.transaction_id || item.transactionId || item.transId || `REC-${idx + 1}`;
            const teller = item.teller_outlet || item.fullName || item.outlet || 'N/A';
            const winAmt = parseFloat(item.win_amount || item.winAmount || 0);
            const betNo = item.bet_no || item.betNo || 'N/A';
            const betCode = item.bet_code || item.betCode || 'RS3';
            const draw = item.draw_time || item.drawTime || item.drawDate || item.draw || 'N/A';
            const st = item.status || 'PENDING_APPROVAL';
            const isPending = st === 'PENDING_APPROVAL' || st === 'PENDING';
            const isApproved = st === 'APPROVED';
            const reason = item.reason || item.deletion_request_reason || 'Claimed ticket deletion';
            const requester = item.requested_by || item.deletion_request_by || item.username || 'SSR';
            const reqDate = item.requested_at || item.created_at;
            const proofImg = item.attachment_url || item.deletion_request_attachment || item.hard_copy_ticket_url || item.ocr_data?.hard_copy_image;

            return (
              <div
                key={item.id || transId || idx}
                className={`bg-white border rounded-xl p-3 space-y-2 shadow-2xs relative ${
                  isPending ? 'border-amber-300 bg-amber-50/30' : isApproved ? 'border-emerald-300' : 'border-rose-300'
                }`}
              >
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Teller / Outlet</span>
                    <span className="text-xs font-bold text-slate-800 uppercase">{teller}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-[#002B66]">{transId}</span>
                    <span className="block font-mono text-xs font-black text-rose-700">-₱{winAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                  <div>
                    <span>{betNo} ({betCode})</span> • <span>{formatDrawTime ? formatDrawTime(draw) : draw}</span>
                  </div>
                  {item.is_already_deposited ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[8.5px] px-1.5 py-0.2 rounded-full">
                      DEPOSITED
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 border border-slate-200 font-semibold text-[8.5px] px-1.5 py-0.2 rounded-full">
                      NOT DEPOSITED
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-slate-500" title={reason ? `Reason: ${reason}` : undefined}>
                  <span className="font-bold text-[#002B66]">Requested by @{requester}</span>
                  <span className="text-slate-400 ml-1.5">• {formatTimestamp(reqDate)}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-black text-[9px] px-2 py-0.5 rounded-full">
                        <Clock size={9} /> PENDING APPROVAL
                      </span>
                    ) : isApproved ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[9px] px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={9} /> APPROVED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 font-black text-[9px] px-2 py-0.5 rounded-full">
                        <Ban size={9} /> REJECTED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPending && canApprove && (
                      <>
                        <button
                          type="button"
                          onClick={() => onApprove?.(item)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject?.(item)}
                          className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onViewTicket?.({ ...item, computedTransId: transId })}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-bold"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
            No deletion requests found.
          </div>
        )}
      </div>
    </div>
  );
}
