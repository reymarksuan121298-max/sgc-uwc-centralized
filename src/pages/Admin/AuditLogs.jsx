import { useState, useEffect, useMemo } from 'react';
import { Search, Download, RefreshCw } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

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
      const matchSearch = !q || (
        (log.actor_username || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.target_id || '').toLowerCase().includes(q) ||
        (log.sub_office || '').toLowerCase().includes(q)
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
    if (action.includes('CREATED') || action.includes('VERIFIED')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (action.includes('REJECTED') || action.includes('DELETED')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (action.includes('RETURNED') || action.includes('UPLOADED')) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-purple-100 text-purple-800 border-purple-300';
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
              placeholder="Search by Actor, Trans ID, Action, Branch..."
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
      <div className="bg-white border border-slate-200 shadow-xs overflow-hidden">
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
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border-r border-slate-100 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
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
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
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
