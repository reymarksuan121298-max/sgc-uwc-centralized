import { useState, useMemo, Fragment } from 'react';
import {
  UserCheck, CheckCircle, Trash2, Clock, AlertTriangle, X, Download,
  UploadCloud, Calendar, CheckCircle2,
  ChevronRight, Building2, Smartphone, Landmark, Image as ImageIcon, Loader2,
  ArrowRight, ShieldCheck, Filter, Search, Sparkles, QrCode, FileText,
  FileCheck, ShieldAlert, Check, Ban
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { winningsService } from '../../services/winningsService';
import AttachWeeklyProofModal from '../../components/receipts/AttachWeeklyProofModal';
import RequestDeleteModal from '../../components/winnings/RequestDeleteModal';
import ConfirmPopover from '../../components/common/ConfirmPopover';
import { superClean, getTicketTransId, generateRemittanceSerial } from '../../utils/formatters';
import { isAdminRole, isSuperAdminRole, canApproveDeletionRequests } from '../../utils/permissions';

export default function ReturnedWinnings({
  groupedData = {},
  filteredData = [],
  formatDrawTime,
  currentUser,
  onDeleteRecord,
  onDataUpdated,
  onOpenQrModal,
  onNavigateToSettlement
}) {
  const [selectedForDelete, setSelectedForDelete] = useState(null);
  const [selectedForRequestDelete, setSelectedForRequestDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('ALL'); // 'ALL' | 'UNREMITTED' | 'REQUESTS'
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Reject & Approve Popover State
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingItem, setApprovingItem] = useState(null);
  const [isProcessingAdminAction, setIsProcessingAdminAction] = useState(false);

  // Admin / Staff Approval Permission (SSR can request, Staff/Admin can approve)
  const isAdmin = isAdminRole(currentUser?.role) || isSuperAdminRole(currentUser?.role);
  const canApprove = canApproveDeletionRequests(currentUser?.role) || isAdmin;

  const checkIsExplicitlyClaimed = (item) => {
    return [
      item.isClaime,
      item.isClaim,
      item.is_claime,
      item.is_claimed,
      item.isClaimed
    ].some(v => v === 1 || v === '1' || v === true || v === 'true');
  };

  // Pending Deletion Requests
  const pendingDeletionRequests = useMemo(() => {
    return (filteredData || []).filter(item => item.deletion_request_status === 'PENDING_ADMIN_APPROVAL');
  }, [filteredData]);

  // Unremitted items available strictly for weekly remittance deposit (excluding under settlement)
  const unremittedDepositItems = useMemo(() => {
    return (filteredData || []).filter(item => (!item.receipt_status || item.receipt_status === 'NO_RECEIPT') && !item.isUnderSettlement);
  }, [filteredData]);

  // Filtered display items based on activeFilterTab & searchQuery
  const displayItems = useMemo(() => {
    let list = filteredData || [];

    if (activeFilterTab === 'UNREMITTED') {
      list = unremittedDepositItems;
    } else if (activeFilterTab === 'REQUESTS') {
      list = pendingDeletionRequests;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => {
        const transId = getTicketTransId(item).toLowerCase();
        const username = String(item.username || '').toLowerCase();
        const claimant = String(item.fullName || item.outlet || '').toLowerCase();
        const betNo = String(item.betNo || '').toLowerCase();
        return transId.includes(q) || username.includes(q) || claimant.includes(q) || betNo.includes(q);
      });
    }

    return list;
  }, [filteredData, activeFilterTab, unremittedDepositItems, pendingDeletionRequests, searchQuery]);

  // Grouped active items by Username for table rendering
  const activeGroupedData = useMemo(() => {
    if (!displayItems.length) return {};
    return displayItems.reduce((acc, item) => {
      const userKey = (item.username || 'UNASSIGNED-USER').trim().toUpperCase();
      (acc[userKey] = acc[userKey] || []).push(item);
      return acc;
    }, {});
  }, [displayItems]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const formatTimestamp = (timestampStr) => {
    if (!timestampStr) return 'N/A';
    try {
      const d = new Date(timestampStr);
      if (isNaN(d.getTime())) return timestampStr;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timestampStr;
    }
  };

  const confirmAndDelete = async () => {
    if (!selectedForDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteRecord) await onDeleteRecord(selectedForDelete);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
      setSelectedForDelete(null);
    }
  };

  // Admin / Staff Action: Trigger Popover to Approve Deletion
  const handleApproveDeletion = (item) => {
    setApprovingItem(item);
  };

  const executeApproveDeletion = async () => {
    if (!approvingItem) return;
    const transId = approvingItem.computedTransId || approvingItem.transactionId || approvingItem.transId || 'N/A';
    const winAmt = parseFloat(approvingItem.winAmount ?? 0);

    setIsProcessingAdminAction(true);
    try {
      await winningsService.approveDeletionAndDeductCollections(approvingItem, currentUser);
      showToast(`Transaction ${transId} approved! Deducted ₱${winAmt.toLocaleString()} from Collections.`);
      setApprovingItem(null);
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      console.error('Approve deletion failed:', err);
      showToast(`Failed to approve deletion: ${err.message}`);
    } finally {
      setIsProcessingAdminAction(false);
    }
  };

  // Admin Action: Reject Deletion Request
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    setIsProcessingAdminAction(true);
    try {
      await winningsService.rejectDeletionRequest(rejectingItem, rejectReason, currentUser);
      showToast(`Deletion request for ${rejectingItem.transactionId || rejectingItem.computedTransId} rejected.`);
      setRejectingItem(null);
      setRejectReason('');
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      console.error('Reject deletion failed:', err);
      alert(`Failed to reject request: ${err.message}`);
    } finally {
      setIsProcessingAdminAction(false);
    }
  };

  const exportToCSV = () => {
    if (!displayItems.length) return alert("No records available to export.");
    const headers = ["Username", "Teller / Outlet", "Transaction ID", "Draw Time", "Bet No", "Bet Code", "Bet Amount", "Win Amount", "Date Returned", "Remittance Status", "Deletion Request Status"];
    const rows = displayItems.map(item => {
      const transId = item.transactionId || 'N/A';
      return [
        `"${item.username || 'N/A'}"`,
        `"${item.fullName || item.outlet || 'N/A'}"`,
        `"${transId}"`,
        `"${formatDrawTime ? formatDrawTime(item.drawTime || item.drawDate || item.created_at || 'N/A') : 'N/A'}"`,
        `"${item.betNo || 'N/A'}"`,
        `"${item.betCode || 'RS3'}"`,
        parseFloat(item.betAmount ?? 0).toFixed(2),
        parseFloat(item.winAmount ?? 0).toFixed(2),
        `"${formatTimestamp(item.updated_at || item.created_at)}"`,
        `"${item.receipt_status || 'NO_RECEIPT'}"`,
        `"${item.deletion_request_status || 'NONE'}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Returned_Winnings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const unremittedTotalTickets = unremittedDepositItems;
  const unremittedTotalWin = unremittedDepositItems.reduce((sum, item) => sum + parseFloat(item.winAmount ?? 0), 0);
  const totalReturnedWin = useMemo(() => {
    return (filteredData || []).reduce((sum, item) => sum + parseFloat(item.winAmount ?? 0), 0);
  }, [filteredData]);

  const displayTotalWin = useMemo(() => {
    return (displayItems || []).reduce((sum, item) => sum + parseFloat(item.winAmount ?? 0), 0);
  }, [displayItems]);

  const displayTotalBet = useMemo(() => {
    return (displayItems || []).reduce((sum, item) => sum + parseFloat(item.betAmount ?? 0), 0);
  }, [displayItems]);

  // Compute clean Remittance Serial Number dynamically from active unremitted tickets (e.g. MAN-260901-892301)
  const batchSerialNumber = useMemo(() => {
    const subOffice = currentUser?.sub_office && currentUser.sub_office !== 'All'
      ? currentUser.sub_office
      : (unremittedDepositItems[0]?.sub_office || filteredData[0]?.sub_office || 'Mandaue Central');

    if (unremittedDepositItems.length > 0) {
      const firstTicket = unremittedDepositItems[0];
      const transId = firstTicket.transactionId || firstTicket.transId || firstTicket.receipt_no;
      return generateRemittanceSerial(subOffice, transId);
    }

    return generateRemittanceSerial(subOffice, '892301');
  }, [unremittedDepositItems, filteredData, currentUser]);

  return (
    <div className="w-full space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#002B66] border border-[#FFD700] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 text-xs font-bold">
          <CheckCircle2 size={16} className="text-[#FFD700] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER & FILTER BAR (With Top Navy Accent) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 border-t-4 border-t-[#002B66] shadow-xs flex flex-wrap items-center justify-between gap-3 sm:gap-4">

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilterTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeFilterTab === 'ALL'
                ? 'bg-[#002B66] text-[#FFD700] shadow-sm'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              }`}
          >
            All Returned ({filteredData.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('UNREMITTED')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeFilterTab === 'UNREMITTED'
                ? 'bg-[#002B66] text-[#FFD700] shadow-sm'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              }`}
          >
            Unremitted ({unremittedTotalTickets.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('REQUESTS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeFilterTab === 'REQUESTS'
                ? 'bg-amber-600 text-white shadow-sm'
                : pendingDeletionRequests.length > 0
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black animate-pulse'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              }`}
          >
            <AlertTriangle size={14} className={pendingDeletionRequests.length > 0 ? 'text-amber-700' : ''} />
            <span>{canApprove ? 'Approve Requests' : 'Deletion Requests'} ({pendingDeletionRequests.length})</span>
          </button>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {!isAdmin && unremittedTotalTickets.length > 0 && (
            <button
              onClick={() => setIsWeeklyModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#FFD700] hover:bg-amber-400 text-[#002B66] px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer animate-pulse shrink-0"
            >
              <UploadCloud size={16} />
              <span>Attach Remittance Proof</span>
            </button>
          )}

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search returned ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50/80 border border-slate-200/90 pl-10 pr-3.5 py-2 text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#002B66]/20 focus:border-[#002B66] font-medium w-48 sm:w-64 transition-all"
            />
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-[#002B66] px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 border border-slate-200/80"
            title="Download CSV"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* PENDING DELETION REQUESTS BANNER FOR STAFF & ADMIN */}
      {canApprove && pendingDeletionRequests.length > 0 && activeFilterTab !== 'REQUESTS' && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-l-4 border-l-amber-500 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-amber-700 shrink-0" />
            <div>
              <span className="font-black text-amber-900 uppercase">Attention Staff & Management:</span>
              <p className="text-slate-700 font-medium mt-0.5">
                There are <strong className="text-amber-900 font-bold">{pendingDeletionRequests.length} pending deletion request(s)</strong> awaiting your review and approval.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveFilterTab('REQUESTS')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] rounded-lg shadow-xs cursor-pointer shrink-0"
          >
            Approve Requests →
          </button>
        </div>
      )}

      {/* ACTIVE APPROVAL DESK HEADER */}
      {canApprove && activeFilterTab === 'REQUESTS' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-black text-amber-900 uppercase tracking-wider">
            <ShieldCheck size={18} className="text-amber-700" />
            <span>Approval Desk • {pendingDeletionRequests.length} Pending Deletion Requests</span>
          </div>
          <span className="text-[11px] text-amber-800 font-bold">
            Approve to permanently remove the ticket and deduct the amount from Collections.
          </span>
        </div>
      )}

      {/* MAIN DATA TABLE CONTAINER */}
      <div className="bg-white border border-slate-300 shadow-xs overflow-hidden w-full rounded-xl">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-[#002B66]/5 flex-wrap gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <h3 className="font-extrabold text-[#002B66] text-xs uppercase tracking-wider truncate">
              Returned Winnings Summary
            </h3>
            <span className="text-[10px] font-bold bg-[#002B66] text-[#FFD700] px-2 py-0.5 rounded font-mono shadow-2xs shrink-0 flex items-center gap-1">
              <span className="text-[9px] text-[#FFD700]/75 uppercase">SRN</span>
              <span>{batchSerialNumber}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 px-2.5 py-1 rounded-md font-mono shadow-2xs shrink-0 flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold text-emerald-600 uppercase">Total Win:</span>
              <span className="font-black text-emerald-700">₱{displayTotalWin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </span>
            <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-1 rounded-md border border-slate-200 font-mono shadow-2xs shrink-0">
              {displayItems.length} Record{displayItems.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* DESKTOP VIEW: Table format */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#003366] text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-300">
                {['Teller / Outlet', 'Trans. ID / SRN', 'Draw', 'Bet No.', 'Bet Code', 'Bet Amount', 'Win Amount', 'Date Returned', 'Status', 'Action'].map((h, i) => (
                  <th key={h} className={`px-3 py-2.5 border-r border-blue-900 whitespace-nowrap ${i >= 2 && i <= 4 || i >= 8 ? 'text-center' : i >= 5 && i <= 6 ? 'text-right' : i === 7 ? 'text-center' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
              {Object.keys(activeGroupedData).length > 0 ? (
                Object.entries(activeGroupedData).map(([username, items]) => {
                  const unremittedInGroup = items.filter(i => (!i.receipt_status || i.receipt_status === 'NO_RECEIPT') && !i.isUnderSettlement);
                  const subtotalBet = unremittedInGroup.reduce((sum, i) => sum + parseFloat(i.betAmount ?? 0), 0);
                  const subtotalWin = unremittedInGroup.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);

                  return (
                    <Fragment key={username}>
                      <tr className="bg-slate-200/80 border-y border-slate-300">
                        <td colSpan="10" className="px-3 py-2 font-bold text-[#003366] text-xs uppercase tracking-wider">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <UserCheck size={14} className="text-emerald-600 shrink-0" />
                              <span>USER / ACCOUNT: @{username}</span>
                            </div>
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-300">
                              {items.length} records ({unremittedInGroup.length} unremitted) • Subtotal: ₱{subtotalWin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {items.map((item, i) => {
                        const transId = item.transactionId || `REC-${i + 1}`;
                        const isClaimedInSourceSystem = checkIsExplicitlyClaimed(item);
                        const isUnderSettlement = Boolean(item.isUnderSettlement);
                        const recordTimestamp = item.updated_at || item.created_at;
                        const isRemitted = Boolean(item.receipt_status && item.receipt_status !== 'NO_RECEIPT');
                        const isDeletionPending = item.deletion_request_status === 'PENDING_ADMIN_APPROVAL';

                        return (
                          <tr key={item.id || item.transactionId || transId || i} className={`transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-slate-100/80 ${isDeletionPending ? 'bg-amber-50/60 border-l-4 border-l-amber-500' : ''}`}>
                            <td className="px-3 py-2 border-r border-slate-200 font-semibold text-slate-800 uppercase whitespace-nowrap">{item.fullName || item.outlet || 'N/A'}</td>
                            <td className="px-3 py-2 border-r border-slate-200 font-mono text-[#003366] font-semibold whitespace-nowrap">{transId}</td>
                            <td className="px-3 py-2 border-r border-slate-200 text-center font-mono text-[11px] whitespace-nowrap">{formatDrawTime ? formatDrawTime(item.drawTime || item.drawDate || item.created_at || 'N/A') : 'N/A'}</td>
                            <td className="px-3 py-2 border-r border-slate-200 text-center font-mono font-bold text-slate-800 whitespace-nowrap">{item.betNo || 'N/A'}</td>
                            <td className="px-3 py-2 border-r border-slate-200 text-center font-mono text-slate-600 whitespace-nowrap">{item.betCode || 'RS3'}</td>
                            <td className="px-3 py-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900 whitespace-nowrap">₱{parseFloat(item.betAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">₱{parseFloat(item.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                            <td className="px-3 py-2 border-r border-slate-200 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap">
                              {formatTimestamp(recordTimestamp)}
                            </td>

                            <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                              {isDeletionPending ? (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] px-2 py-0.5 rounded-full" title={`Requested by: ${item.deletion_request_by || 'Staff'} • Reason: ${item.deletion_request_reason || 'Hard copy receipt claimed'}`}>
                                  <Clock size={10} className="text-amber-700 animate-spin" /> PENDING ADMIN APPROVAL
                                </span>
                              ) : isRemitted ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded-full border border-emerald-300">
                                  <CheckCircle2 size={10} /> IN COLLECTIONS
                                </span>
                              ) : isUnderSettlement ? (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-amber-300">
                                  <Clock size={10} /> UNDER SETTLEMENT
                                </span>
                              ) : isClaimedInSourceSystem ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-emerald-300">
                                  <CheckCircle size={10} /> ALREADY CLAIMED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-blue-300">
                                  <Clock size={10} /> RETURNED (UNREMITTED)
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                {isDeletionPending ? (
                                  canApprove ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleApproveDeletion(item)}
                                        disabled={isProcessingAdminAction}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                        title="Approve claim and deduct from collections"
                                      >
                                        <Check size={11} /> Approve & Deduct
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRejectingItem(item)}
                                        disabled={isProcessingAdminAction}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-rose-700 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-md transition-all cursor-pointer"
                                        title="Reject deletion request"
                                      >
                                        <Ban size={11} /> Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-amber-700 font-bold italic">
                                      Pending Approval
                                    </span>
                                  )
                                ) : isClaimedInSourceSystem && !isUnderSettlement ? (
                                  canApprove ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedForDelete({ ...item, computedTransId: transId })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 hover:border-rose-600 rounded-xs transition-all cursor-pointer"
                                    >
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedForRequestDelete({ ...item, computedTransId: transId })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 hover:border-rose-600 rounded-xs transition-all cursor-pointer"
                                      title={isRemitted ? "Request admin/staff to delete and deduct from Collections" : "Request deletion of this ticket"}
                                    >
                                      <Trash2 size={12} /> Request Delete
                                    </button>
                                  )
                                ) : isRemitted ? (
                                  <span className="text-[10px] text-emerald-700 font-bold">Proof Attached</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })
              ) : (
                <tr><td colSpan="10" className="px-3 py-12 text-center text-slate-500 font-semibold uppercase text-xs">No matching returned tickets found in this view.</td></tr>
              )}
            </tbody>
            {displayItems.length > 0 && (
              <tfoot className="bg-[#002B66]/5 border-t-2 border-slate-300 font-mono text-[11px] font-bold">
                <tr>
                  <td colSpan={5} className="px-3.5 py-2.5 text-right text-slate-700 uppercase font-black font-sans border-r border-slate-200">
                    Total ({displayItems.length} Record{displayItems.length === 1 ? '' : 's'}):
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-slate-800 border-r border-slate-200">
                    ₱{displayTotalBet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-emerald-700 border-r border-slate-200 text-xs">
                    ₱{displayTotalWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="px-3.5 py-2.5 text-slate-500 font-sans text-[10px]">
                    Total Returned Win Liability
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* MOBILE VIEW: Card Stack format */}
        <div className="block md:hidden p-3 space-y-3 bg-slate-50">
          {displayItems.length > 0 && (
            <div className="bg-white border border-emerald-200 p-3 rounded-xl shadow-2xs flex items-center justify-between font-mono">
              <span className="text-xs font-bold text-slate-500 uppercase font-sans">Total Win Amount:</span>
              <span className="text-sm font-black text-emerald-700">₱{displayTotalWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {Object.keys(activeGroupedData).length > 0 ? (
            Object.entries(activeGroupedData).map(([username, items]) => {
              const unremittedInGroup = items.filter(i => (!i.receipt_status || i.receipt_status === 'NO_RECEIPT') && !i.isUnderSettlement);

              return (
                <div key={username} className="space-y-2">
                  <div className="bg-slate-200 border border-slate-300 px-3 py-2 rounded-lg flex items-center justify-between text-xs font-bold text-[#003366] uppercase">
                    <div className="flex items-center gap-1.5 truncate">
                      <UserCheck size={14} className="text-emerald-600 shrink-0" />
                      <span className="truncate">@{username}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-300 shrink-0">
                      {items.length} items
                    </span>
                  </div>

                  {items.map((item, i) => {
                    const transId = item.transactionId || `REC-${i + 1}`;
                    const isClaimedInSourceSystem = checkIsExplicitlyClaimed(item);
                    const isUnderSettlement = Boolean(item.isUnderSettlement);
                    const recordTimestamp = item.updated_at || item.created_at;
                    const isRemitted = Boolean(item.receipt_status && item.receipt_status !== 'NO_RECEIPT');
                    const isDeletionPending = item.deletion_request_status === 'PENDING_ADMIN_APPROVAL';

                    return (
                      <div key={item.id || item.transactionId || transId || i} className={`bg-white border rounded-xl p-3 space-y-2.5 shadow-2xs relative ${isDeletionPending ? 'border-amber-400 bg-amber-50/40' : 'border-slate-300'}`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${isDeletionPending ? 'bg-amber-500' : isRemitted ? 'bg-emerald-600' : 'bg-[#003366]'}`}></div>

                        <div className="flex justify-between items-start gap-2 pl-2 border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Teller / Outlet</span>
                            <span className="text-xs font-bold text-slate-800 uppercase">{item.fullName || item.outlet || 'N/A'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Trans. ID</span>
                            <span className="font-mono text-xs font-bold text-[#002B66]">{transId}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pl-2 font-mono">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Draw Schedule</span>
                            <span className="text-[11px] text-slate-700 font-semibold">{formatDrawTime ? formatDrawTime(item.drawTime || item.drawDate || item.created_at || 'N/A') : 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Bet & Code</span>
                            <span className="font-bold text-slate-900">{item.betNo || 'N/A'} <span className="text-slate-500 font-normal">({item.betCode || 'RS3'})</span></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pl-2 pt-1 font-mono border-t border-slate-100 text-xs">
                          <div>
                            <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Bet Amount</span>
                            <span className="font-bold text-slate-800">₱{parseFloat(item.betAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Win Liability</span>
                            <span className="font-extrabold text-emerald-700">₱{parseFloat(item.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pl-2 pt-2 border-t border-slate-100 text-[10px]">
                          <div>
                            <span className="text-slate-400 font-bold block uppercase text-[9px]">Date Returned</span>
                            <span className="font-mono text-slate-600">{formatTimestamp(recordTimestamp)}</span>
                          </div>
                          <div>
                            {isDeletionPending ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-black text-[9px] px-2 py-0.5 rounded-full border border-amber-300">
                                <Clock size={9} className="text-amber-700" /> PENDING ADMIN
                              </span>
                            ) : isRemitted ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full border border-emerald-300">
                                <CheckCircle2 size={9} /> IN COLLECTIONS
                              </span>
                            ) : isUnderSettlement ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold text-[9px] px-2 py-0.5 rounded-full border border-amber-300">
                                <Clock size={9} /> SETTLEMENT
                              </span>
                            ) : isClaimedInSourceSystem ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full border border-emerald-300">
                                <CheckCircle size={9} /> CLAIMED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold text-[9px] px-2 py-0.5 rounded-full border border-blue-300">
                                <Clock size={9} /> UNREMITTED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mobile Actions */}
                        <div className="pl-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                          {isDeletionPending ? (
                            canApprove ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveDeletion(item)}
                                  disabled={isProcessingAdminAction}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-black uppercase text-[10px] shadow-xs"
                                >
                                  Approve & Deduct
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectingItem(item)}
                                  disabled={isProcessingAdminAction}
                                  className="px-2.5 py-1 text-rose-700 bg-rose-50 border border-rose-300 rounded-lg font-bold uppercase text-[10px]"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-amber-700 font-bold italic">
                                Awaiting Approval
                              </span>
                            )
                          ) : isClaimedInSourceSystem && !isUnderSettlement ? (
                            canApprove ? (
                              <button
                                type="button"
                                onClick={() => setSelectedForDelete({ ...item, computedTransId: transId })}
                                className="px-2.5 py-1 text-rose-600 border border-rose-300 rounded-lg text-[10px] font-bold uppercase"
                              >
                                Delete
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedForRequestDelete({ ...item, computedTransId: transId })}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-300 rounded-lg text-[10px] font-bold uppercase"
                              >
                                Request Delete
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 font-semibold uppercase text-xs">No matching returned tickets found.</div>
          )}
        </div>
      </div>

      {/* ATTACH WEEKLY REMITTANCE PROOF MODAL */}
      <AttachWeeklyProofModal
        isOpen={isWeeklyModalOpen}
        onClose={() => setIsWeeklyModalOpen(false)}
        batchSerialNumber={batchSerialNumber}
        filteredData={filteredData}
        currentUser={currentUser}
        formatDrawTime={formatDrawTime}
        formatTimestamp={formatTimestamp}
        onSuccess={(count) => {
          showToast(`Proof attached! ${count} records moved to Collections & Commissions.`);
          onDataUpdated && onDataUpdated();
        }}
      />

      {/* STAFF REQUEST DELETION MODAL */}
      <RequestDeleteModal
        isOpen={Boolean(selectedForRequestDelete)}
        onClose={() => setSelectedForRequestDelete(null)}
        ticket={selectedForRequestDelete}
        currentUser={currentUser}
        onSuccess={(tId) => {
          showToast(`Deletion request for ${tId} submitted to Admin!`);
          if (onDataUpdated) onDataUpdated();
        }}
      />

      {/* ADMIN REJECT REASON MODAL */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="bg-rose-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs">
                <Ban size={16} />
                <span>Reject Deletion Request</span>
              </div>
              <button onClick={() => setRejectingItem(null)} className="text-rose-100 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-700">
                Are you sure you want to reject the deletion request for transaction <strong className="font-mono text-rose-900">{rejectingItem.transactionId || rejectingItem.computedTransId}</strong>?
              </p>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Rejection Reason / Notes
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Hard copy receipt was unreadable or duplicate..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs outline-none focus:border-rose-600"
                />
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                disabled={isProcessingAdminAction}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessingAdminAction}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[11px] shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessingAdminAction ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                <span>Reject Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE DELETION CONFIRM POPOVER */}
      <ConfirmPopover
        isOpen={Boolean(approvingItem)}
        title="Approve Deletion & Deduct"
        type="success"
        confirmText="Approve & Deduct"
        isLoading={isProcessingAdminAction}
        onCancel={() => setApprovingItem(null)}
        onConfirm={executeApproveDeletion}
      >
        {approvingItem && (
          <div className="space-y-3">
            <p className="text-slate-700">
              Are you sure you want to <strong>APPROVE</strong> this deletion request?
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                <span className="text-slate-500 font-sans font-bold">Transaction ID:</span>
                <span className="font-black text-[#002B66]">{approvingItem.computedTransId || approvingItem.transactionId}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                <span className="text-slate-500 font-sans font-bold">Requested By:</span>
                <span className="font-bold text-slate-800">{approvingItem.deletion_request_by || 'SSR'}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 font-sans font-bold">Deduct from Collections:</span>
                <span className="font-extrabold text-emerald-800 text-sm">
                  ₱{parseFloat(approvingItem.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              This record will be permanently deleted from the database and the winning amount will be deducted immediately from total collections.
            </p>
          </div>
        )}
      </ConfirmPopover>

      {/* DIRECT DELETE CONFIRMATION MODAL */}
      {selectedForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-rose-600 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-rose-600 text-white px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs">
                <AlertTriangle size={16} className="text-amber-300" />
                <span>Confirm Deletion</span>
              </div>
              <button onClick={() => setSelectedForDelete(null)} disabled={isDeleting} className="text-rose-100 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700">Are you sure you want to delete this transaction from the <strong>Supabase Database Ledger</strong>?</p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between border-b border-rose-200 pb-1.5"><span className="text-slate-500 font-sans font-bold">Trans ID / SRN:</span><span className="font-bold text-rose-900">{selectedForDelete.computedTransId}</span></div>
                <div className="flex justify-between border-b border-rose-200 pb-1.5"><span className="text-slate-500 font-sans font-bold">Claimant / Teller:</span><span className="font-bold text-slate-800">{selectedForDelete.username || 'N/A'}</span></div>
                <div className="flex justify-between items-center pt-0.5"><span className="text-slate-500 font-sans font-bold">Win Amount:</span><span className="font-extrabold text-emerald-700 text-sm">₱{parseFloat(selectedForDelete.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setSelectedForDelete(null)} disabled={isDeleting} className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer uppercase text-[11px]">Cancel</button>
              <button onClick={confirmAndDelete} disabled={isDeleting} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black cursor-pointer uppercase text-[11px] flex items-center gap-1.5 disabled:opacity-50">
                <Trash2 size={13} />
                <span>{isDeleting ? 'Deleting...' : 'Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
