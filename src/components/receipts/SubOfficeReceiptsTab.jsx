import { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, Search, Filter, CheckCircle2, Clock, XCircle, 
  Eye, Download, RefreshCw, Building2, Smartphone, Landmark, FileText 
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

export default function SubOfficeReceiptsTab({ currentUser }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PENDING', 'VERIFIED', 'REJECTED'
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('remittance_receipts')
        .select('*')
        .order('created_at', { ascending: false });

      // If user belongs to a specific sub-office (not Super Admin or 'All')
      if (currentUser?.sub_office && currentUser.sub_office !== 'All') {
        query = query.eq('sub_office', currentUser.sub_office);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReceipts(data || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [currentUser]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.verification_status === statusFilter;
      const matchChannel = channelFilter === 'ALL' || r.payment_channel === channelFilter;
      
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        (r.batch_serial_no || '').toLowerCase().includes(q) ||
        (r.transactionId || '').toLowerCase().includes(q) ||
        (r.reference_number || '').toLowerCase().includes(q) ||
        (r.sub_office || '').toLowerCase().includes(q) ||
        (r.sender_name || '').toLowerCase().includes(q) ||
        (r.uploaded_by_user || '').toLowerCase().includes(q)
      );

      return matchStatus && matchChannel && matchSearch;
    });
  }, [receipts, statusFilter, channelFilter, searchQuery]);

  const totals = useMemo(() => {
    return filteredReceipts.reduce((acc, r) => {
      const amt = parseFloat(r.remittance_amount || 0);
      acc.totalAmount += amt;
      acc.count += 1;
      if (r.verification_status === 'VERIFIED') acc.verifiedAmount += amt;
      if (r.verification_status === 'PENDING') acc.pendingAmount += amt;
      return acc;
    }, { totalAmount: 0, verifiedAmount: 0, pendingAmount: 0, count: 0 });
  }, [filteredReceipts]);

  const exportCSV = () => {
    if (!filteredReceipts.length) return alert('No receipts to export.');
    const headers = ['SRN / Trans ID', 'Sub-Office', 'Channel', 'Ref No.', 'Amount', 'Date', 'Status', 'Uploaded By', 'Verified By'];
    const rows = filteredReceipts.map(r => [
      `"${r.batch_serial_no || r.transactionId || r.reference_number || 'N/A'}"`,
      `"${r.sub_office}"`,
      `"${r.payment_channel}"`,
      `"${r.reference_number}"`,
      parseFloat(r.remittance_amount || 0).toFixed(2),
      `"${r.receipt_date}"`,
      `"${r.verification_status}"`,
      `"${r.uploaded_by_user}"`,
      `"${r.verified_by || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Remittance_Receipts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'GCASH': return <Smartphone size={14} className="text-blue-600 shrink-0" />;
      case 'CEBUANA': return <Building2 size={14} className="text-amber-600 shrink-0" />;
      case 'BANK_TRANSFER': return <Landmark size={14} className="text-emerald-600 shrink-0" />;
      default: return <FileText size={14} className="text-purple-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none truncate">Total Remittances</p>
            <p className="text-lg font-black font-mono text-slate-900 mt-1.5 leading-tight truncate">
              ₱{totals.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">{totals.count} Submitted Receipts</span>
          </div>
          <div className="p-2.5 bg-slate-100/80 text-[#002B66] rounded-xl shrink-0 border border-slate-200/50"><Receipt size={18} /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none truncate">Verified Payouts</p>
            <p className="text-lg font-black font-mono text-slate-900 mt-1.5 leading-tight truncate">
              ₱{totals.verifiedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">Approved by Admin</span>
          </div>
          <div className="p-2.5 bg-slate-100/80 text-[#002B66] rounded-xl shrink-0 border border-slate-200/50"><CheckCircle2 size={18} /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none truncate">Pending Verification</p>
            <p className="text-lg font-black font-mono text-slate-900 mt-1.5 leading-tight truncate">
              ₱{totals.pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">Under Review</span>
          </div>
          <div className="p-2.5 bg-slate-100/80 text-[#002B66] rounded-xl shrink-0 border border-slate-200/50"><Clock size={18} /></div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search SRN, Ref No, Branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 focus:border-[#002B66] outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending Verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 focus:border-[#002B66] outline-none"
          >
            <option value="ALL">All Channels</option>
            <option value="GCASH">GCash</option>
            <option value="CEBUANA">Cebuana Lhuillier</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH_PALAWAN">Cash / Palawan</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReceipts}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-[#002B66] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Refresh"
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

      {/* Receipts Table */}
      <div className="bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#002B66] text-white text-[11px] font-black uppercase tracking-wider">
                <th className="px-4 py-3 border-r border-blue-900">SRN / Trans ID</th>
                <th className="px-4 py-3 border-r border-blue-900">Sub-Office</th>
                <th className="px-4 py-3 border-r border-blue-900">Payment Channel</th>
                <th className="px-4 py-3 border-r border-blue-900">Reference No.</th>
                <th className="px-4 py-3 border-r border-blue-900 text-right">Amount (₱)</th>
                <th className="px-4 py-3 border-r border-blue-900 text-center">Status</th>
                <th className="px-4 py-3 border-r border-blue-900">Date & Officer</th>
                <th className="px-4 py-3 text-center">Proof Image</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
                    Loading remittance records...
                  </td>
                </tr>
              ) : !filteredReceipts.length ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
                    No remittance receipts found.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/50 transition-colors">
                    <td className="px-4 py-3 border-r border-slate-100 font-mono font-black text-[#002B66]">
                      {item.batch_serial_no || item.transactionId || item.reference_number || 'N/A'}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-900">
                      {item.sub_office}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100">
                      <div className="flex items-center gap-1.5 font-bold">
                        {getChannelIcon(item.payment_channel)}
                        <span>{item.payment_channel.replace('_', ' ')}</span>
                      </div>
                      {item.bank_name && (
                        <span className="text-[10px] text-slate-500 font-normal block">{item.bank_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold text-slate-800">
                      {item.reference_number}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 font-mono font-extrabold text-emerald-700 text-right">
                      ₱{parseFloat(item.remittance_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.verification_status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.verification_status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {item.verification_status === 'VERIFIED' && <CheckCircle2 size={12} />}
                        {item.verification_status === 'PENDING' && <Clock size={12} />}
                        {item.verification_status === 'REJECTED' && <XCircle size={12} />}
                        <span>{item.verification_status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 text-slate-600">
                      <span className="font-semibold">{item.receipt_date}</span>
                      <span className="block text-[10px] text-slate-400">By: {item.uploaded_by_user}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.receipt_image_url ? (
                        <button
                          onClick={() => setSelectedReceipt(item)}
                          className="inline-flex items-center gap-1 bg-blue-50 hover:bg-[#002B66] text-[#002B66] hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View Proof</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No image</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#002B66] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Receipt size={16} className="text-[#FFD700]" />
                <span>Receipt Proof — {selectedReceipt.transactionId}</span>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-300 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="bg-slate-50 rounded-xl p-2 border border-slate-200 flex items-center justify-center max-h-[60vh] overflow-auto">
                <img 
                  src={selectedReceipt.receipt_image_url} 
                  alt="Official Remittance Receipt" 
                  className="rounded-lg object-contain max-h-[50vh] w-full"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] font-sans text-slate-400 uppercase block">Ref Number</span>
                  <span className="font-bold text-[#002B66]">{selectedReceipt.reference_number}</span>
                </div>
                <div>
                  <span className="text-[9px] font-sans text-slate-400 uppercase block">Remittance Amount</span>
                  <span className="font-extrabold text-emerald-700">₱{parseFloat(selectedReceipt.remittance_amount || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-sans text-slate-400 uppercase block">Sub-Office / Channel</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.sub_office} • {selectedReceipt.payment_channel}</span>
                </div>
                <div>
                  <span className="text-[9px] font-sans text-slate-400 uppercase block">Status</span>
                  <span className="font-bold uppercase text-amber-700">{selectedReceipt.verification_status}</span>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="p-2.5 bg-amber-50 rounded-lg text-xs text-amber-900 border border-amber-200">
                  <span className="font-bold block text-[10px] uppercase text-amber-700">Officer Remarks:</span>
                  {selectedReceipt.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
