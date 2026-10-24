import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  UserCheck, CheckCircle, Trash2, Clock, AlertTriangle, X, Download,
  UploadCloud, Calendar, CheckCircle2,
  ChevronRight, Building2, Smartphone, Landmark, Image as ImageIcon, Loader2,
  ArrowRight, ShieldCheck, Filter, Search, Sparkles, QrCode, FileText,
  FileCheck, ShieldAlert, Check, Ban, Eye, Mail, Copy, ExternalLink, RefreshCw
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { winningsService } from '../../services/winningsService';
import AttachWeeklyProofModal from '../../components/receipts/AttachWeeklyProofModal';
import RequestDeleteModal from '../../components/winnings/RequestDeleteModal';
import ViewHardCopyTicketModal from '../../components/winnings/ViewHardCopyTicketModal';
import ConfirmPopover from '../../components/common/ConfirmPopover';
import SettlementDetailsModal from '../../components/winnings/SettlementDetailsModal';
import DeletionRequestsTable from '../../components/winnings/DeletionRequestsTable';
import ModernDropdown from '../../components/common/ModernDropdown';
import { superClean, getTicketTransId, generateRemittanceSerial, isEligibleForRemittanceProof, isInactiveTellerRecord, isPendingDeletionRecord } from '../../utils/formatters';
import { isAdminRole, isSuperAdminRole, canApproveDeletionRequests, isSSRRole, isUnclaimedSpecialistRole } from '../../utils/permissions';

import { DEFAULT_SUPERVISOR_NAMES } from '../../services/supervisorService';

const SUPERVISOR_NAMES = DEFAULT_SUPERVISOR_NAMES;

