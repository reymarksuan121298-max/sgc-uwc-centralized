import { useMemo } from 'react';
import { 
  ShieldCheck, ArrowLeftRight, CreditCard, Users, CheckCircle2, 
  Clock, AlertTriangle, TrendingUp, Building2, Smartphone, Landmark, 
  Coins, FileText, ChevronRight, Activity, Percent 
} from 'lucide-react';

export default function SuperadminDashboard({ 
  returnedData = [], 
  unclaimedData = [], 
  receipts = [], 
  onNavigateTab 
}) {
  // Financial & Commission Aggregations
  const stats = useMemo(() => {
    let totalUnclaimedWin = 0;
    let totalUnclaimedBet = 0;
    unclaimedData.forEach((i) => {
      totalUnclaimedWin += parseFloat(i.winAmount ?? 0);
      totalUnclaimedBet += parseFloat(i.betAmount ?? i.amount ?? i.gross ?? 0);
    });

    let totalReturnedWin = 0;
    let totalReturnAmountOut = 0;
    let totalAdminComm = 0;
    let totalAgentComm = 0;
    let totalStaffComm = 0;
    let totalCollectorComm = 0;
    let underSettlementCount = 0;

    const subOfficeMap = {};

    returnedData.forEach((i) => {
      const win = parseFloat(i.winAmount ?? 0);
      const out = parseFloat(i.return_amount_out ?? win);
      totalReturnedWin += win;
      totalReturnAmountOut += out;

      // 50% Admin, 30% Agent, 10% Staff, 10% Collector
      const adm = parseFloat(i.admin_commission ?? (win * 0.50));
      const agt = parseFloat(i.agent_commission ?? (win * 0.30));
      const stf = parseFloat(i.staff_commission ?? (win * 0.10));
      const col = parseFloat(i.collector_commission ?? (win * 0.10));

      totalAdminComm += adm;
      totalAgentComm += agt;
      totalStaffComm += stf;
      totalCollectorComm += col;

      if (i.isUnderSettlement) underSettlementCount += 1;

      const sub = i.sub_office || 'Mandaue Central';
      if (!subOfficeMap[sub]) {
        subOfficeMap[sub] = { subOffice: sub, count: 0, totalWin: 0, returnOut: 0, adminComm: 0 };
      }
      subOfficeMap[sub].count += 1;
      subOfficeMap[sub].totalWin += win;
      subOfficeMap[sub].returnOut += out;
      subOfficeMap[sub].adminComm += adm;
    });

    const pendingReceiptsCount = receipts.filter(r => r.verification_status === 'PENDING').length;
    const verifiedReceiptsCount = receipts.filter(r => r.verification_status === 'VERIFIED').length;
    const verifiedRemittanceTotal = receipts
      .filter(r => r.verification_status === 'VERIFIED')
      .reduce((sum, r) => sum + parseFloat(r.remittance_amount || 0), 0);

    return {
      totalUnclaimedWin,
      totalUnclaimedBet,
      unclaimedCount: unclaimedData.length,
      totalReturnedWin,
      totalReturnAmountOut,
      returnedCount: returnedData.length,
      underSettlementCount,
      totalAdminComm,
      totalAgentComm,
      totalStaffComm,
      totalCollectorComm,
      pendingReceiptsCount,
      verifiedReceiptsCount,
      verifiedRemittanceTotal,
      subOffices: Object.values(subOfficeMap)
    };
  }, [unclaimedData, returnedData, receipts]);

  return (
    <div className="space-y-5">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#001D47] via-[#002B66] to-[#0a3f8a] text-white p-5 md:p-6 rounded-2xl shadow-xl border border-blue-900/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="bg-[#FFD700] text-[#002B66] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={13} /> Superadmin Command Center
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Activity size={12} className="animate-pulse" /> Live Centralized Engine
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Enterprise Operations Overview
            </h2>
            <p className="text-xs text-blue-200 mt-1 max-w-xl">
              Centralized oversight of all sub-offices, returned winnings payout tracking, and receipt verification queues.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {stats.pendingReceiptsCount > 0 && (
              <button
                onClick={() => onNavigateTab && onNavigateTab('verification')}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer animate-bounce"
              >
                <Clock size={16} />
                <span>Review {stats.pendingReceiptsCount} Pending Proofs</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 w-full min-w-0">
        
        {/* Unclaimed Registry Volume */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block truncate">Unclaimed Volume</span>
            <p className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1.5 leading-tight truncate">
              ₱{stats.totalUnclaimedWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
              {stats.unclaimedCount} pending tickets
            </span>
          </div>
          <div className="p-2.5 bg-slate-100/80 text-[#002B66] rounded-xl shrink-0 border border-slate-200/50"><FileText size={18} /></div>
        </div>

        {/* Returned Winnings Volume */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block truncate">Total Returned</span>
            <p className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1.5 leading-tight truncate">
              ₱{stats.totalReturnedWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
              {stats.returnedCount} tickets in ledger
            </span>
          </div>
          <div className="p-2.5 bg-slate-100/80 text-[#002B66] rounded-xl shrink-0 border border-slate-200/50"><ArrowLeftRight size={18} /></div>
        </div>

        {/* Return Amount Out (Remitted) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block truncate">Return Amount Out</span>
            <p className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1.5 leading-tight truncate">
              ₱{stats.totalReturnAmountOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
              ₱{stats.verifiedRemittanceTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} verified
            </span>
          </div>
          <div className="p-2.5 bg-slate-100/80 text-[#002B66] rounded-xl shrink-0 border border-slate-200/50"><CreditCard size={18} /></div>
        </div>

        {/* Settlements & Verification Queue */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block truncate">Settlements & Proofs</span>
            <p className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1.5 leading-tight truncate">
              {stats.underSettlementCount} <span className="text-xs font-normal text-slate-400">Agreements</span>
            </p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
              {stats.pendingReceiptsCount} pending approval
            </span>
          </div>
          <div className="p-2.5 bg-slate-100/80 text-[#002B66] rounded-xl shrink-0 border border-slate-200/50"><ShieldCheck size={18} /></div>
        </div>
      </div>

      {/* Sub-Offices Performance Table */}
      <div className="bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-[#002B66]" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#002B66]">
              Sub-Offices & Branch Performance Matrix
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-blue-100 text-[#002B66] px-2.5 py-0.5 rounded-full">
            {stats.subOffices.length} Active Sub-Offices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-[#002B66] text-white text-[11px] font-black uppercase tracking-wider">
                <th className="px-4 py-3 border-r border-blue-900">Sub-Office / Branch</th>
                <th className="px-4 py-3 border-r border-blue-900 text-center">Returned Count</th>
                <th className="px-4 py-3 border-r border-blue-900 text-right">Total Win Liability</th>
                <th className="px-4 py-3 border-r border-blue-900 text-right">Return Amount Out</th>
                <th className="px-4 py-3 border-r border-blue-900 text-center">Receipts Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {!stats.subOffices.length ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
                    No sub-office activity recorded.
                  </td>
                </tr>
              ) : (
                stats.subOffices.map((sub, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-900">
                      {sub.subOffice}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 text-center font-mono font-bold text-[#002B66]">
                      {sub.count}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold text-slate-800 text-right">
                      ₱{sub.totalWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 font-mono font-extrabold text-amber-700 text-right">
                      ₱{sub.returnOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                        Operational
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('returned')}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#002B66] hover:underline cursor-pointer"
                      >
                        <span>View Ledger</span>
                        <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
