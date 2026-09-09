import { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, Search, Filter, CheckCircle2, Clock, XCircle, 
  Eye, Download, RefreshCw, Building2, Smartphone, Landmark, FileText, Check, AlertCircle, X 
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { generateRemittanceSerial } from '../../utils/formatters';
import { canApproveDeletionRequests, isAdminRole } from '../../utils/permissions';
import ConfirmPopover from '../common/ConfirmPopover';

export default function SubOfficeReceiptsTab({ currentUser }) {
  const [receipts, setReceipts] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PENDING', 'VERIFIED', 'REJECTED'
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingReceipt, setApprovingReceipt] = useState(null);
  const [toast, setToast] = useState(null);

  const canApprove = canApproveDeletionRequests(currentUser?.role) || isAdminRole(currentUser?.role);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

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

      const [receiptsRes, usersRes] = await Promise.all([
        query,
        supabase.from('app_users').select('username, full_name')
      ]);

      if (usersRes.data) {
        const uMap = {};
        usersRes.data.forEach(u => {
          if (u.username) {
            uMap[u.username.toLowerCase().trim()] = u.full_name;
          }
        });
        setUsersMap(uMap);
      }

      if (receiptsRes.error) throw receiptsRes.error;
      setReceipts(receiptsRes.data || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [currentUser]);

  const getOfficerName = (item) => {
    if (!item) return 'N/A';
    const usernameKey = String(item.uploaded_by_user || '').toLowerCase().trim();
    if (usersMap[usernameKey]) {
      return usersMap[usernameKey];
    }
    if (item.sender_name && item.sender_name.trim() && item.sender_name !== 'System Administrator') {
      return item.sender_name.trim();
    }
    return item.uploaded_by_user || 'N/A';
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.verification_status === statusFilter;
      const matchChannel = channelFilter === 'ALL' || r.payment_channel === channelFilter;
      
      const q = searchQuery.toLowerCase().trim();
      const officer = getOfficerName(r).toLowerCase();
      const matchSearch = !q || (
        (r.batch_serial_no || '').toLowerCase().includes(q) ||
        (r.transactionId || '').toLowerCase().includes(q) ||
        (r.reference_number || '').toLowerCase().includes(q) ||
        (r.sub_office || '').toLowerCase().includes(q) ||
        (r.sender_name || '').toLowerCase().includes(q) ||
        (r.uploaded_by_user || '').toLowerCase().includes(q) ||
        officer.includes(q)
      );

      return matchStatus && matchChannel && matchSearch;
    });
  }, [receipts, statusFilter, channelFilter, searchQuery, usersMap]);

  const totals = useMemo(() => {
    return filteredReceipts.reduce((acc, r) => {
      const gross = parseFloat(r.remittance_amount || 0);
      const charges = parseFloat(r.deposited_charges || 0);
      const net = Math.max(0, gross - charges);

      acc.totalAmount += net;
      acc.grossAmount += gross;
      acc.totalCharges += charges;
      acc.count += 1;

      if (r.verification_status === 'VERIFIED') acc.verifiedAmount += net;
      if (r.verification_status === 'PENDING') acc.pendingAmount += net;
      return acc;
    }, { totalAmount: 0, grossAmount: 0, totalCharges: 0, verifiedAmount: 0, pendingAmount: 0, count: 0 });
  }, [filteredReceipts]);

  const handleApprove = (receipt) => {
    setApprovingReceipt(receipt);
  };

  const executeApprove = async () => {
    if (!approvingReceipt) return;
    const receipt = approvingReceipt;

    const formattedSerial = generateRemittanceSerial(
      receipt.sub_office || 'Mandaue Central',
      receipt.batch_serial_no || receipt.reference_number || receipt.transactionId,
      receipt.created_at || new Date()
    );

    const displayId = formattedSerial || receipt.batch_serial_no || receipt.transactionId || receipt.reference_number || 'Batch';

    setIsProcessing(true);
    try {
      // 1. Update remittance_receipts with verified status & formatted batch_serial_no
      const { error: rErr } = await supabase
        .from('remittance_receipts')
        .update({
          verification_status: 'VERIFIED',
          verified_by: currentUser?.full_name || currentUser?.username || 'Staff',
          verified_at: new Date().toISOString(),
          batch_serial_no: formattedSerial
        })
        .eq('id', receipt.id);

      if (rErr) throw rErr;

      // 2. Update returned_winnings with aligned batch_serial_no and receipt_status: 'VERIFIED'
      if (receipt.batch_serial_no) {
        await supabase
          .from('returned_winnings')
          .update({
            receipt_status: 'VERIFIED',
            batch_serial_no: formattedSerial
          })
          .eq('batch_serial_no', receipt.batch_serial_no);
      }
      if (receipt.transactionId) {
        await supabase
          .from('returned_winnings')
          .update({
            receipt_status: 'VERIFIED',
            batch_serial_no: formattedSerial
          })
          .eq('transactionId', receipt.transactionId);
      }
      if (receipt.reference_number) {
        await supabase
          .from('returned_winnings')
          .update({
            receipt_status: 'VERIFIED',
            batch_serial_no: formattedSerial
          })
          .eq('batch_serial_no', receipt.reference_number);
      }

      // 3. Log into audit trail
      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'user',
        actor_role: currentUser?.role || 'Staff',
        action: 'RECEIPT_VERIFIED',
        target_type: 'RECEIPT',
        target_id: displayId,
        sub_office: receipt.sub_office,
        details: {
          ref: receipt.reference_number,
          amount: receipt.remittance_amount,
          batchSerial: formattedSerial
        }
      }]);

      showToast(`Receipt for ${displayId} marked VERIFIED!`);
      setApprovingReceipt(null);
      if (selectedReceipt && selectedReceipt.id === receipt.id) {
        setSelectedReceipt(prev => ({
          ...prev,
          verification_status: 'VERIFIED',
          batch_serial_no: formattedSerial,
          verified_by: currentUser?.full_name || currentUser?.username || 'Staff',
          verified_at: new Date().toISOString()
        }));
      }
      fetchReceipts();
    } catch (err) {
      console.error('Approve failed:', err);
      showToast(`Failed to approve receipt: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedReceipt) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    const displayId = selectedReceipt.batch_serial_no || selectedReceipt.transactionId || selectedReceipt.reference_number || 'Batch';
    setIsProcessing(true);
    try {
      // 1. Update remittance_receipts
      const { error: rErr } = await supabase
        .from('remittance_receipts')
        .update({
          verification_status: 'REJECTED',
          verified_by: currentUser?.full_name || currentUser?.username || 'Staff',
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', selectedReceipt.id);

      if (rErr) throw rErr;

      // 2. Revert returned_winnings tickets back to UNREMITTED (NO_RECEIPT)
      if (selectedReceipt.batch_serial_no) {
        await supabase
          .from('returned_winnings')
          .update({ 
            receipt_status: 'NO_RECEIPT',
            batch_serial_no: null,
            updated_at: new Date().toISOString()
          })
          .eq('batch_serial_no', selectedReceipt.batch_serial_no);
      } else if (selectedReceipt.transactionId) {
        await supabase
          .from('returned_winnings')
          .update({ 
            receipt_status: 'NO_RECEIPT',
            batch_serial_no: null,
            updated_at: new Date().toISOString()
          })
          .eq('transactionId', selectedReceipt.transactionId);
      }

      // 3. Log audit trail
      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'user',
        actor_role: currentUser?.role || 'Staff',
        action: 'RECEIPT_REJECTED',
        target_type: 'RECEIPT',
        target_id: displayId,
        sub_office: selectedReceipt.sub_office,
        details: {
          reason: rejectionReason.trim(),
          ref: selectedReceipt.reference_number,
          batchSerial: selectedReceipt.batch_serial_no || null
        }
      }]);

      showToast(`Receipt for ${displayId} marked as REJECTED.`);
      setRejectModalOpen(false);
      setRejectionReason('');
      setSelectedReceipt(prev => prev ? ({
        ...prev,
        verification_status: 'REJECTED',
        rejection_reason: rejectionReason.trim(),
        verified_by: currentUser?.full_name || currentUser?.username || 'Staff',
        verified_at: new Date().toISOString()
      }) : null);
      await fetchReceipts();
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportCSV = () => {
    if (!filteredReceipts.length) return alert('No receipts to export.');
    const headers = ['SRN / Trans ID', 'Sub-Office', 'Channel', 'Ref No.', 'Amount', 'Date', 'Status', 'Officer Full Name', 'Uploaded By', 'Verified By'];
    const rows = filteredReceipts.map(r => [
      `"${r.batch_serial_no || r.transactionId || r.reference_number || 'N/A'}"`,
      `"${r.sub_office}"`,
      `"${r.payment_channel}"`,
      `"${r.reference_number}"`,
      parseFloat(r.remittance_amount || 0).toFixed(2),
      `"${r.receipt_date}"`,
      `"${r.verification_status}"`,
      `"${getOfficerName(r)}"`,
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
      case 'CEBUANA': return <Building2 size={14} className="text-rose-600 shrink-0" />;
      case 'BANK_DEPOSIT': return <Landmark size={14} className="text-emerald-600 shrink-0" />;
      case 'BANK_TRANSFER': return <Landmark size={14} className="text-teal-600 shrink-0" />;
      default: return <FileText size={14} className="text-purple-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between min-w-0">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none truncate">Total Net Remittances</p>
            <p className="text-lg font-black font-mono text-slate-900 mt-1.5 leading-tight truncate">
              ₱{totals.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
              {totals.count} Submitted Receipts {totals.totalCharges > 0 && `(Less ₱${totals.totalCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })} charges)`}
            </span>
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
            <option value="BANK_DEPOSIT">Bank Deposit</option>
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
                <th className="px-4 py-3 border-r border-blue-900">Approved By</th>
                <th className="px-4 py-3 text-center">Proof Image</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
                    Loading remittance records...
                  </td>
                </tr>
              ) : !filteredReceipts.length ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
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
                      <span className="font-semibold text-slate-800 block">{item.receipt_date}</span>
                      <span className="block text-xs font-bold text-slate-700 mt-0.5" title={getOfficerName(item)}>
                        By: {getOfficerName(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 text-slate-700">
                      {item.verification_status === 'VERIFIED' ? (
                        <div>
                          <span className="font-bold text-emerald-800 block text-xs flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                            {item.verified_by || 'Admin'}
                          </span>
                          {item.verified_at && (
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(item.verified_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : item.verification_status === 'REJECTED' ? (
                        <div>
                          <span className="font-bold text-rose-700 block text-xs flex items-center gap-1">
                            <XCircle size={11} className="text-rose-500 shrink-0" />
                            {item.verified_by || 'Admin'}
                          </span>
                          <span className="text-[10px] text-rose-500 block italic">Rejected</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Pending</span>
                      )}
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

      {/* Image Preview & Verification Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="bg-[#002B66] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Receipt size={16} className="text-[#FFD700]" />
                <span className="truncate max-w-[320px]">Receipt Proof — {selectedReceipt.batch_serial_no || selectedReceipt.transactionId || selectedReceipt.reference_number || 'Proof'}</span>
              </div>
              <button 
                onClick={() => setSelectedReceipt(null)} 
                className="text-slate-300 hover:text-white cursor-pointer transition-colors p-1 rounded-md hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4 space-y-3 max-h-[82vh] overflow-y-auto">
              
              {/* Top Details Pill Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sub-Office</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.sub_office}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Channel</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.payment_channel}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Amount</span>
                  <span className="font-extrabold text-emerald-700">₱{parseFloat(selectedReceipt.remittance_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className={`inline-flex items-center gap-1 font-black text-[10px] uppercase ${
                    selectedReceipt.verification_status === 'VERIFIED'
                      ? 'text-emerald-700'
                      : selectedReceipt.verification_status === 'REJECTED'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                  }`}>
                    {selectedReceipt.verification_status === 'VERIFIED' && <CheckCircle2 size={11} />}
                    {selectedReceipt.verification_status === 'PENDING' && <Clock size={11} />}
                    {selectedReceipt.verification_status === 'REJECTED' && <XCircle size={11} />}
                    <span>{selectedReceipt.verification_status}</span>
                  </span>
                </div>
              </div>

              {/* Receipt Image Container */}
              <div className="bg-slate-900/5 rounded-xl p-2 border border-slate-200 flex items-center justify-center max-h-[52vh] overflow-auto">
                <img 
                  src={selectedReceipt.receipt_image_url} 
                  alt="Official Remittance Receipt" 
                  className="rounded-lg object-contain max-h-[50vh] w-full"
                />
              </div>

              {/* Officer Remarks */}
              {selectedReceipt.notes && (
                <div className="p-2.5 bg-amber-50/80 rounded-lg text-xs text-amber-900 border border-amber-200">
                  <span className="font-bold block text-[10px] uppercase text-amber-700">Officer Remarks:</span>
                  {selectedReceipt.notes}
                </div>
              )}

              {/* Verified By Banner */}
              {selectedReceipt.verification_status === 'VERIFIED' && (
                <div className="p-2.5 bg-emerald-50 rounded-lg text-xs text-emerald-900 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Verified by {selectedReceipt.verified_by || 'Admin'}</span>
                    {selectedReceipt.verified_at && (
                      <span className="text-[11px] text-emerald-700 ml-1">
                        on {new Date(selectedReceipt.verified_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection Reason Banner */}
              {selectedReceipt.verification_status === 'REJECTED' && selectedReceipt.rejection_reason && (
                <div className="p-2.5 bg-rose-50 rounded-lg text-xs text-rose-900 border border-rose-200 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <XCircle size={14} className="shrink-0" />
                    <span>Rejection Reason:</span>
                  </div>
                  <p className="text-rose-700 text-[11px] pl-5">{selectedReceipt.rejection_reason}</p>
                </div>
              )}

              {/* Verification / Approve & Reject Actions */}
              {canApprove && (
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  {selectedReceipt.verification_status === 'PENDING' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setRejectModalOpen(true)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold rounded-lg border border-rose-200 cursor-pointer transition-colors shadow-2xs"
                      >
                        <XCircle size={14} />
                        <span>Reject Proof</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedReceipt)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all"
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve Proof</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      {selectedReceipt.verification_status === 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(selectedReceipt)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 cursor-pointer transition-colors"
                        >
                          <CheckCircle2 size={13} />
                          <span>Re-Approve</span>
                        </button>
                      )}
                      {selectedReceipt.verification_status === 'VERIFIED' && (
                        <button
                          type="button"
                          onClick={() => setRejectModalOpen(true)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-200 cursor-pointer transition-colors"
                        >
                          <XCircle size={13} />
                          <span>Change to Rejected</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-600 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertCircle size={20} />
              <h4 className="font-black text-sm uppercase">
                Reject Remittance Proof ({selectedReceipt.batch_serial_no || selectedReceipt.transactionId || selectedReceipt.reference_number})
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Please provide a clear reason for rejecting this remittance receipt so the sub-office can correct it:
            </p>
            <textarea
              rows={3}
              required
              placeholder="e.g. Reference number does not match amount in bank slip, or image is blurred."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-rose-600 outline-none resize-none shadow-inner"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={isProcessing || !rejectionReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE REMITTANCE CONFIRM POPOVER */}
      <ConfirmPopover
        isOpen={Boolean(approvingReceipt)}
        title="Verify Remittance Receipt"
        type="success"
        confirmText="Verify & Approve"
        isLoading={isProcessing}
        onCancel={() => setApprovingReceipt(null)}
        onConfirm={executeApprove}
      >
        {approvingReceipt && (
          <div className="space-y-3">
            <p className="text-slate-700 text-xs">
              Are you sure you want to <strong>APPROVE and VERIFY</strong> this remittance proof?
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                <span className="text-slate-500 font-sans font-bold">Reference / SRN:</span>
                <span className="font-black text-[#002B66]">
                  {generateRemittanceSerial(
                    approvingReceipt.sub_office || 'Mandaue Central',
                    approvingReceipt.batch_serial_no || approvingReceipt.reference_number || approvingReceipt.transactionId,
                    approvingReceipt.created_at
                  )}
                </span>
              </div>
              <div className="flex justify-between border-b border-emerald-200/60 pb-1.5">
                <span className="text-slate-500 font-sans font-bold">Sub-Office / Channel:</span>
                <span className="font-bold text-slate-800">{approvingReceipt.sub_office} ({approvingReceipt.payment_channel})</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 font-sans font-bold">Remitted Amount:</span>
                <span className="font-extrabold text-emerald-800 text-sm">
                  ₱{parseFloat(approvingReceipt.remittance_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              This will update the remittance status to VERIFIED and mark all enclosed returned tickets as verified.
            </p>
          </div>
        )}
      </ConfirmPopover>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#002B66] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-blue-400/30 animate-in slide-in-from-bottom-5">
          <Check size={16} className="text-[#FFD700]" />
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}