export default function ReturnedWinnings({
  groupedData = {},
  filteredData = [],
  formatDrawTime,
  currentUser,
  onDeleteRecord,
  onDataUpdated,
  onNavigateToSettlement,
  onSyncClaimedTickets,
  liveClaimedTransactionIds = new Set()
}) {
  const [selectedForDelete, setSelectedForDelete] = useState(null);
  const [selectedForRequestDelete, setSelectedForRequestDelete] = useState(null);
  const [selectedViewingTicket, setSelectedViewingTicket] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('ALL'); // 'ALL' | 'UNREMITTED' | 'REQUESTS' | 'INACTIVE'
  const [selectedSettlementItem, setSelectedSettlementItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Dedicated Deletion Requests Table State
  const [dedicatedDeletionRequests, setDedicatedDeletionRequests] = useState([]);
  const [isLoadingDeletionRequests, setIsLoadingDeletionRequests] = useState(false);

  // Reject & Approve Popover State
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingItem, setApprovingItem] = useState(null);
  const [isProcessingAdminAction, setIsProcessingAdminAction] = useState(false);



  // Admin / Staff Approval Permission (SSR can request, Staff/Admin can approve)
  const isAdmin = isAdminRole(currentUser?.role) || isSuperAdminRole(currentUser?.role);
  const isSSR = isSSRRole(currentUser?.role);
  const isUnclaimedSpecialist = isUnclaimedSpecialistRole(currentUser?.role);
  const canFilterSubOffice = isAdmin || isUnclaimedSpecialist;
  const canApprove = canApproveDeletionRequests(currentUser?.role) || isAdmin;

  // Sub-Office Filter State (Unclaimed Specialist & Admin only)
  const [dbSubOffices, setDbSubOffices] = useState([]);
  const [selectedSubOfficeFilter, setSelectedSubOfficeFilter] = useState('ALL');

  // Load sub-offices from database with realtime sync
  useEffect(() => {
    if (!canFilterSubOffice) return;

    const fetchSubOffices = async () => {
      try {
        const { data, error } = await supabase
          .from('sub_offices')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data) {
          setDbSubOffices(data);
        }
      } catch (err) {
        console.warn("Failed to fetch sub-offices in ReturnedWinnings:", err);
      }
    };

    fetchSubOffices();

    const channel = supabase
      .channel('sub_offices_realtime_rw')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_offices' }, () => {
        fetchSubOffices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canFilterSubOffice]);

  const checkIsExplicitlyClaimed = (item) => {
    if (!item) return false;
    const tid = getTicketTransId(item);
    const rawTid = String(item.transactionId || item.transId || item.receipt_no || item.ticket_no || '').trim();
    
    // Check if Trans ID has isClaim=1 in the live source gateway API
    if (tid && (
      liveClaimedTransactionIds?.has?.(tid) || 
      liveClaimedTransactionIds?.has?.(tid.toUpperCase()) || 
      liveClaimedTransactionIds?.has?.(tid.toLowerCase()) ||
      liveClaimedTransactionIds?.has?.(rawTid) ||
      liveClaimedTransactionIds?.has?.(rawTid.toUpperCase()) ||
      liveClaimedTransactionIds?.has?.(rawTid.toLowerCase())
    )) {
      return true;
    }

    // Direct claim properties check on live or Supabase record
    return Boolean(
      item.isClaim == 1 ||
      item.isClaim === '1' ||
      item.isClaim === true ||
      item.isClaim === 'true' ||
      item.is_claim == 1 ||
      item.is_claim === '1' ||
      item.is_claim === true ||
      item.is_claim === 'true' ||
      item.isClaimed == 1 ||
      item.isClaimed === '1' ||
      item.isClaimed === true ||
      item.isClaimed === 'true' ||
      item.is_claimed == 1 ||
      item.is_claimed === '1' ||
      item.is_claimed === true ||
      item.is_claimed === 'true' ||
      (item.claimDate && String(item.claimDate).trim() !== '' && item.claimDate !== 'null') ||
      (item.claim_date && String(item.claim_date).trim() !== '' && item.claim_date !== 'null') ||
      (item.claimed_at && String(item.claimed_at).trim() !== '' && item.claimed_at !== 'null') ||
      (item.claimedAt && String(item.claimedAt).trim() !== '' && item.claimedAt !== 'null') ||
      parseFloat(item.paidAmount ?? item.paid_amount ?? 0) > 0 ||
      item.status === 'CLAIMED' ||
      item.claim_status === 'CLAIMED' ||
      item.is_already_claimed
    );
  };

  // Available Sub-Offices compiled from DB and live data records
  const availableSubOffices = useMemo(() => {
    const set = new Set();
    (dbSubOffices || []).forEach(so => {
      if (so.name && so.status !== 'INACTIVE') {
        set.add(so.name.trim());
      }
    });
    (filteredData || []).forEach(item => {
      const o = item.sub_office || item.location;
      if (o && o !== 'All') {
        set.add(o.trim());
      }
    });
    (dedicatedDeletionRequests || []).forEach(r => {
      const o = r.sub_office;
      if (o && o !== 'All') {
        set.add(o.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dbSubOffices, filteredData, dedicatedDeletionRequests]);

  // Filtered data scoped by sub-office for Admin / Unclaimed Specialist
  const scopedReturnedData = useMemo(() => {
    if (!canFilterSubOffice || !selectedSubOfficeFilter || selectedSubOfficeFilter === 'ALL') {
      return filteredData || [];
    }
    const targetOffice = selectedSubOfficeFilter.toLowerCase().trim();
    return (filteredData || []).filter(item => {
      const itemOffice = String(item.sub_office || item.location || 'Mandaue Central').toLowerCase().trim();
      return itemOffice === targetOffice || itemOffice.includes(targetOffice) || targetOffice.includes(itemOffice);
    });
  }, [filteredData, selectedSubOfficeFilter, canFilterSubOffice]);

  // Filtered deletion requests scoped by sub-office for Admin / Unclaimed Specialist
  const scopedDeletionRequests = useMemo(() => {
    if (!canFilterSubOffice || !selectedSubOfficeFilter || selectedSubOfficeFilter === 'ALL') {
      return dedicatedDeletionRequests || [];
    }
    const targetOffice = selectedSubOfficeFilter.toLowerCase().trim();
    return (dedicatedDeletionRequests || []).filter(r => {
      const rOffice = String(r.sub_office || 'Mandaue Central').toLowerCase().trim();
      return rOffice === targetOffice || rOffice.includes(targetOffice) || targetOffice.includes(rOffice);
    });
  }, [dedicatedDeletionRequests, selectedSubOfficeFilter, canFilterSubOffice]);

  // Sub-Office Dropdown Options with live badge counts
  const subOfficeDropdownOptions = useMemo(() => {
    const totalActive = (filteredData || []).filter(item => !isInactiveTellerRecord(item)).length;
    const options = [
      {
        value: 'ALL',
        label: `All Sub-Offices (${availableSubOffices.length})`,
        badge: totalActive
      }
    ];

    availableSubOffices.forEach(office => {
      const target = office.toLowerCase().trim();
      const count = (filteredData || []).filter(item => {
        if (isInactiveTellerRecord(item)) return false;
        const o = String(item.sub_office || item.location || 'Mandaue Central').toLowerCase().trim();
        return o === target || o.includes(target) || target.includes(o);
      }).length;

      options.push({
        value: office,
        label: office,
        badge: count
      });
    });

    return options;
  }, [availableSubOffices, filteredData]);

  // Pending Deletion Requests
  const pendingDeletionRequests = useMemo(() => {
    return (scopedReturnedData || []).filter(item => isPendingDeletionRecord(item));
  }, [scopedReturnedData]);

  // Dedicated Counts for Deletion Requests Tab
  const pendingRequestsCount = useMemo(() => {
    return (scopedDeletionRequests || []).filter(r => r.status === 'PENDING_APPROVAL' || r.status === 'PENDING').length;
  }, [scopedDeletionRequests]);

  const isInactiveTeller = (item) => isInactiveTellerRecord(item);

  // Unremitted items available strictly for weekly remittance deposit (excluding under settlement, inactive/AWOL/pullout, and pending deletion)
  const unremittedDepositItems = useMemo(() => {
    return (scopedReturnedData || []).filter(item => isEligibleForRemittanceProof(item));
  }, [scopedReturnedData]);

  // Inactive Teller items (Pull-out, AWOL, Terminated)
  const inactiveTellerItems = useMemo(() => {
    return (scopedReturnedData || []).filter(item => isInactiveTellerRecord(item));
  }, [scopedReturnedData]);

  // Fetch deletion requests from the dedicated table
  const loadDedicatedDeletionRequests = async () => {
    setIsLoadingDeletionRequests(true);
    try {
      const data = await winningsService.fetchDeletionRequests(currentUser?.sub_office);
      setDedicatedDeletionRequests(data || []);
    } catch (err) {
      console.warn("Failed to fetch dedicated deletion requests:", err);
    } finally {
      setIsLoadingDeletionRequests(false);
    }
  };

  useEffect(() => {
    loadDedicatedDeletionRequests();
  }, [currentUser?.sub_office]);

  // Realtime subscription to returned_winnings_deletion_requests
  useEffect(() => {
    const channel = supabase
      .channel('realtime_del_requests_rw')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returned_winnings_deletion_requests' }, () => {
        loadDedicatedDeletionRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Claimed deletion requests from dedicated table eligible to add as additions in remittance proof
  // STRICT RULE: If an approved claimed ticket has already been included in a remittance batch (deducted_from_collections === true), do NOT fetch or include it!
  const claimedDeletionAdjustmentItems = useMemo(() => {
    return (scopedDeletionRequests || [])
      .filter(r => {
        const isEligibleStatus = r.status === 'PENDING_APPROVAL' || r.status === 'APPROVED' || r.status === 'PENDING_ADMIN_APPROVAL' || r.status === 'PENDING';
        if (!isEligibleStatus) return false;
        // Strictly exclude tickets already added to a previous remittance batch
        if (r.deducted_from_collections) return false;
        return true;
      })
      .map(r => ({
        id: r.returned_winnings_id || r.id,
        transactionId: r.transaction_id,
        transId: r.transaction_id,
        sub_office: r.sub_office,
        fullName: r.teller_outlet,
        outlet: r.teller_outlet,
        username: r.requested_by,
        drawTime: r.draw_time,
        drawDate: r.draw_date,
        betNo: r.bet_no,
        betCode: r.bet_code,
        betAmount: r.bet_amount,
        winAmount: r.win_amount,
        deletion_request_reason: r.reason,
        deletion_request_status: r.status,
        status: r.status,
        is_already_deposited: Boolean(r.is_already_deposited),
        isClaim: Boolean(r.isClaim ?? r.is_claim ?? r.isClaimed ?? r.is_claimed ?? true),
        date_returned: r.requested_at || r.created_at,
        created_at: r.created_at
      }));
  }, [scopedDeletionRequests]);

  // Filtered display items based on activeFilterTab & searchQuery
  const displayItems = useMemo(() => {
    let list = (scopedReturnedData || []).filter(item => !isInactiveTellerRecord(item));

    if (activeFilterTab === 'UNREMITTED') {
      list = unremittedDepositItems;
    } else if (activeFilterTab === 'INACTIVE') {
      list = inactiveTellerItems;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => {
        const transId = getTicketTransId(item).toLowerCase();
        const betCode = String(item.betCode || '').toLowerCase();
        const username = String(item.username || '').toLowerCase();
        const supervisor = String(item.supervisor || '').toLowerCase();
        const claimant = String(item.fullName || item.outlet || '').toLowerCase();
        const betNo = String(item.betNo || '').toLowerCase();
        const action = String(item.action || '').toLowerCase();
        const reason = String(item.reason || '').toLowerCase();
        return transId.includes(q) || betCode.includes(q) || username.includes(q) || supervisor.includes(q) || claimant.includes(q) || betNo.includes(q) || action.includes(q) || reason.includes(q);
      });
    }

    return list;
  }, [scopedReturnedData, activeFilterTab, unremittedDepositItems, inactiveTellerItems, searchQuery]);

  // Grouped active items by Supervisor/Username for table rendering
  const activeGroupedData = useMemo(() => {
    if (!displayItems.length) return {};
    return displayItems.reduce((acc, item) => {
      const rawSpvr = (item.supervisor || '').trim();
      const rawUser = (item.username || '').trim();
      const isGenericUser = !rawUser || rawUser.toLowerCase().startsWith('ssr-');
      const isNumericSpvr = /^\d+$/.test(rawSpvr);
      const isNamedUser = rawUser && !isGenericUser;

      let keyToUse = rawSpvr || rawUser || 'UNASSIGNED-USER';
      if (isNumericSpvr && isNamedUser) {
        keyToUse = rawUser;
      } else if (isGenericUser && rawSpvr) {
        keyToUse = rawSpvr;
      }
      const userKey = keyToUse.toUpperCase();
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
    const transId = approvingItem.computedTransId || approvingItem.transaction_id || approvingItem.transactionId || approvingItem.transId || 'N/A';
    const winAmt = parseFloat(approvingItem.win_amount ?? approvingItem.winAmount ?? 0);

    setIsProcessingAdminAction(true);
    try {
      await winningsService.approveDeletionAndDeductCollections(approvingItem, currentUser);
      showToast(`Transaction ${transId} approved! Deducted ₱${winAmt.toLocaleString()} from Collections.`);
      setApprovingItem(null);
      if (onDataUpdated) onDataUpdated();
      await loadDedicatedDeletionRequests();
      setActiveFilterTab('REQUESTS');
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
    const transId = rejectingItem.computedTransId || rejectingItem.transaction_id || rejectingItem.transactionId || rejectingItem.transId || 'N/A';
    setIsProcessingAdminAction(true);
    try {
      await winningsService.rejectDeletionRequest(rejectingItem, rejectReason, currentUser);
      showToast(`Deletion request for ${transId} rejected.`);
      setRejectingItem(null);
      setRejectReason('');
      if (onDataUpdated) onDataUpdated();
      loadDedicatedDeletionRequests();
    } catch (err) {
      console.error('Reject deletion failed:', err);
      alert(`Failed to reject request: ${err.message}`);
    } finally {
      setIsProcessingAdminAction(false);
    }
  };


  const exportToCSV = () => {
    if (!displayItems.length) return alert("No records available to export.");
    const headers = ["Username / Actor", "Teller / Outlet", "Transaction ID", "Draw Time", "Bet No", "Bet Code", "Bet Amount", "Win Amount", "Date Returned", "Status", "Details / Reason"];
    const rows = displayItems.map(item => {
      const transId = item.transactionId || 'N/A';
      return [
        `"${item.username || item.actor_username || 'N/A'}"`,
        `"${item.fullName || item.outlet || 'N/A'}"`,
        `"${transId}"`,
        `"${formatDrawTime ? formatDrawTime(item.drawTime || item.drawDate || item.created_at || 'N/A') : 'N/A'}"`,
        `"${item.betNo || 'N/A'}"`,
        `"${item.betCode || 'RS3'}"`,
        parseFloat(item.betAmount ?? 0).toFixed(2),
        parseFloat(item.winAmount ?? 0).toFixed(2),
        `"${formatTimestamp(item.date_returned || item.created_at)}"`,
        `"${item.action || item.receipt_status || 'NO_RECEIPT'}"`,
        `"${item.reason || item.deletion_request_reason || item.deletion_request_status || 'NONE'}"`
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
    return (scopedReturnedData || []).reduce((sum, item) => sum + parseFloat(item.winAmount ?? 0), 0);
  }, [scopedReturnedData]);

  const displayTotalWin = useMemo(() => {
    return (displayItems || []).reduce((sum, item) => sum + parseFloat(item.winAmount ?? 0), 0);
  }, [displayItems]);

  const displayTotalBet = useMemo(() => {
    return (displayItems || []).reduce((sum, item) => sum + parseFloat(item.betAmount ?? 0), 0);
  }, [displayItems]);

  // Compute clean Remittance Serial Number dynamically from active unremitted tickets (e.g. MAN-260901-892301)
  const batchSerialNumber = useMemo(() => {
    const subOffice = (canFilterSubOffice && selectedSubOfficeFilter !== 'ALL')
      ? selectedSubOfficeFilter
      : (currentUser?.sub_office && currentUser.sub_office !== 'All'
        ? currentUser.sub_office
        : (unremittedDepositItems[0]?.sub_office || scopedReturnedData[0]?.sub_office || 'Mandaue Central'));

    if (unremittedDepositItems.length > 0) {
      const firstTicket = unremittedDepositItems[0];
      const transId = firstTicket.transactionId || firstTicket.transId || firstTicket.receipt_no;
      return generateRemittanceSerial(subOffice, transId);
    }

    return generateRemittanceSerial(subOffice, '892301');
  }, [unremittedDepositItems, scopedReturnedData, currentUser, canFilterSubOffice, selectedSubOfficeFilter]);

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
            All Returned ({(scopedReturnedData || []).filter(item => !isInactiveTeller(item)).length})
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
              : pendingRequestsCount > 0
                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black animate-pulse'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              }`}
          >
            <AlertTriangle size={14} className={pendingRequestsCount > 0 && activeFilterTab !== 'REQUESTS' ? 'text-amber-700' : ''} />
            <span>Deletion Requests ({pendingRequestsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('INACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeFilterTab === 'INACTIVE'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              }`}
          >
            Pull-out/AWOL/Terminated ({inactiveTellerItems.length})
          </button>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Sub-Office Filter Dropdown for Unclaimed Specialist and Admin only */}
          {canFilterSubOffice && availableSubOffices.length > 0 && (
            <ModernDropdown
              icon={Building2}
              label="SUB-OFFICE"
              value={selectedSubOfficeFilter}
              onChange={setSelectedSubOfficeFilter}
              options={subOfficeDropdownOptions}
              searchable={availableSubOffices.length > 5}
              size="md"
            />
          )}

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
      {canApprove && pendingRequestsCount > 0 && activeFilterTab !== 'REQUESTS' && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-l-4 border-l-amber-500 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-amber-700 shrink-0" />
            <div>
              <span className="font-black text-amber-900 uppercase">Attention Staff & Management:</span>
              <p className="text-slate-700 font-medium mt-0.5">
                There are <strong className="text-amber-900 font-bold">{pendingRequestsCount} pending deletion request(s)</strong> awaiting your review and approval.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveFilterTab('REQUESTS')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] rounded-lg shadow-xs cursor-pointer shrink-0"
          >
            Review Requests →
          </button>
        </div>
      )}



      {/* REQUESTS VIEW (Dedicated Table) vs NORMAL RETURNED WINNINGS TABLE */}
      {activeFilterTab === 'REQUESTS' ? (
        <DeletionRequestsTable
          requests={scopedDeletionRequests}
          isLoading={isLoadingDeletionRequests}
          canApprove={canApprove}
          formatDrawTime={formatDrawTime}
          onApprove={(item) => handleApproveDeletion(item)}
          onReject={(item) => setRejectingItem(item)}
          onViewTicket={(item) => setSelectedViewingTicket(item)}
          onRefresh={loadDedicatedDeletionRequests}
        />
      ) : (
        <div className="bg-white border border-slate-300 shadow-xs overflow-hidden w-full rounded-xl">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-[#002B66]/5 flex-wrap gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <h3 className="font-extrabold text-[#002B66] text-xs uppercase tracking-wider truncate">
              Returned Winnings Summary
            </h3>
            {canFilterSubOffice && selectedSubOfficeFilter !== 'ALL' && (
              <span className="text-[10px] font-bold bg-blue-100 text-[#002B66] border border-blue-300/80 px-2 py-0.5 rounded-md font-mono shadow-2xs shrink-0 flex items-center gap-1">
                <Building2 size={11} className="text-[#002B66]" />
                <span>{selectedSubOfficeFilter}</span>
              </span>
            )}
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
                {['Teller / Outlet', 'Trans. ID', 'Draw', 'Bet No.', 'Bet Code', 'Bet Amount', 'Win Amount', 'Date Returned', 'Status', 'Action'].map((h, i) => (
                  <th key={h} className={`px-3 py-2.5 border-r border-blue-900 whitespace-nowrap ${i >= 2 && i <= 4 || i >= 8 ? 'text-center' : i >= 5 && i <= 6 ? 'text-right' : i === 7 ? 'text-center' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
              {Object.keys(activeGroupedData).length > 0 ? (
                Object.entries(activeGroupedData).map(([username, items]) => {
                  const unremittedInGroup = items.filter(i => (!i.receipt_status || i.receipt_status === 'NO_RECEIPT') && (!i.isUnderSettlement || i.settlementStatus === 'FULLY PAID'));
                  const subtotalBet = unremittedInGroup.reduce((sum, i) => sum + parseFloat(i.betAmount ?? 0), 0);
                  const subtotalWin = unremittedInGroup.reduce((sum, i) => sum + parseFloat(i.winAmount ?? 0), 0);

                  return (
                    <Fragment key={username}>
                      <tr className="bg-slate-200/80 border-y border-slate-300">
                        <td colSpan="10" className="px-3 py-2 font-bold text-[#003366] text-xs uppercase tracking-wider">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <UserCheck size={14} className={activeFilterTab === 'AUDIT_DELETED' ? "text-blue-600 shrink-0" : "text-emerald-600 shrink-0"} />
                              <span>{activeFilterTab === 'AUDIT_DELETED' ? `REQUESTER / ACTOR: @${username}` : (SUPERVISOR_NAMES[username?.toLowerCase()] ? `SUPERVISOR: ${SUPERVISOR_NAMES[username?.toLowerCase()]}` : `SUPERVISOR: @${username}`)}</span>
                            </div>
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-300">
                              {items.length} records {activeFilterTab !== 'AUDIT_DELETED' && `(${unremittedInGroup.length} unremitted)`} • Subtotal: ₱{subtotalWin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {items.map((item, i) => {
                        const transId = getTicketTransId(item, `REC-${i + 1}`);
                        const isClaimedInSourceSystem = checkIsExplicitlyClaimed(item);
                        const isUnderSettlement = Boolean(item.isUnderSettlement && item.settlementStatus !== 'FULLY PAID');
                        const recordTimestamp = item.date_returned || item.created_at;
                        const isRemitted = Boolean(item.receipt_status && item.receipt_status !== 'NO_RECEIPT');
                        const isDeletionPending = item.deletion_request_status === 'PENDING_ADMIN_APPROVAL';

                        return (
                          <tr key={item.id || `${item.transactionId || transId}-${item.betCode || i}`} className={`transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-slate-100/80 ${isDeletionPending ? 'bg-amber-50/60 border-l-4 border-l-amber-500' : item.isAuditLog ? 'border-l-4 border-l-[#002B66]' : ''}`}>
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
                              {item.isAuditLog ? (
                                item.action === 'CLAIMED_TICKET_DELETION_REQUESTED' ? (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] px-2 py-0.5 rounded-full" title={`Requested by: ${item.username} • Reason: ${item.reason}`}>
                                    <Clock size={10} className="text-amber-700 animate-spin" /> DELETION REQUESTED
                                  </span>
                                ) : item.action === 'HARDCOPY_CLAIM_DELETION_APPROVED' ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px] px-2 py-0.5 rounded-full" title={`Approved by: ${item.approvedBy || 'Admin'}`}>
                                    <CheckCircle2 size={10} className="text-emerald-700" /> DELETION APPROVED
                                  </span>
                                ) : item.action === 'HARDCOPY_CLAIM_DELETION_REJECTED' ? (
                                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 font-black text-[10px] px-2 py-0.5 rounded-full" title={`Rejected by: ${item.rejectedBy || 'Admin'} • Reason: ${item.rejectReason}`}>
                                    <Ban size={10} className="text-rose-700" /> DELETION REJECTED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-300 font-black text-[10px] px-2 py-0.5 rounded-full">
                                    <Trash2 size={10} className="text-purple-700" /> {item.action?.replace(/_/g, ' ') || 'RECORD DELETED'}
                                  </span>
                                )
                              ) : isDeletionPending ? (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] px-2 py-0.5 rounded-full" title={`Requested by: ${item.deletion_request_by || 'Staff'} • Reason: ${item.deletion_request_reason || 'Hard copy receipt claimed'}`}>
                                  <Clock size={10} className="text-amber-700 animate-spin" /> PENDING APPROVAL
                                </span>
                              ) : item.unclaimed_approval_status === 'PENDING' ? (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase" title={`Pending HR Approval via email: ${item.hr_valid_email || 'HR Email'}`}>
                                  <Clock size={10} className="text-amber-700" /> PENDING HR ({item.teller_status})
                                </span>
                              ) : item.unclaimed_approval_status === 'APPROVED' ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase" title={`Approved by HR: ${item.unclaimed_approved_by || 'HR Officer'}`}>
                                  <CheckCircle2 size={10} className="text-emerald-700" /> HR APPROVED ({item.teller_status})
                                </span>
                              ) : item.unclaimed_approval_status === 'REJECTED' ? (
                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase" title={`Rejected by HR: ${item.unclaimed_approved_by || 'HR Officer'}`}>
                                  <Ban size={10} className="text-rose-700" /> HR REJECTED ({item.teller_status})
                                </span>
                              ) : isRemitted ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded-full border border-emerald-300">
                                  <CheckCircle2 size={10} /> DEPOSITED
                                </span>
                              ) : isUnderSettlement ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSettlementItem(item);
                                  }}
                                  className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full border transition-colors bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 cursor-pointer`}
                                  title="View Settlement Details"
                                >
                                  <Clock size={10} /> UNDER SETTLEMENT
                                </button>
                              ) : item.teller_status ? (
                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-rose-300 uppercase">
                                  <AlertTriangle size={10} /> {item.teller_status}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-blue-300">
                                  <Clock size={10} /> UNREMITTED
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                {item.isAuditLog ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAuditLog(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase text-[#002B66] bg-blue-50 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 hover:border-blue-400 rounded-md transition-all cursor-pointer shadow-2xs"
                                    title="View full audit log details from details JSONB"
                                  >
                                    <Eye size={11} className="stroke-[2.5] text-blue-600" />
                                    <span>View Details</span>
                                  </button>
                                ) : (
                                  <>
                                    {/* VIEW HARD COPY TICKET PROOF ICON */}
                                    {(isDeletionPending || item.deletion_request_attachment || item.hard_copy_ticket_url || item.ocr_data?.hard_copy_image) && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedViewingTicket({ ...item, computedTransId: transId })}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase text-[#002B66] bg-blue-50 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 hover:border-blue-400 rounded-md transition-all cursor-pointer shadow-2xs"
                                        title="View uploaded hard copy ticket proof"
                                      >
                                        <Eye size={11} className="stroke-[2.5] text-blue-600" />
                                        <span>View Ticket</span>
                                      </button>
                                    )}

                                    {item.unclaimed_approval_status === 'PENDING' ? (
                                      <span className="text-[10px] text-amber-700 font-bold italic" title={`Link already sent to ${item.hr_valid_email || 'HR Email'}`}>
                                        Awaiting HR
                                      </span>
                                    ) : isDeletionPending ? null : (
                                      <>
                                        {item.unclaimed_approval_status === 'APPROVED' && (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold" title={`Approved by: ${item.unclaimed_approved_by || 'HR Officer'}`}>
                                            <CheckCircle2 size={11} className="text-emerald-600" /> Approved by HR
                                          </span>
                                        )}
                                        {item.unclaimed_approval_status === 'REJECTED' && (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-bold" title={`Rejected by: ${item.unclaimed_approved_by || 'HR Officer'}`}>
                                            <Ban size={11} className="text-rose-600" /> Rejected by HR
                                          </span>
                                        )}
                                        {isRemitted && !isClaimedInSourceSystem && (
                                          <span className="text-[10px] text-emerald-700 font-bold">Proof Attached</span>
                                        )}
                                        {isClaimedInSourceSystem && (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedForRequestDelete({ ...item, computedTransId: transId })}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-300 hover:border-amber-600 rounded-xs transition-all cursor-pointer shadow-2xs"
                                            title={
                                              isRemitted 
                                                ? "Request admin approval to delete and deduct from Collections" 
                                                : isUnderSettlement 
                                                  ? "Request admin approval to delete claimed settlement ticket"
                                                  : "Request deletion for this ticket with hard copy proof"
                                            }
                                          >
                                            <Trash2 size={12} /> Request Delete
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
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
                    Total Returned Winnings
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
              const unremittedInGroup = items.filter(i => (!i.receipt_status || i.receipt_status === 'NO_RECEIPT') && (!i.isUnderSettlement || i.settlementStatus === 'FULLY PAID'));

              return (
                <div key={username} className="space-y-2">
                  <div className="bg-slate-200 border border-slate-300 px-3 py-2 rounded-lg flex items-center justify-between text-xs font-bold text-[#003366] uppercase">
                    <div className="flex items-center gap-1.5 truncate">
                      <UserCheck size={14} className={activeFilterTab === 'AUDIT_DELETED' ? "text-blue-600 shrink-0" : "text-emerald-600 shrink-0"} />
                      <span className="truncate">{activeFilterTab === 'AUDIT_DELETED' ? `@${username} (Audit)` : (SUPERVISOR_NAMES[username?.toLowerCase()] ? `SUPERVISOR: ${SUPERVISOR_NAMES[username?.toLowerCase()]}` : `SUPERVISOR: @${username}`)}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-300 shrink-0">
                      {items.length} items
                    </span>
                  </div>

                  {items.map((item, i) => {
                    const transId = getTicketTransId(item, `REC-${i + 1}`);
                    const isClaimedInSourceSystem = checkIsExplicitlyClaimed(item);
                    const isUnderSettlement = Boolean(item.isUnderSettlement && item.settlementStatus !== 'FULLY PAID');
                    const recordTimestamp = item.date_returned || item.created_at;
                    const isRemitted = Boolean(item.receipt_status && item.receipt_status !== 'NO_RECEIPT');
                    const isDeletionPending = item.deletion_request_status === 'PENDING_ADMIN_APPROVAL';

                    return (
                      <div key={item.id || `${item.transactionId || transId}-${item.betCode || i}`} className={`bg-white border rounded-xl p-3 space-y-2.5 shadow-2xs relative ${isDeletionPending ? 'border-amber-400 bg-amber-50/40' : item.isAuditLog ? 'border-blue-400 bg-blue-50/20' : 'border-slate-300'}`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${isDeletionPending ? 'bg-amber-500' : item.isAuditLog ? 'bg-[#002B66]' : isRemitted ? 'bg-emerald-600' : 'bg-[#003366]'}`}></div>

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
                            <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Win Amount</span>
                            <span className="font-extrabold text-emerald-700">₱{parseFloat(item.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pl-2 pt-2 border-t border-slate-100 text-[10px]">
                          <div>
                            <span className="text-slate-400 font-bold block uppercase text-[9px]">Date Returned</span>
                            <span className="font-mono text-slate-600">{formatTimestamp(recordTimestamp)}</span>
                          </div>
                          <div>
                            {item.isAuditLog ? (
                              item.action === 'CLAIMED_TICKET_DELETION_REQUESTED' ? (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-black text-[9px] px-2 py-0.5 rounded-full border border-amber-300">
                                  <Clock size={9} className="text-amber-700" /> DELETION REQUESTED
                                </span>
                              ) : item.action === 'HARDCOPY_CLAIM_DELETION_APPROVED' ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-black text-[9px] px-2 py-0.5 rounded-full border border-emerald-300">
                                  <CheckCircle2 size={9} className="text-emerald-700" /> DELETION APPROVED
                                </span>
                              ) : item.action === 'HARDCOPY_CLAIM_DELETION_REJECTED' ? (
                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-black text-[9px] px-2 py-0.5 rounded-full border border-rose-300">
                                  <Ban size={9} className="text-rose-700" /> DELETION REJECTED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 font-black text-[9px] px-2 py-0.5 rounded-full border border-purple-300">
                                  <Trash2 size={9} className="text-purple-700" /> {item.action?.replace(/_/g, ' ') || 'RECORD DELETED'}
                                </span>
                              )
                            ) : isDeletionPending ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-black text-[9px] px-2 py-0.5 rounded-full border border-amber-300">
                                <Clock size={9} className="text-amber-700" /> PENDING ADMIN
                              </span>
                            ) : item.unclaimed_approval_status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-bold text-[9px] px-2 py-0.5 rounded-full border border-amber-300 uppercase" title={`Pending HR Approval via email: ${item.hr_valid_email || 'HR Email'}`}>
                                <Clock size={9} className="text-amber-700" /> PENDING HR ({item.teller_status})
                              </span>
                            ) : item.unclaimed_approval_status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full border border-emerald-300 uppercase" title={`Approved by HR: ${item.unclaimed_approved_by || 'HR Officer'}`}>
                                <CheckCircle2 size={9} className="text-emerald-700" /> HR APPROVED ({item.teller_status})
                              </span>
                            ) : item.unclaimed_approval_status === 'REJECTED' ? (
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-bold text-[9px] px-2 py-0.5 rounded-full border border-rose-300 uppercase" title={`Rejected by HR: ${item.unclaimed_approved_by || 'HR Officer'}`}>
                                <Ban size={9} className="text-rose-700" /> HR REJECTED ({item.teller_status})
                              </span>
                            ) : isRemitted ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full border border-emerald-300">
                                <CheckCircle2 size={9} /> DEPOSITED
                              </span>
                            ) : isUnderSettlement ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSettlementItem(item);
                                }}
                                className={`inline-flex items-center gap-1 font-bold text-[9px] px-2 py-0.5 rounded-full border transition-colors bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 cursor-pointer`}
                                title="View Settlement Details"
                              >
                                <Clock size={9} /> SETTLEMENT
                              </button>
                            ) : item.teller_status ? (
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-bold text-[9px] px-2 py-0.5 rounded-full border border-rose-300 uppercase">
                                <AlertTriangle size={9} /> {item.teller_status}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold text-[9px] px-2 py-0.5 rounded-full border border-blue-300">
                                <Clock size={9} /> UNREMITTED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mobile Actions */}
                        <div className="pl-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                          {item.isAuditLog ? (
                            <button
                              type="button"
                              onClick={() => setSelectedAuditLog(item)}
                              className="px-2.5 py-1 text-[#002B66] bg-blue-50 border border-blue-200 rounded-lg font-black uppercase text-[10px] flex items-center gap-1 cursor-pointer"
                              title="View full audit log details"
                            >
                              <Eye size={11} className="stroke-[2.5] text-blue-600" />
                              <span>View Details</span>
                            </button>
                          ) : (
                            <>
                              {/* Mobile View Hard Copy Ticket Button */}
                              {(isDeletionPending || item.deletion_request_attachment || item.hard_copy_ticket_url || item.ocr_data?.hard_copy_image) && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedViewingTicket({ ...item, computedTransId: transId })}
                                  className="px-2.5 py-1 text-[#002B66] bg-blue-50 border border-blue-200 rounded-lg font-black uppercase text-[10px] flex items-center gap-1"
                                  title="View uploaded hard copy ticket proof"
                                >
                                  <Eye size={11} className="stroke-[2.5] text-blue-600" />
                                  <span>View Ticket</span>
                                </button>
                              )}

                              {item.unclaimed_approval_status === 'PENDING' ? (
                                <span className="text-[10px] text-amber-700 font-bold italic">
                                  Awaiting HR
                                </span>
                              ) : isDeletionPending ? null : (
                                <>
                                  {item.unclaimed_approval_status === 'APPROVED' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                                      <CheckCircle2 size={11} className="text-emerald-600" /> Approved by HR
                                    </span>
                                  )}
                                  {item.unclaimed_approval_status === 'REJECTED' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-bold">
                                      <Ban size={11} className="text-rose-600" /> Rejected by HR
                                    </span>
                                  )}
                                  {isRemitted && !isClaimedInSourceSystem && (
                                    <span className="text-[10px] text-emerald-700 font-bold">Proof Attached</span>
                                  )}
                                  {isClaimedInSourceSystem && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedForRequestDelete({ ...item, computedTransId: transId })}
                                      className="px-2.5 py-1 text-amber-600 border border-amber-300 rounded-lg text-[10px] font-bold uppercase shadow-2xs cursor-pointer"
                                      title={
                                        isRemitted 
                                          ? "Request admin approval to delete and deduct from Collections" 
                                          : isUnderSettlement 
                                            ? "Request admin approval to delete claimed settlement ticket"
                                            : "Request deletion for this claimed unremitted ticket"
                                      }
                                    >
                                      Request Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}
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
      )}

      {/* ATTACH WEEKLY REMITTANCE PROOF MODAL */}
      <AttachWeeklyProofModal
        isOpen={isWeeklyModalOpen}
        onClose={() => setIsWeeklyModalOpen(false)}
        batchSerialNumber={batchSerialNumber}
        filteredData={scopedReturnedData}
        claimedAdjustmentItems={claimedDeletionAdjustmentItems}
        currentUser={currentUser}
        formatDrawTime={formatDrawTime}
        formatTimestamp={formatTimestamp}
        onSuccess={(count) => {
          showToast(`Proof attached! ${count} records moved to Collections & Commissions.`);
          loadDedicatedDeletionRequests();
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
          loadDedicatedDeletionRequests();
          if (onDataUpdated) onDataUpdated();
        }}
      />

      {/* VIEW HARD COPY TICKET PROOF MODAL */}
      <ViewHardCopyTicketModal
        isOpen={Boolean(selectedViewingTicket)}
        onClose={() => setSelectedViewingTicket(null)}
        ticket={selectedViewingTicket}
        currentUser={currentUser}
        onApprove={(item) => handleApproveDeletion(item)}
        onReject={(item) => setRejectingItem(item)}
        isProcessingAction={isProcessingAdminAction}
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

      {/* SETTLEMENT DETAILS MODAL */}
      <SettlementDetailsModal
        isOpen={Boolean(selectedSettlementItem)}
        onClose={() => setSelectedSettlementItem(null)}
        item={selectedSettlementItem}
        onDataUpdated={onDataUpdated}
      />

    </div>
  );
}
