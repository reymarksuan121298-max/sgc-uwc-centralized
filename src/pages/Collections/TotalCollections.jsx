import { useState, useMemo } from 'react';
import { 
  Coins, Download, Search, Building2, UserCheck, CheckCircle2, 
  Landmark, Clock, ShieldCheck, Receipt, PieChart, FileCheck, Check, Ban, X, Loader2
} from 'lucide-react';
import RequestDeleteModal from '../../components/winnings/RequestDeleteModal';
import ConfirmPopover from '../../components/common/ConfirmPopover';
import { winningsService } from '../../services/winningsService';
import { isAdminRole, isSuperAdminRole, canApproveDeletionRequests } from '../../utils/permissions';

export default function TotalCollections({ 
  returnedData = [], 
  currentUser,
  formatDrawTime,
  onDataUpdated
}) {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'matrix' | 'detailed'
  const [searchQuery, setSearchQuery] = useState('');
  const [subOfficeFilter, setSubOfficeFilter] = useState('ALL');
  const [selectedForRequestDelete, setSelectedForRequestDelete] = useState(null);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingItem, setApprovingItem] = useState(null);
  const [isProcessingAdminAction, setIsProcessingAdminAction] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isAdmin = isAdminRole(currentUser?.role) || isSuperAdminRole(currentUser?.role);
  const canApprove = canApproveDeletionRequests(currentUser?.role) || isAdmin;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleApproveDeletion = (item) => {
    setApprovingItem(item);
  };

  const executeApproveDeletion = async () => {
    if (!approvingItem) return;
    const transId = approvingItem.batch_serial_no || approvingItem.transactionId || 'N/A';
    const winAmt = parseFloat(approvingItem.winAmount ?? 0);

    setIsProcessingAdminAction(true);
    try {
      await winningsService.approveDeletionAndDeductCollections(approvingItem, currentUser);
      showToast(`Transaction ${transId} approved & deducted from collections!`);
      setApprovingItem(null);
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      console.error('Approve deletion failed:', err);
      showToast(`Failed to approve deletion: ${err.message}`);
    } finally {
      setIsProcessingAdminAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    setIsProcessingAdminAction(true);
    try {
      await winningsService.rejectDeletionRequest(rejectingItem, rejectReason, currentUser);
      showToast(`Deletion request rejected.`);
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

  // STRICT FILTER: Collections & Commissions ONLY available when proof of remittance is attached!
  const scopedData = useMemo(() => {
    let list = (returnedData || []).filter(item => {
      // Must not be approved for deletion (hardcopy claimed deduction)
      if (item.deletion_request_status === 'APPROVED') return false;
      // Must have proof of remittance attached (status not 'NO_RECEIPT' and not empty)
      return Boolean(item.receipt_status && item.receipt_status !== 'NO_RECEIPT');
    });

    // If logged in as specific sub-office, restrict to their sub-office
    if (currentUser?.sub_office && currentUser.sub_office !== 'All') {
      list = list.filter(i => (i.sub_office || 'Mandaue Central') === currentUser.sub_office);
    }
    return list;
  }, [returnedData, currentUser]);

  const uniqueSubOffices = useMemo(() => {
    const set = new Set();
    scopedData.forEach(i => set.add(i.sub_office || 'Mandaue Central'));
    return Array.from(set);
  }, [scopedData]);

  // Filtered transactions aligned with Sub-Office & search
  const filteredList = useMemo(() => {
    return scopedData.filter(item => {
      const transId = String(item.batch_serial_no || item.transactionId || '').trim();

      // Sub-office filter
      if (subOfficeFilter !== 'ALL' && (item.sub_office || 'Mandaue Central') !== subOfficeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = (
          transId.toLowerCase().includes(q) ||
          (item.username || '').toLowerCase().includes(q) ||
          (item.fullName || item.outlet || '').toLowerCase().includes(q) ||
          (item.sub_office || '').toLowerCase().includes(q) ||
          (item.betNo || '').toLowerCase().includes(q)
        );
        if (!match) return false;
      }

      return true;
    });
  }, [scopedData, subOfficeFilter, searchQuery]);

  // Aggregated KPI Totals
  const totals = useMemo(() => {
    let totalWin = 0;
    let totalReturnOut = 0;
    let totalAdminComm = 0;
    let totalAgentComm = 0;
    let totalStaffComm = 0;
    let totalCollectorComm = 0;

    const branchSummary = {};

    filteredList.forEach(item => {
      const win = parseFloat(item.winAmount ?? 0);
      const out = parseFloat(item.return_amount_out ?? win);
      const adm = parseFloat(item.admin_commission ?? (win * 0.50));
      const agt = parseFloat(item.agent_commission ?? (win * 0.30));
      const stf = parseFloat(item.staff_commission ?? (win * 0.10));
      const col = parseFloat(item.collector_commission ?? (win * 0.10));

      totalWin += win;
      totalReturnOut += out;
      totalAdminComm += adm;
      totalAgentComm += agt;
      totalStaffComm += stf;
      totalCollectorComm += col;

      const branch = item.sub_office || 'Mandaue Central';
      if (!branchSummary[branch]) {
        branchSummary[branch] = { branch, count: 0, win: 0, out: 0, admin: 0, agent: 0, staff: 0, collector: 0 };
      }
      branchSummary[branch].count += 1;
      branchSummary[branch].win += win;
      branchSummary[branch].out += out;
      branchSummary[branch].admin += adm;
      branchSummary[branch].agent += agt;
      branchSummary[branch].staff += stf;
      branchSummary[branch].collector += col;
    });

    return {
      count: filteredList.length,
      totalWin,
      totalReturnOut,
      totalAdminComm,
      totalAgentComm,
      totalStaffComm,
      totalCollectorComm,
      branches: Object.values(branchSummary)
    };
  }, [filteredList]);

  const exportCollectionsCSV = () => {
    if (!filteredList.length) return alert('No collection records to export.');
    const headers = [
      'SRN / Trans ID', 'Branch / Sub-Office', 'Supervisor / Account', 'Teller / Outlet', 
      'Draw Schedule', 'Bet Combination', 'Win Liability (₱)', 'Return Amount Out (₱)', 
      'Admin 50% Share (₱)', 'Agent/Teller 30% Share (₱)', 'Staff 10% Share (₱)', 'Collector 10% Share (₱)', 
      'Remittance Status', 'Date Returned'
    ];

    const rows = filteredList.map(item => {
      const transId = String(item.batch_serial_no || item.transactionId || 'N/A').trim();

      const win = parseFloat(item.winAmount ?? 0);
      const out = parseFloat(item.return_amount_out ?? win);
      const adm = parseFloat(item.admin_commission ?? (win * 0.50)).toFixed(2);
      const agt = parseFloat(item.agent_commission ?? (win * 0.30)).toFixed(2);
      const stf = parseFloat(item.staff_commission ?? (win * 0.10)).toFixed(2);
      const col = parseFloat(item.collector_commission ?? (win * 0.10)).toFixed(2);

      return [
        `"${transId}"`,
        `"${item.sub_office || 'Mandaue Central'}"`,
        `"${item.username || 'N/A'}"`,
        `"${item.fullName || item.outlet || 'N/A'}"`,
        `"${formatDrawTime ? formatDrawTime(item.drawTime || item.drawDate) : item.drawTime || 'N/A'}"`,
        `"${item.betNo || 'N/A'} (${item.betCode || 'RS3'})"`,
        win.toFixed(2),
        out.toFixed(2),
        adm,
        agt,
        stf,
        col,
        `"${item.receipt_status || 'REMITTED'}"`,
        `"${item.updated_at || item.created_at || 'N/A'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Collections_Commissions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If no records have proof of remittance attached yet, show clean empty state!
  if (!scopedData.length) {
    return (
      <div className="w-full space-y-5">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-[#001D47] via-[#002B66] to-[#04337a] text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-blue-900/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-[#FFD700] text-[#002B66] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Coins size={13} /> Collections & Commissions Ledger
              </span>
              <span className="text-blue-200 text-xs font-mono font-bold">
                0 Remitted Collections
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Total Collections & Commission Allocations
            </h2>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
              Consolidated collection prize liabilities, return amount out disbursements, and automated 4-tier commission pools across all verified sub-offices.
            </p>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-10 sm:p-14 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-[#002B66] rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
            <ShieldCheck size={32} />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-black text-[#002B66] uppercase tracking-wide">
              No Remitted Collections Available Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Collections and commission allocations will only be available here once proof of remittance is attached in the <strong>Returned Winnings</strong> tab.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold">
              <Clock size={13} /> Awaiting remittance proof attachment
            </span>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      
      {/* View Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl w-fit border border-slate-300/60 shadow-xs">
          
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-[#002B66] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <PieChart size={14} />
            <span>Commission Allocations</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'overview' ? 'bg-[#FFD700] text-[#002B66] font-black' : 'bg-slate-300/80 text-slate-700 font-bold'
            }`}>
              4-Tier
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'matrix'
                ? 'bg-[#002B66] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Building2 size={14} />
            <span>Sub-Office Matrix</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'matrix' ? 'bg-[#FFD700] text-[#002B66] font-black' : 'bg-slate-300/80 text-slate-700 font-bold'
            }`}>
              {totals.branches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('detailed')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'detailed'
                ? 'bg-[#002B66] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Receipt size={14} />
            <span>Detailed Ticket Ledger</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'detailed' ? 'bg-[#FFD700] text-[#002B66] font-black' : 'bg-slate-300/80 text-slate-700 font-bold'
            }`}>
              {filteredList.length}
            </span>
          </button>
        </div>

        {activeSubTab === 'detailed' && (
          <button
            onClick={exportCollectionsCSV}
            className="flex items-center gap-1.5 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            <Download size={13} />
            <span>Download CSV</span>
          </button>
        )}
      </div>

      {/* TAB 1: COMMISSION ALLOCATIONS OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-5">
          {/* Top Header Card */}
          <div className="bg-gradient-to-r from-[#001D47] via-[#002B66] to-[#04337a] text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-blue-900/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-[#FFD700] text-[#002B66] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Coins size={13} /> Collections & Commissions Ledger
                </span>
                <span className="text-blue-200 text-xs font-mono font-bold">
                  {totals.count} Remitted Records • {totals.branches.length} Sub-Offices
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Total Collections & Commission Allocations
              </h2>
              <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
                Consolidated collection prize liabilities, return amount out disbursements, and automated 4-tier commission pools across all verified branches.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={exportCollectionsCSV}
                className="flex items-center gap-1.5 bg-[#FFD700] hover:bg-amber-400 text-[#002B66] px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Download size={15} />
                <span>Export Ledger</span>
              </button>
            </div>
          </div>

          {/* Main KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 w-full min-w-0">
            
            {/* Gross Collection Volume */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block truncate">Gross Collection Volume</span>
                <p className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1.5 leading-tight truncate">
                  ₱{totals.totalWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
                  Total prize liability
                </span>
              </div>
              <div className="p-2.5 bg-slate-100/80 text-[#002B66] rounded-xl shrink-0 border border-slate-200/50"><Coins size={18} /></div>
            </div>

            {/* Return Amount Out */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block truncate">Return Amount Out</span>
                <p className="text-base sm:text-lg font-black font-mono text-amber-700 mt-1.5 leading-tight truncate">
                  ₱{totals.totalReturnOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
                  Disbursed payout volume
                </span>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl shrink-0 border border-amber-200/50"><CheckCircle2 size={18} /></div>
            </div>

            {/* Head Office Admin Pool (50%) */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block truncate">Admin Share (50%)</span>
                <p className="text-base sm:text-lg font-black font-mono text-[#002B66] mt-1.5 leading-tight truncate">
                  ₱{totals.totalAdminComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
                  Head Office Fund Pool
                </span>
              </div>
              <div className="p-2.5 bg-blue-50 text-[#002B66] rounded-xl shrink-0 border border-blue-200/50"><Landmark size={18} /></div>
            </div>

            {/* Outlets Agent Share (30%) */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block truncate">Agent Share (30%)</span>
                <p className="text-base sm:text-lg font-black font-mono text-emerald-700 mt-1.5 leading-tight truncate">
                  ₱{totals.totalAgentComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
                  Outlet incentives pool
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0 border border-emerald-200/50"><UserCheck size={18} /></div>
            </div>
          </div>

          {/* Clean 4-Tier Commission Pool Allocation Summary */}
          <div className="bg-white border border-slate-200/80 p-4 sm:p-5 shadow-2xs w-full min-w-0 rounded-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-slate-100 text-[#002B66] rounded-xl font-black shrink-0">
                  <Coins size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-xs text-[#002B66] uppercase tracking-wider truncate">
                    Consolidated 4-Tier Commission Pool Allocations
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    50% Admin Head Office, 30% Agent/Teller, 10% Branch Staff, 10% Field Collector
                  </p>
                </div>
              </div>
              <span className="bg-slate-100 text-[#002B66] px-3 py-1 rounded-full text-xs font-black font-mono border border-slate-200 shrink-0">
                Total Win Liability: ₱{totals.totalWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 w-full min-w-0">
              
              <div className="bg-slate-50/80 border border-slate-200/80 p-3.5 sm:p-4 rounded-xl min-w-0">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">Admin Share</span>
                  <span className="bg-slate-200/60 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0">50%</span>
                </div>
                <p className="text-base sm:text-lg font-black font-mono mt-1.5 text-[#002B66] truncate">
                  ₱{totals.totalAdminComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Head Office Operations</span>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/80 p-3.5 sm:p-4 rounded-xl min-w-0">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">Agent / Teller</span>
                  <span className="bg-slate-200/60 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0">30%</span>
                </div>
                <p className="text-base sm:text-lg font-black font-mono mt-1.5 text-slate-900 truncate">
                  ₱{totals.totalAgentComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Teller Payout Incentive</span>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/80 p-3.5 sm:p-4 rounded-xl min-w-0">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">Staff Share</span>
                  <span className="bg-slate-200/60 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0">10%</span>
                </div>
                <p className="text-base sm:text-lg font-black font-mono mt-1.5 text-slate-900 truncate">
                  ₱{totals.totalStaffComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Branch Office Staff</span>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/80 p-3.5 sm:p-4 rounded-xl min-w-0">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">Collector Share</span>
                  <span className="bg-slate-200/60 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0">10%</span>
                </div>
                <p className="text-base sm:text-lg font-black font-mono mt-1.5 text-slate-900 truncate">
                  ₱{totals.totalCollectorComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Field Collectors Pool</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUB-OFFICE MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-[#002B66]" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#002B66]">
                Sub-Office Collections & Commission Breakdown Matrix
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-100 text-[#002B66] px-2.5 py-0.5 rounded-full">
              {totals.branches.length} Sub-Offices
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#002B66] text-white text-[11px] font-black uppercase tracking-wider">
                  <th className="px-4 py-3 border-r border-blue-900">Branch / Sub-Office</th>
                  <th className="px-4 py-3 border-r border-blue-900 text-center">Tickets</th>
                  <th className="px-4 py-3 border-r border-blue-900 text-right">Total Win</th>
                  <th className="px-4 py-3 border-r border-blue-900 text-right">Return Out (₱)</th>
                  <th className="px-4 py-3 border-r border-blue-900 text-right">Admin 50%</th>
                  <th className="px-4 py-3 border-r border-blue-900 text-right">Agent 30%</th>
                  <th className="px-4 py-3 border-r border-blue-900 text-right">Staff 10%</th>
                  <th className="px-4 py-3 text-right">Collector 10%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {!totals.branches.length ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-bold uppercase text-xs">
                      No branch collections recorded.
                    </td>
                  </tr>
                ) : (
                  totals.branches.map((b, i) => (
                    <tr 
                      key={i} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-900">
                        {b.branch}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 text-center font-mono font-bold text-[#002B66]">
                        {b.count}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold text-slate-800 text-right">
                        ₱{b.win.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 font-mono font-extrabold text-amber-700 text-right">
                        ₱{b.out.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 font-mono font-extrabold text-[#002B66] text-right">
                        ₱{b.admin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 font-mono font-extrabold text-emerald-700 text-right">
                        ₱{b.agent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 font-mono font-extrabold text-amber-700 text-right">
                        ₱{b.staff.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 font-mono font-extrabold text-purple-700 text-right">
                        ₱{b.collector.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DETAILED COLLECTIONS TRANSACTION TABLE */}
      {activeSubTab === 'detailed' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          
          {/* Controls */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SRN, Outlet, Teller, Combo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 focus:border-[#002B66] outline-none"
                />
              </div>

              {/* Sub-Office Filter */}
              <select
                value={subOfficeFilter}
                onChange={(e) => setSubOfficeFilter(e.target.value)}
                className="bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 focus:border-[#002B66] outline-none"
              >
                <option value="ALL">All Branches ({uniqueSubOffices.length})</option>
                {uniqueSubOffices.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-[#002B66] text-white text-[11px] font-black uppercase tracking-wider">
                  <th className="px-3.5 py-3 border-r border-blue-900">SRN</th>
                  <th className="px-3.5 py-3 border-r border-blue-900">Branch</th>
                  <th className="px-3.5 py-3 border-r border-blue-900">Teller / Outlet</th>
                  <th className="px-3.5 py-3 border-r border-blue-900 text-center">Bet & Code</th>
                  <th className="px-3.5 py-3 border-r border-blue-900 text-right">Win Liability</th>
                  <th className="px-3.5 py-3 border-r border-blue-900 text-right">Return Out</th>
                  <th className="px-3.5 py-3 border-r border-blue-900 text-right">Admin (50%)</th>
                  <th className="px-3.5 py-3 border-r border-blue-900 text-right">Agent (30%)</th>
                  <th className="px-3.5 py-3 border-r border-blue-900 text-right">Staff (10%)</th>
                  <th className="px-3.5 py-3 text-right">Collector (10%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {!filteredList.length ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500 font-bold uppercase text-xs">
                      No matching remitted collection records found.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const transId = String(item.batch_serial_no || item.transactionId || '').trim();

                    const win = parseFloat(item.winAmount ?? 0);
                    const out = parseFloat(item.return_amount_out ?? win);
                    const adm = parseFloat(item.admin_commission ?? (win * 0.50));
                    const agt = parseFloat(item.agent_commission ?? (win * 0.30));
                    const stf = parseFloat(item.staff_commission ?? (win * 0.10));
                    const col = parseFloat(item.collector_commission ?? (win * 0.10));

                    return (
                      <tr key={item.id || transId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 border-r border-slate-100 font-mono font-black text-[#002B66]">
                          {transId}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-100 font-bold text-slate-900">
                          {item.sub_office || 'Mandaue Central'}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-100 font-medium text-slate-800 uppercase">
                          {item.fullName || item.outlet || 'N/A'}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-100 text-center font-mono font-bold text-slate-900">
                          {item.betNo || 'N/A'} <span className="text-slate-500 font-normal">({item.betCode || 'RS3'})</span>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-100 font-mono font-black text-slate-800 text-right">
                          ₱{win.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-100 font-mono font-extrabold text-amber-700 text-right">
                          ₱{out.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-100 font-mono font-extrabold text-[#002B66] text-right">
                          ₱{adm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-100 font-mono font-extrabold text-emerald-700 text-right">
                          ₱{agt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-100 font-mono font-extrabold text-amber-700 text-right">
                          ₱{stf.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-extrabold text-purple-700 text-right">
                          ₱{col.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs font-mono font-bold text-slate-700 gap-2">
            <span>Showing {filteredList.length} records in current filter</span>
            <div className="flex items-center gap-4">
              <span>Total Win: ₱{totals.totalWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span className="text-amber-700 font-extrabold">Return Out: ₱{totals.totalReturnOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span className="text-[#002B66] font-black">Admin 50%: ₱{totals.totalAdminComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

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
                Are you sure you want to reject the deletion request for remitted transaction <strong className="font-mono text-rose-900">{rejectingItem.batch_serial_no || rejectingItem.transactionId}</strong>?
              </p>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Rejection Reason / Notes
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Physical stub verified as invalid..."
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
        title="Approve Remitted Deletion"
        type="success"
        confirmText="Approve & Deduct"
        isLoading={isProcessingAdminAction}
        onCancel={() => setApprovingItem(null)}
        onConfirm={executeApproveDeletion}
      >
        {approvingItem && (
          <div className="space-y-3">
            <p className="text-slate-700">
              Are you sure you want to <strong>APPROVE</strong> hard copy deletion for this remitted transaction?
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                <span className="text-slate-500 font-sans font-bold">Transaction / SRN:</span>
                <span className="font-black text-[#002B66]">{approvingItem.batch_serial_no || approvingItem.transactionId}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                <span className="text-slate-500 font-sans font-bold">Sub-Office:</span>
                <span className="font-bold text-slate-800">{approvingItem.sub_office || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 font-sans font-bold">Deduct from Collections:</span>
                <span className="font-extrabold text-emerald-800 text-sm">
                  ₱{parseFloat(approvingItem.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              The ticket will be deleted and automatically subtracted from Collections & Commissions.
            </p>
          </div>
        )}
      </ConfirmPopover>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#002B66] border border-[#FFD700] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 text-xs font-bold">
          <CheckCircle2 size={16} className="text-[#FFD700] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
