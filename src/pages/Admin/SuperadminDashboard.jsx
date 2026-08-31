import { useMemo, useState, useEffect } from 'react';
import { 
  ShieldCheck, ArrowLeftRight, CreditCard, Users, CheckCircle2, 
  Clock, AlertTriangle, TrendingUp, Building2, Smartphone, Landmark, 
  Coins, FileText, ChevronRight, Activity, Percent 
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

export default function SuperadminDashboard({ 
  returnedData = [], 
  unclaimedData = [], 
  receipts = [], 
  onNavigateTab 
}) {
  // Load official sub-offices directly from database table
  const [dbSubOffices, setDbSubOffices] = useState([]);

  useEffect(() => {
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
        console.warn('Failed to fetch sub_offices:', err);
      }
    };

    fetchSubOffices();

    const channel = supabase
      .channel('superadmin_sub_offices_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_offices' }, () => {
        fetchSubOffices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    });

    // Map sub-offices strictly from database sub_offices table
    const subOfficesStats = dbSubOffices.map((office) => {
      const officeName = office.name || '';
      let count = 0;
      let totalWin = 0;
      let returnOut = 0;
      let adminComm = 0;

      returnedData.forEach((i) => {
        const itemOffice = (i.sub_office || '').toLowerCase().trim();
        const targetOffice = officeName.toLowerCase().trim();
        
        // Match ticket if it references this sub-office name, or if Mandaue Central is default
        const isMatch = itemOffice === targetOffice || 
          (targetOffice.includes('mandaue') && (!itemOffice || itemOffice === 'all' || !dbSubOffices.some(so => so.name.toLowerCase().trim() === itemOffice)));

        if (isMatch) {
          const win = parseFloat(i.winAmount ?? 0);
          const out = parseFloat(i.return_amount_out ?? win);
          const adm = parseFloat(i.admin_commission ?? (win * 0.50));
          count += 1;
          totalWin += win;
          returnOut += out;
          adminComm += adm;
        }
      });

      return {
        id: office.id,
        subOffice: office.name,
        location: office.location,
        status: office.status || 'ACTIVE',
        count,
        totalWin,
        returnOut,
        adminComm
      };
    });

    const pendingVerificationCount = receipts.filter(r => r.verification_status === 'PENDING').length;
    const verifiedReceiptsCount = receipts.filter(r => r.verification_status === 'VERIFIED').length;
    const totalReceiptsAmount = receipts.reduce((sum, r) => sum + parseFloat(r.remittance_amount ?? 0), 0);

    return {
      totalUnclaimedWin,
      totalUnclaimedBet,
      unclaimedCount: unclaimedData.length,
      totalReturnedWin,
      totalReturnAmountOut,
      returnedCount: returnedData.length,
      totalAdminComm,
      totalAgentComm,
      totalStaffComm,
      totalCollectorComm,
      underSettlementCount,
      pendingVerificationCount,
      verifiedReceiptsCount,
      totalReceiptsAmount,
      subOffices: subOfficesStats
    };
  }, [returnedData, unclaimedData, receipts, dbSubOffices]);

  return (
    <div className="w-full space-y-6">
      
      {/* Top Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Total Return Liability */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Total Returned Win
            </span>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-emerald-700 mt-1 truncate">
              ₱{stats.totalReturnedWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-slate-500 font-bold mt-0.5 block">
              {stats.returnedCount} Returned Tickets
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl shrink-0 border border-emerald-100">
            <Coins size={24} />
          </div>
        </div>

        {/* Total Remitted Collections */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Total Remittances
            </span>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-[#002B66] mt-1 truncate">
              ₱{stats.totalReceiptsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-slate-500 font-bold mt-0.5 block">
              {receipts.length} Proofs Attached
            </span>
          </div>
          <div className="bg-blue-50 text-[#002B66] p-3 rounded-2xl shrink-0 border border-blue-100">
            <Landmark size={24} />
          </div>
        </div>

        {/* 50% Admin Net Pool */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Admin Commission (50%)
            </span>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-[#002B66] mt-1 truncate">
              ₱{stats.totalAdminComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-amber-600 font-bold mt-0.5 block">
              Direct Retained Yield
            </span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl shrink-0 border border-amber-100">
            <Percent size={24} />
          </div>
        </div>

        {/* Pending Verifications */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('verification')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all group"
        >
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Pending Verifications
            </span>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-rose-600 mt-1 truncate">
              {stats.pendingVerificationCount} Receipts
            </h3>
            <span className="text-[11px] text-slate-500 font-bold mt-0.5 group-hover:text-[#002B66] flex items-center gap-1">
              <span>Go to queue</span>
              <ChevronRight size={12} />
            </span>
          </div>
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl shrink-0 border border-rose-100">
            <Clock size={24} />
          </div>
        </div>

      </div>

      {/* 4-Tier Commission Payout Breakdown Cards */}
      <div className="bg-gradient-to-br from-[#002B66] to-[#001D47] text-white p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#FFD700] text-[#002B66] p-2 rounded-xl font-black shadow-xs">
              <Coins size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-white">
                4-Tier Commission Allocation Matrix
              </h3>
              <p className="text-xs text-blue-200 font-medium">
                Real-time automated distribution breakdown based on active returned winnings
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold bg-blue-900/60 border border-blue-700/60 px-3 py-1 rounded-full text-[#FFD700]">
            Total Distributed: ₱{stats.totalReturnedWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">
              1. Admin Pool (50%)
            </span>
            <p className="text-xl font-black font-mono text-[#FFD700]">
              ₱{stats.totalAdminComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-blue-300">Retained Company Yield</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">
              2. Agent Pool (30%)
            </span>
            <p className="text-xl font-black font-mono text-white">
              ₱{stats.totalAgentComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-blue-300">Sub-Office / Area Managers</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">
              3. Staff Pool (10%)
            </span>
            <p className="text-xl font-black font-mono text-white">
              ₱{stats.totalStaffComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-blue-300">Operations & Encoding Staff</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">
              4. Collector Pool (10%)
            </span>
            <p className="text-xl font-black font-mono text-white">
              ₱{stats.totalCollectorComm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-blue-300">Field Tellers & Runners</p>
          </div>
        </div>
      </div>

      {/* Sub-Offices Performance Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-[#002B66]" />
            <h3 className="font-extrabold text-[#002B66] text-xs sm:text-sm uppercase tracking-wider">
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
