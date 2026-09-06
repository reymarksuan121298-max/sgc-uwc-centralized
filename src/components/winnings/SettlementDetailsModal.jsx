import { useEffect, useState } from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { openSettlementAgreementPrint } from '../../utils/settlementAgreementPrint';
import { supabase } from '../../config/supabaseClient';

export default function SettlementDetailsModal({ isOpen, onClose, item, onDataUpdated }) {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchPayments = async () => {
      if (!isOpen || !item?.id) {
        setPayments([]);
        return;
      }
      const { data, error } = await supabase
        .from('settlement_payments')
        .select('*')
        .eq('returnedWinningsId', item.id)
        .order('paymentDate', { ascending: false });

      if (!isMounted) return;
      if (!error) {
        setPayments(data || []);
      }
    };
    fetchPayments();
    return () => { isMounted = false; };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const parseSettlementTerms = (terms) => {
    if (!terms) return null;
    try {
      return typeof terms === 'string' ? JSON.parse(terms) : terms;
    } catch {
      return null;
    }
  };

  const parsedTerms = parseSettlementTerms(item.settlementTerms || item.settlement_terms);
  
  const paidAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.paymentAmount || 0), 0);

  const getFrequencyLabel = (freq) => {
    switch (freq) {
      case 'semi-monthly':
      case '15_30': return 'Semi-Monthly (Every 15th & 30th)';
      case 'weekly': return 'Weekly';
      case 'daily': return 'Daily';
      case 'monthly': return 'Monthly';
      default: return 'Weekly';
    }
  };

  const hrManagerName = parsedTerms?.signatories?.hrManager || 'Authorized HR / Management';
  const supervisorName = parsedTerms?.signatories?.supervisor || 'Sales Supervisor';
  const claimantName = item.fullName || item.username || parsedTerms?.signatories?.claimant || 'Accountable Payer';
  const agreementDate = parsedTerms?.agreementDate || item.agreementDate || item.updated_at || item.created_at;
  const reason = parsedTerms?.reason || item.reason || 'No reason provided';
  const frequency = parsedTerms?.frequency || 'weekly';
  const installments = parsedTerms?.installments || [];

  const formatTransactionDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) return dateString; 
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };


  const handlePrint = () => {
    openSettlementAgreementPrint();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-200">
          <div>
            <h3 className="font-black text-[#002B66] uppercase tracking-wider flex items-center gap-2">
              Settlement Agreement Details
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold">{item.transactionId || 'Selected agreement'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg p-2 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          
          <div className="flex justify-end gap-2 mb-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-[#002B66] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#FFD700] shadow-sm transition-all hover:bg-blue-900"
            >
              <Printer size={14} /> Print Form
            </button>
          </div>

          <div id="settlement-agreement-print-area" className="bg-white border border-slate-300 rounded-xl shadow-md p-6 sm:p-8 w-full print:w-full print:max-w-none print:rounded-none print:border-none print:shadow-none print:p-0 space-y-6 text-slate-900 font-sans">
            
            {/* HEADER WITH LOGOS */}
            <div className="flex justify-between items-center border-b-2 border-[#002B66] pb-1">
              <div className="flex items-center gap-3">
                <img src="/lbp.png" alt="Lucky Betplay Logo" className="w-12 h-12 object-contain rounded" />
                <div>
                  <h1 className="text-xs font-black text-[#002B66] tracking-wide">CENTRALIZED UNCLAIMED WINNINGS</h1>
                  <p className="text-[9px] text-slate-500 font-semibold">#257 BARLAPS, A.S. FORTUNA STREET, BAKILID, MANDAUE CITY, CEBU 6014</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <img src="/stl.jpg" alt="STL Logo" className="w-10 h-10 object-contain rounded border border-slate-200 shadow-sm" />
              </div>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-sm font-black text-[#002B66] tracking-wider uppercase">SETTLEMENT AGREEMENT</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">UNCLAIMED WINNING & PAYMENT SCHEDULE</p>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              This Settlement Agreement ("Agreement") is made on <strong className="border-b border-slate-400 px-1 font-bold text-slate-900 bg-slate-50">{formatTransactionDate(agreementDate)}</strong> regarding the accountable party's repayment of company liability described below.
            </p>

            {/* 1. DETAILS OF ACCOUNTABILITY */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2">
                1. DETAILS OF ACCOUNTABILITY
              </h3>
              <table className="w-full text-xs border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50 w-1/3">Transaction ID</td>
                    <td className="border border-slate-300 px-3 py-1.5 font-mono font-bold text-slate-900">
                      {item.transactionId || item.transId || item.receipt_no || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50">Transaction Date</td>
                    <td className="border border-slate-300 px-3 py-1.5 font-mono text-slate-900">
                      {formatTransactionDate(item.drawTime || item.drawDate || item.created_at)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50">Winning Combination / Bet No.</td>
                    <td className="border border-slate-300 px-3 py-1.5 font-mono font-bold text-slate-900">
                      {item.betNo || item.CombiNo || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50">Total Winning Amount</td>
                    <td className="border border-slate-300 px-3 py-1.5 font-mono font-extrabold text-emerald-700">
                      PHP {parseFloat(item.winAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. SUMMARY / REASON OF SETTLEMENT */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2">
                2. SUMMARY / REASON FOR SETTLEMENT
              </h3>
              <div className="bg-amber-50/90 border border-amber-300 p-3.5 rounded-xl text-xs space-y-2.5 shadow-sm">
                <p className="font-medium text-slate-800 leading-relaxed block">{reason}</p>
                <p className="text-[10px] text-slate-500 italic border-t border-amber-200 pt-2 mt-2">
                  (The original ticket was lost, damaged, or expired, preventing standard automated terminal validation).
                </p>
              </div>
            </div>

            {/* 3. PAYMENT SCHEDULE & BREAKDOWN */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2">
                3. PAYMENT SCHEDULE & BREAKDOWN
              </h3>
              <p className="text-xs text-slate-700">
                The total winning liability of <span className="font-bold">PHP {parseFloat(item.winAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> will be paid in <span className="font-bold">{installments.length} installments</span> ({getFrequencyLabel(frequency)}) scheduled accordingly below:
              </p>

              <table className="w-full text-xs border-collapse border border-slate-300 text-center">
                <thead>
                  <tr className="bg-[#002B66] text-white font-black text-[11px]">
                    <th className="border border-blue-950 p-2 w-16">Installment #</th>
                    <th className="border border-blue-950 p-2">Due Date</th>
                    <th className="border border-blue-950 p-2">Amount Due (PHP)</th>
                    <th className="border border-blue-950 p-2">Signature / Received By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {installments.length > 0 ? (
                    installments.map((inst, index) => {
                      // Determine status based on payment history if possible, else use saved status
                      let displayStatus = inst.status || '';
                      if (!displayStatus) {
                         const cumulativePayment = payments.reduce((sum, p) => sum + parseFloat(p.paymentAmount || 0), 0);
                         const instTotal = installments.slice(0, index + 1).reduce((sum, p) => sum + parseFloat(p.amountDue || 0), 0);
                         if (cumulativePayment >= instTotal) {
                           displayStatus = 'PAID';
                         }
                      }
                      
                      return (
                        <tr key={inst.id || index} className="odd:bg-white even:bg-slate-50">
                          <td className="border border-slate-300 p-2 font-bold font-mono">{inst.id || index + 1}</td>
                          <td className="border border-slate-300 p-2 font-mono text-xs">{formatTransactionDate(inst.dueDate)}</td>
                          <td className="border border-slate-300 p-2 font-mono font-bold text-emerald-800">
                            {parseFloat(inst.amountDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="border border-slate-300 p-2 font-bold text-[10px] uppercase text-slate-700">
                            {displayStatus === 'PAID' ? <span className="text-emerald-600 flex items-center justify-center gap-1"><CheckCircle size={10} /> PAID</span> : displayStatus || '__________________'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="border border-slate-300 p-4 text-slate-500 italic">No schedule recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. TERMS & ACKNOWLEDGMENT */}
            <div className="space-y-1 text-xs text-slate-700">
              <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2 mb-2">
                4. TERMS & ACKNOWLEDGMENT
              </h3>
              <p>1. Payments shall be remitted strictly according to the schedule specified above.</p>
              <p>
                2. Upon full receipt of the final payment, the entire liability amount of <strong className="font-bold">PHP {parseFloat(item.winAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> shall be deemed fully satisfied and settled.
              </p>
            </div>

            {/* 5. SIGNATURES & ACKNOWLEDGMENT */}
            <div className="space-y-4 pt-4 border-t border-slate-300 break-inside-avoid">
              <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2">
                5. SIGNATURES & ACKNOWLEDGMENT
              </h3>
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                {/* Accountable Payer */}
                <div className="pt-8 space-y-1">
                  <div className="border-b border-slate-900 pb-0 leading-none font-bold uppercase text-slate-900">
                    {claimantName}
                  </div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-600">
                    ACCOUNTABLE PAYER<br />
                    <span className="font-normal normal-case text-slate-500">Signature over Printed Name</span><br />
                    <span className="font-mono mt-1 block">Date: {formatTransactionDate(agreementDate)}</span>
                  </div>
                </div>

                {/* HR / Management */}
                <div className="pt-8 space-y-1">
                  <div className="border-b border-slate-900 pb-0 leading-none font-bold uppercase text-slate-900">
                    {hrManagerName}
                  </div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-600">
                    AUTHORIZED COMPANY REPRESENTATIVE<br />
                    <span className="font-normal normal-case text-slate-500">Company Representative / Signature over Printed Name</span><br />
                    <span className="font-mono mt-1 block">Date: {formatTransactionDate(agreementDate)}</span>
                  </div>
                </div>
              </div>

              {/* Supervisor Witness */}
              <div className="w-1/2 mx-auto pt-4 text-center text-xs">
                <div className="pt-8 space-y-1">
                  <div className="border-b border-slate-900 pb-0 leading-none font-bold uppercase text-slate-900">
                    {supervisorName}
                  </div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-600">
                    SALES SUPERVISOR<br />
                    <span className="font-normal normal-case text-slate-500">Witness / Signature over Printed Name</span><br />
                    <span className="font-mono mt-1 block">Date: {formatTransactionDate(agreementDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
