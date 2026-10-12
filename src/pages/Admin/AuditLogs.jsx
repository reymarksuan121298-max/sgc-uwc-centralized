import { useState, useEffect, useMemo } from 'react';
import { Search, Download, RefreshCw, FileText, X, Eye, Info, Calendar, Ticket, User, DollarSign } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        if (error.code !== 'PGRST205') {
          console.warn('Audit logs fetch notice:', error.message);
        }
        setLogs([]);
        return;
      }
      setLogs(data || []);
    } catch (err) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const isCallLog = log.action === 'VIDEO_CALL_COMPLETED' || 
                        log.target_type === 'VIDEO_CALL' || 
                        String(log.action || '').includes('VIDEO_CALL');
      if (isCallLog) return false;

      const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
      const q = searchQuery.toLowerCase().trim();
      const detailsString = log.details ? JSON.stringify(log.details).toLowerCase() : '';
      const matchSearch = !q || (
        (log.actor_username || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.target_id || '').toLowerCase().includes(q) ||
        (log.sub_office || '').toLowerCase().includes(q) ||
        detailsString.includes(q)
      );
      return matchAction && matchSearch;
    });
  }, [logs, actionFilter, searchQuery]);

  const exportCSV = () => {
    if (!filteredLogs.length) return alert('No audit records to export.');
    const headers = ['Timestamp', 'Actor Username', 'Role', 'Action', 'Target Type', 'Target ID', 'Sub-Office', 'Details'];
    const rows = filteredLogs.map(l => [
      `"${l.created_at}"`,
      `"${l.actor_username}"`,
      `"${l.actor_role}"`,
      `"${l.action}"`,
      `"${l.target_type}"`,
      `"${l.target_id || 'N/A'}"`,
      `"${l.sub_office || 'N/A'}"`,
      `"${l.details ? JSON.stringify(l.details).replace(/"/g, '""') : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('APPROVED') || action.includes('CREATED') || action.includes('VERIFIED')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (action.includes('REJECTED') || action.includes('DELETED')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (action.includes('REQUESTED')) return 'bg-amber-100 text-amber-900 border-amber-300';
    if (action.includes('RETURNED') || action.includes('UPLOADED')) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-purple-100 text-purple-800 border-purple-300';
  };

  const formatTimestamp = (ts) => {
    if (!ts || ts === 'N/A') return 'N/A';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Actor, Trans ID, Teller, Bet No, Branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 focus:border-[#002B66] outline-none"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            <option value="CLAIMED_TICKET_DELETION_REQUESTED">Deletion Requested</option>
            <option value="HARDCOPY_CLAIM_DELETION_APPROVED">Deletion Approved</option>
            <option value="HARDCOPY_CLAIM_DELETION_REJECTED">Deletion Rejected</option>
            <option value="RECORD_DELETED">Record Deleted</option>
            <option value="TICKET_RETURNED">Ticket Returned</option>
            <option value="RECEIPT_UPLOADED">Receipt Uploaded</option>
            <option value="RECEIPT_VERIFIED">Receipt Verified</option>
            <option value="RECEIPT_REJECTED">Receipt Rejected</option>
            <option value="USER_CREATED">User Created</option>
            <option value="USER_UPDATED">User Updated</option>
            <option value="SYSTEM_CONFIG_UPDATED">Config Updated</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-[#002B66] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 shadow-xs overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-[#002B66] text-white text-[11px] font-black uppercase tracking-wider">
                <th className="px-4 py-3 border-r border-blue-900">Timestamp</th>
                <th className="px-4 py-3 border-r border-blue-900">Actor & Role</th>
                <th className="px-4 py-3 border-r border-blue-900">Action</th>
                <th className="px-4 py-3 border-r border-blue-900">Target ID</th>
                <th className="px-4 py-3 border-r border-blue-900">Sub-Office</th>
                <th className="px-4 py-3">Details / Audit Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
                    Loading audit trail...
                  </td>
                </tr>
              ) : !filteredLogs.length ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const details = log.details || {};
                  const hasTicketDetails = Boolean(details.teller_outlet || details.betNo || details.betCode || details.transId);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 border-r border-slate-100 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatTimestamp(log.created_at)}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100">
                        <span className="font-mono font-bold text-slate-900 block">{log.actor_username}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{log.actor_role}</span>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100">
                        <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-black uppercase font-mono ${getActionBadgeColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold text-[#002B66]">
                        {log.target_id || '—'}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-700">
                        {log.sub_office || 'All'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {log.details ? (
                          <div className="flex items-center justify-between gap-2">
                            {hasTicketDetails ? (
                              <div className="truncate text-slate-700 font-medium">
                                <span className="font-bold text-[#002B66]">{details.teller_outlet || 'N/A'}</span>
                                {details.betNo && <span className="text-slate-500 ml-1.5">• Bet #{details.betNo}</span>}
                                {details.winAmount != null && (
                                  <span className="text-emerald-700 font-bold ml-1.5">
                                    • ₱{parseFloat(details.winAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="max-w-[240px] truncate block text-slate-500">
                                {JSON.stringify(log.details)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-[#002B66] border border-blue-200 rounded transition-colors shrink-0 cursor-pointer"
                              title="View full audit payload details"
                            >
                              <Eye size={11} />
                              <span>View</span>
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="bg-[#002B66] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs">
                <FileText size={16} className="text-[#FFD700]" />
                <span>Audit Log Details • {selectedLog.action.replace(/_/g, ' ')}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Core Audit Meta */}
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Actor</span>
                  <span className="font-bold text-slate-800">{selectedLog.actor_username} ({selectedLog.actor_role})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Timestamp</span>
                  <span className="font-mono text-slate-700">{formatTimestamp(selectedLog.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Target ID</span>
                  <span className="font-mono font-bold text-[#002B66]">{selectedLog.target_id || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Sub-Office</span>
                  <span className="font-bold text-slate-800">{selectedLog.sub_office || 'All'}</span>
                </div>
              </div>

              {/* Returned Ticket Details (The 8 requested attributes) */}
              {selectedLog.details && (selectedLog.details.teller_outlet || selectedLog.details.transId || selectedLog.details.betNo) ? (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-extrabold uppercase text-[#002B66] tracking-wider flex items-center gap-1.5">
                    <Ticket size={13} className="text-[#002B66]" />
                    <span>Returned Winnings Ticket Specification</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-xs font-mono">
                    <div className="flex justify-between items-center px-3.5 py-2 bg-slate-50">
                      <span className="font-sans font-bold text-slate-600">Teller / Outlet</span>
                      <span className="font-bold text-slate-900 uppercase">{selectedLog.details.teller_outlet || selectedLog.details.fullName || selectedLog.details.outlet || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center px-3.5 py-2">
                      <span className="font-sans font-bold text-slate-600">Trans. ID</span>
                      <span className="font-bold text-[#002B66]">{selectedLog.details.transId || selectedLog.target_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center px-3.5 py-2 bg-slate-50">
                      <span className="font-sans font-bold text-slate-600">Draw</span>
                      <span className="text-slate-800">{selectedLog.details.draw || selectedLog.details.drawTime || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center px-3.5 py-2">
                      <span className="font-sans font-bold text-slate-600">Bet No.</span>
                      <span className="font-bold text-slate-900">{selectedLog.details.betNo || selectedLog.details.bet_no || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center px-3.5 py-2 bg-slate-50">
                      <span className="font-sans font-bold text-slate-600">Bet Code</span>
                      <span className="text-slate-700">{selectedLog.details.betCode || selectedLog.details.bet_code || 'RS3'}</span>
                    </div>
                    <div className="flex justify-between items-center px-3.5 py-2">
                      <span className="font-sans font-bold text-slate-600">Bet Amount</span>
                      <span className="font-bold text-slate-900">₱{parseFloat(selectedLog.details.betAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center px-3.5 py-2 bg-slate-50">
                      <span className="font-sans font-bold text-slate-600">Win Amount</span>
                      <span className="font-black text-emerald-700">₱{parseFloat(selectedLog.details.winAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center px-3.5 py-2">
                      <span className="font-sans font-bold text-slate-600">Date Returned</span>
                      <span className="text-slate-700">{formatTimestamp(selectedLog.details.dateReturned || selectedLog.details.date_returned)}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Additional Context Attributes (Reason, Requester, Approver, etc.) */}
              {selectedLog.details && (selectedLog.details.reason || selectedLog.details.rejectReason || selectedLog.details.requestedBy || selectedLog.details.approvedBy) && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-[11px]">
                  {selectedLog.details.requestedBy && (
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">Requested By:</span>
                      <span className="font-semibold text-slate-800">{selectedLog.details.requestedBy}</span>
                    </div>
                  )}
                  {selectedLog.details.approvedBy && (
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">Approved By:</span>
                      <span className="font-semibold text-emerald-800">{selectedLog.details.approvedBy}</span>
                    </div>
                  )}
                  {selectedLog.details.reason && (
                    <div className="pt-1 border-t border-amber-200/60">
                      <span className="font-bold text-slate-600 block">Deletion Request Reason:</span>
                      <p className="text-slate-800 font-medium mt-0.5">{selectedLog.details.reason}</p>
                    </div>
                  )}
                  {selectedLog.details.rejectReason && (
                    <div className="pt-1 border-t border-amber-200/60">
                      <span className="font-bold text-rose-700 block">Rejection Reason:</span>
                      <p className="text-rose-900 font-medium mt-0.5">{selectedLog.details.rejectReason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Raw JSON Payload */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Raw JSON Payload</span>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold uppercase text-[11px] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

