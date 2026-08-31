import React, { useState } from 'react';
import { 
  FileText, Landmark, CheckCircle2, Search, AlertCircle, 
  Eye, EyeOff, UserCheck, RefreshCw, Check, Image as ImageIcon, 
  ChevronRight, QrCode, Building2, ShieldAlert, AlertTriangle
} from 'lucide-react';
import IncidentReportModal from '../../components/winnings/IncidentReportModal';
import { isIncidentReportEligible, getTicketAgeInDays } from '../../utils/ticketAge';
import { getTicketTransId } from '../../utils/formatters';
import CustomDatePicker from '../../components/common/CustomDatePicker';
import { isSSRRole } from '../../utils/permissions';

export default function UnclaimedRegistry({
  currentUser,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  isSuperAdmin,
  gatewayEndpoints = [],
  selectedEndpointFilter,
  setSelectedEndpointFilter,
  searchQuery,
  setSearchQuery,
  totals,
  errorMsg,
  showDailyTable,
  setShowDailyTable,
  loading,
  groupedData = {},
  activeDisplayDate,
  onRowClick,
  onCopySupervisorImage,
  isCapturingImage,
  copiedSupervisorKey,
  copiedSupervisorKeys = new Set(),
  copiedTransIds = new Set(),
  openedQrTransIds = new Set(),
  formatDrawTime,
  onOpenQrModal
}) {
  const [incidentReportTicket, setIncidentReportTicket] = useState(null);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const activeEndpoints = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);

  // 150ms Search Debounce to reduce rendering load during fast typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 150);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const getRowMeta = (item, index, userKey) => {
    const transId = getTicketTransId(item, `REC-${index + 1}`);
    const isOverdue = isIncidentReportEligible(item);
    return {
      transId,
      displayAccountName: item.fullName || item.outlet || item.username || 'N/A',
      betNo: item.betNo || item.CombiNo || item.SoldOutCombiNo || 'N/A',
      betCode: item.betCode || (item.rambolito ? 'RS3' : 'TS3'),
      drawFormatted: formatDrawTime(item.drawTime || item.draw, item.drawDate || item.created_at),
      showWarningBadge: isOverdue,
      ageDays: getTicketAgeInDays(item),
      betAmount: parseFloat(item.betAmount ?? item.amount ?? item.gross ?? 0),
      winAmount: parseFloat(item.winAmount ?? 0)
    };
  };

  return (
    <div className="space-y-4">

      {/* FROZEN / STICKY TOP HEADER: Date Filters, Search & Summary Metrics (Zero Bleed-through) */}
      <div className="sticky -top-2.5 sm:-top-4 md:-top-6 z-10 bg-slate-100 pt-2.5 sm:pt-4 md:pt-6 pb-3 -mt-2.5 sm:-mt-4 md:-mt-6 -mx-2.5 sm:-mx-4 md:-mx-6 px-2.5 sm:px-4 md:px-6 shadow-xs space-y-3.5">
        
        {/* Date Filters & Search Toolbar (With Top Navy Accent) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 border-t-4 border-t-[#002B66] shadow-xs flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full md:w-auto">
            
            {/* Custom Date Range Filter Boxes */}
            <div className="flex flex-wrap items-center gap-3">
              <CustomDatePicker
                label="DATE FROM"
                value={fromDate}
                onChange={setFromDate}
              />
              <CustomDatePicker
                label="DATE TO"
                value={toDate}
                onChange={setToDate}
              />
            </div>

            {/* Sub-Office Selector (Hidden for SSR and branch-locked accounts) */}
            {!isSSRRole(currentUser?.role) && (isSuperAdmin || !currentUser?.sub_office || currentUser?.sub_office === 'All') && activeEndpoints.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
                <Building2 size={15} className="text-[#002B66] shrink-0" />
                <span className="text-[10px] font-black uppercase text-slate-400">Sub-Office</span>
                <select
                  value={selectedEndpointFilter}
                  onChange={(e) => setSelectedEndpointFilter(e.target.value)}
                  className="bg-transparent font-bold text-[#002B66] outline-none cursor-pointer max-w-[220px] truncate"
                >
                  <option value="ALL">All Sub-Offices</option>
                  {activeEndpoints.map(ep => (
                    <option key={ep.id} value={ep.id}>
                      {ep.sub_office && ep.sub_office !== 'All' ? ep.sub_office : ep.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search Input Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search username, trans ID, bet no..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200/90 pl-10 pr-3.5 py-2 text-xs rounded-xl focus:ring-2 focus:ring-[#002B66]/20 focus:border-[#002B66] outline-none font-medium transition-all"
            />
          </div>
        </div>

        {/* Clean Professional KPI Cards with Left Navy Stripe */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
          {[
            { label: 'UNCLAIMED RECORDS', val: totals.count, Icon: FileText },
            { label: 'TOTAL BET VOLUME', val: `₱${totals.betAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, Icon: AlertTriangle },
            { label: 'TOTAL UNCLAIMED COLLECTION', val: `₱${totals.winAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, Icon: CheckCircle2 }
          ].map(({ label, val, Icon }, i) => (
            <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200/80 border-l-[6px] border-l-[#002B66] shadow-xs hover:shadow-md transition-all flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider leading-none truncate">{label}</p>
                <p className="text-xl sm:text-2xl font-black font-mono mt-2 text-slate-900 leading-tight truncate">{val}</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 text-[#002B66] shrink-0 border border-blue-100/80">
                <Icon size={20} className="stroke-[2.2]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" /> <span className="break-words">{errorMsg}</span>
        </div>
      )}

      {/* Registry Accordion */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mx-auto w-full">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-[#002B66]/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="font-extrabold text-[#002B66] text-xs uppercase tracking-wider truncate">Unclaimed Winnings Summary</h3>
            <span className="text-[10px] font-bold bg-[#002B66] text-[#FFD700] px-2 py-0.5 rounded font-mono shadow-2xs shrink-0">{activeDisplayDate}</span>
          </div>
          <button 
            type="button"
            onClick={() => setShowDailyTable(!showDailyTable)} 
            className="text-slate-500 hover:text-[#002B66] p-1 rounded-lg hover:bg-slate-200/50 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
          >
            {showDailyTable ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="hidden sm:inline">{showDailyTable ? "Hide Data" : "Show Data"}</span>
          </button>
        </div>

        {showDailyTable && (
          <div className="w-full p-2 sm:p-4 bg-slate-50/50">
            {loading ? (
              <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider text-xs bg-white border border-slate-200">Loading ledger data...</div>
            ) : !Object.keys(groupedData).length ? (
              <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider text-xs bg-white border border-slate-200">No unclaimed records registered for the selected date.</div>
            ) : (
              Object.entries(groupedData).map(([userKey, items]) => {
                const groupBetTotal = items.reduce((sum, item) => sum + parseFloat(item.betAmount ?? item.amount ?? item.gross ?? 0), 0);
                const groupWinTotal = items.reduce((sum, item) => sum + parseFloat(item.winAmount ?? 0), 0);
                return (
                  <div key={userKey} id={`supervisor-card-${userKey}`} className="mb-4 bg-white border border-slate-200 overflow-hidden shadow-xs">

                    <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 font-black text-[#002B66] text-xs uppercase tracking-wider font-mono flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <UserCheck size={14} className="text-[#002B66] shrink-0" />
                        <span className="truncate">Supervisor / Outlet: {userKey}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] bg-blue-100 text-[#002B66] px-2 py-0.5 rounded shrink-0">{items.length} items</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onCopySupervisorImage) onCopySupervisorImage(userKey);
                          }}
                          disabled={isCapturingImage === userKey}
                          className="flex items-center gap-1.5 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] text-[10px] font-black px-2.5 py-1 rounded-md shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0"
                          title={`Copy ${userKey} table as image`}
                        >
                          {isCapturingImage === userKey ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Capturing...</span>
                            </>
                          ) : copiedSupervisorKey === userKey ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span>Image Copied!</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon size={12} />
                              <span>Copy Image</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block w-full overflow-x-auto no-scrollbar">
                      <table className="w-full min-w-[750px] text-left border-collapse bg-white">
                        <thead>
                          <tr className="bg-[#002B66] text-white text-[10px] font-black uppercase tracking-wider">
                            <th className="px-3 py-2.5 border-r border-blue-950 w-[18%]">Teller</th>
                            <th className="px-3 py-2.5 border-r border-blue-950 w-[20%]">Trans. ID</th>
                            <th className="px-3 py-2.5 border-r border-blue-950 w-[18%]">Draw</th>
                            <th className="px-3 py-2.5 border-r border-blue-950 text-center w-[12%]">Bet No.</th>
                            <th className="px-3 py-2.5 border-r border-blue-950 text-center w-[10%]">Code</th>
                            <th className="px-3 py-2.5 border-r border-blue-950 text-right w-[11%]">Bet Amount</th>
                            <th className="px-3 py-2.5 text-right w-[11%]">Win Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
                          {items.map((item, index) => {
                            const meta = getRowMeta(item, index, userKey);

                            return (
                              <tr
                                key={index}
                                className={`transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-amber-50/85 cursor-pointer group border-b border-slate-100 ${
                                  meta.showWarningBadge ? 'bg-rose-50/30 hover:bg-rose-50/80 border-l-4 border-l-rose-500' : ''
                                }`}
                                onClick={() => onRowClick && onRowClick(item, index)}
                                title="Click row to process return"
                              >
                                <td className="px-3 py-3 border-r border-slate-200 font-bold text-slate-800 uppercase text-xs whitespace-nowrap">{meta.displayAccountName}</td>
                                <td className="px-3 py-3 border-r border-slate-200 font-mono text-[#002B66] font-extrabold text-xs group-hover:underline whitespace-nowrap">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span>{meta.transId}</span>
                                      {meta.showWarningBadge && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIncidentReportTicket({
                                              ...item,
                                              computedTransId: meta.transId
                                            });
                                          }}
                                          className="inline-flex items-center justify-center p-1 rounded-md bg-rose-100 hover:bg-rose-600 text-rose-600 hover:text-white transition-all cursor-pointer shadow-2xs shrink-0"
                                          title={`Unclaimed for ${meta.ageDays} days. Click to issue incident report.`}
                                          aria-label="Issue incident report"
                                        >
                                          <AlertTriangle size={12} className="shrink-0" />
                                        </button>
                                      )}
                                    </div>
                                    <ChevronRight size={13} className="text-slate-400 group-hover:text-[#002B66] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                  </div>
                                </td>
                                <td className="px-3 py-3 border-r border-slate-200 font-mono text-xs text-slate-700 font-semibold whitespace-nowrap">{meta.drawFormatted}</td>
                                <td className="px-3 py-3 border-r border-slate-200 text-center font-mono font-bold text-slate-900 text-xs whitespace-nowrap">{meta.betNo}</td>
                                <td className="px-3 py-3 border-r border-slate-200 text-center font-mono font-bold text-slate-700 text-xs whitespace-nowrap">{meta.betCode}</td>
                                <td className="px-3 py-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                                  ₱{meta.betAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-3 text-right font-mono font-extrabold text-emerald-700 text-xs whitespace-nowrap">
                                  ₱{meta.winAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stack */}
                    <div className="block md:hidden p-3 space-y-2.5 bg-slate-50/50">
                      {items.map((item, index) => {
                        const meta = getRowMeta(item, index, userKey);

                        return (
                          <div
                            key={index}
                            onClick={() => onRowClick && onRowClick(item, index)}
                            className={`bg-white border border-slate-200 rounded-xl p-3 shadow-2xs active:scale-[0.99] transition-all space-y-2.5 cursor-pointer relative overflow-hidden ${
                              meta.showWarningBadge ? 'border-l-4 border-l-rose-500' : ''
                            }`}
                          >
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${meta.showWarningBadge ? 'bg-rose-500' : 'bg-[#002B66]'}`}></div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 pl-2">
                              <div>
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Teller</span>
                                <span className="text-xs font-black text-slate-800 uppercase">{meta.displayAccountName}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Trans. ID</span>
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="font-mono text-xs font-bold text-[#002B66]">{meta.transId}</span>
                                  {meta.showWarningBadge && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIncidentReportTicket({
                                          ...item,
                                          computedTransId: meta.transId
                                        });
                                      }}
                                      className="inline-flex items-center justify-center p-1 rounded-md bg-rose-100 hover:bg-rose-600 text-rose-600 hover:text-white transition-all cursor-pointer shadow-2xs shrink-0"
                                      title={`Unclaimed for ${meta.ageDays} days. Click to issue incident report.`}
                                      aria-label="Issue incident report"
                                    >
                                      <AlertTriangle size={12} className="shrink-0" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs pl-2 font-mono">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Draw Schedule</span>
                                <span className="font-semibold text-slate-800 text-[11px]">{meta.drawFormatted}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Bet & Code</span>
                                <span className="font-bold text-slate-900">{meta.betNo} <span className="text-slate-500 font-normal">({meta.betCode})</span></span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1 pl-2 border-t border-slate-100 font-mono">
                              <div>
                                <span className="text-[9px] font-sans font-bold text-slate-400 uppercase block">Bet Amount</span>
                                <span className="text-xs font-bold text-slate-700">
                                  ₱{meta.betAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-sans font-bold text-slate-400 uppercase block">Win Liability</span>
                                <span className="text-xs font-black text-emerald-700">
                                  ₱{meta.winAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-slate-100 px-4 py-2.5 font-black border-t border-slate-200 text-slate-900 text-xs font-mono flex items-center justify-between">
                      <span className="uppercase font-sans tracking-wider text-[11px] text-[#002B66]">Subtotal ({userKey}):</span>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-700 font-bold">Bet: ₱{groupBetTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        <span className="text-emerald-700 font-extrabold">Win: ₱{groupWinTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Incident Report Modal */}
      {incidentReportTicket && (
        <IncidentReportModal
          ticket={incidentReportTicket}
          onClose={() => setIncidentReportTicket(null)}
        />
      )}
    </div>
  );
}
