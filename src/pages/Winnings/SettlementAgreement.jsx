import { useEffect, useState } from 'react';
import { 
  FileText, 
  Save, 
  Printer, 
  ListOrdered, 
  PlusCircle, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  X, 
  ChevronDown, 
  ChevronUp,
  Building2
} from 'lucide-react';
import { openSettlementAgreementPrint } from '../../utils/settlementAgreementPrint';
import { supabase } from '../../config/supabaseClient';

const getSemiMonthlyDueDate = (startDateStr, installmentIndex) => {
  const date = new Date(`${startDateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';

  let year = date.getFullYear();
  let month = date.getMonth();
  let day = date.getDate();

  let isTarget15 = day <= 15;

  for (let i = 0; i < installmentIndex; i++) {
    if (isTarget15) {
      isTarget15 = false;
    } else {
      isTarget15 = true;
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  }

  const targetYear = year;
  const targetMonth = String(month + 1).padStart(2, '0');
  let targetDay = '15';
  if (!isTarget15) {
    const lastDayOfMonth = new Date(targetYear, month + 1, 0).getDate();
    targetDay = String(Math.min(30, lastDayOfMonth)).padStart(2, '0');
  }

  return `${targetYear}-${targetMonth}-${targetDay}`;
};

const getCalculatedDueDate = (agreementDate, frequency, installmentIndex) => {
  if (frequency === 'semi-monthly' || frequency === '15_30') {
    return getSemiMonthlyDueDate(agreementDate, installmentIndex);
  }

  const date = new Date(`${agreementDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';

  if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + (installmentIndex + 1));
  } else {
    const intervalDays = frequency === 'daily' ? 1 : 7;
    date.setDate(date.getDate() + intervalDays * (installmentIndex + 1));
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const REASON_TEMPLATES = [
  {
    label: 'Non-Compliance & Missing Receipt',
    text: 'The agent did not follow the standard ticket verification policy; the claim was submitted to the office without the original physical receipt, preventing system scanning.'
  },
  {
    label: 'Faded Receipt & System Invalidation',
    text: 'The winning receipt was faded and illegible when forwarded to the office, was misplaced, and could not be validated in the terminal system.'
  },
  {
    label: 'Forgot to Scan & No Receipt',
    text: 'The agent failed to scan the winning ticket on time, and no original physical receipt was presented for terminal verification.'
  }
];

const getFrequencyLabel = (freq) => {
  switch (freq) {
    case 'semi-monthly':
    case '15_30':
      return 'Semi-Monthly (Every 15th & 30th)';
    case 'weekly':
      return 'Weekly';
    case 'daily':
      return 'Daily';
    case 'monthly':
      return 'Monthly';
    default:
      return 'Weekly';
  }
};

const createInstallmentRows = ({
  count,
  amountPerInstallment,
  winAmount,
  agreementDate,
  frequency = 'weekly',
  preserveExisting = false,
  existingRows = []
}) => {
  const winAmt = parseFloat(winAmount) || 5000;
  const customAmt = parseFloat(amountPerInstallment);
  let finalCount = parseInt(count, 10);

  if (!isNaN(customAmt) && customAmt > 0) {
    finalCount = Math.max(1, Math.ceil(winAmt / customAmt));
  } else if (isNaN(finalCount) || finalCount <= 0) {
    finalCount = 10;
  }

  finalCount = Math.min(100, Math.max(1, finalCount));

  let remaining = winAmt;
  const defaultAmount = (winAmt / finalCount).toFixed(2);

  return Array.from({ length: finalCount }, (_, index) => {
    let rowAmount;
    if (preserveExisting && existingRows[index]?.amountDue !== undefined && existingRows[index]?.amountDue !== '') {
      rowAmount = existingRows[index].amountDue;
    } else if (!isNaN(customAmt) && customAmt > 0) {
      if (index === finalCount - 1 && remaining <= customAmt) {
        rowAmount = Math.max(0, remaining).toFixed(2);
      } else {
        rowAmount = customAmt.toFixed(2);
        remaining -= customAmt;
      }
    } else {
      rowAmount = defaultAmount;
    }

    return {
      id: index + 1,
      dueDate: getCalculatedDueDate(agreementDate, frequency, index) || existingRows[index]?.dueDate || '',
      amountDue: rowAmount,
      status: existingRows[index]?.status || ''
    };
  });
};

export default function SettlementAgreement({ filteredData = [], onSaveAgreement, initialTicketId = '', currentUser = null }) {
  // Main Tab State for Sub-navigation ('create' or 'list')
  const [activeSubTab, setActiveSubTab] = useState('create');
  const [currentStep, setCurrentStep] = useState(1);

  // Sub-Office Scoping State
  const [dbSubOffices, setDbSubOffices] = useState([]);
  const [selectedSubOfficeFilter, setSelectedSubOfficeFilter] = useState(() => {
    return currentUser?.sub_office && currentUser.sub_office !== 'All' ? currentUser.sub_office : 'ALL';
  });

  useEffect(() => {
    const fetchSubOffices = async () => {
      try {
        const { data } = await supabase.from('sub_offices').select('*').order('name', { ascending: true });
        if (data) setDbSubOffices(data);
      } catch (err) {
        console.warn('Failed to load sub-offices for settlements:', err);
      }
    };
    fetchSubOffices();

    const channel = supabase
      .channel('settlement_sub_offices_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_offices' }, () => {
        fetchSubOffices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered available tickets based on sub-office scope
  const availableTickets = filteredData.filter((item) => {
    // Hide tickets that are already under settlement
    if (item.isUnderSettlement) return false;

    if (selectedSubOfficeFilter === 'ALL') return true;
    const itemOffice = (item.sub_office || item.subOffice || item.branch || '').toLowerCase().trim();
    const targetOffice = selectedSubOfficeFilter.toLowerCase().trim();
    return itemOffice === targetOffice || (targetOffice.includes('mandaue') && (!itemOffice || itemOffice === 'all'));
  });

  const [paymentsByAgreement, setPaymentsByAgreement] = useState({});
  const [expandedAgreementId, setExpandedAgreementId] = useState(null);
  const [paymentModalItem, setPaymentModalItem] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedBy, setReceivedBy] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Settlement agreements fetched from settlement_agreements table
  const [savedAgreementsList, setSavedAgreementsList] = useState([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(false);

  // States for Editable Form
  const [selectedTicketId, setSelectedTicketId] = useState(initialTicketId || '');
  const [agreementDate, setAgreementDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState(REASON_TEMPLATES[0].text);
  const [installmentsCount, setInstallmentsCount] = useState(10);
  const [customAmount, setCustomAmount] = useState('500');
  const [frequency, setFrequency] = useState('weekly');

  // States for Editable Signatories
  const [hrManagerName, setHrManagerName] = useState('Authorized HR / Management');
  const [supervisorName, setSupervisorName] = useState('Sales Supervisor');
  
  const [installments, setInstallments] = useState(() =>
    createInstallmentRows({
      count: 10,
      amountPerInstallment: '500',
      winAmount: parseFloat(availableTickets[0]?.winAmount || filteredData[0]?.winAmount || 5000),
      agreementDate: new Date().toISOString().split('T')[0],
      frequency: 'weekly'
    })
  );

  // Find selected ticket from availableTickets / filteredData
  const selectedTicket = availableTickets.find(
    (item) => (item.transactionId || item.transId || item.receipt_no) === selectedTicketId
  ) || availableTickets[0] || filteredData[0] || {
    transactionId: '081628-OIIIRA0CN',
    drawDate: '2026-08-16',
    drawTime: '5:00 PM',
    betNo: '784',
    winAmount: 5000.00,
    username: 'sample_user',
    fullName: 'Sample Claimant',
    sub_office: 'Mandaue Central'
  };

  const ticketSubOffice = selectedTicket.sub_office || selectedTicket.subOffice || selectedTicket.branch || (selectedSubOfficeFilter !== 'ALL' ? selectedSubOfficeFilter : (currentUser?.sub_office || 'Mandaue Central'));

  const getSelectedTicketId = (ticket) => ticket?.transactionId || ticket?.transId || ticket?.receipt_no || '';
  const getWinAmount = (ticket) => parseFloat(ticket?.winAmount || 5000);

  // Helper function to format date cleanly in English
  const formatTransactionDate = (dateString) => {
    if (!dateString) return 'August 16, 2026';
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

  // Handler for custom payment amount changes (weekly / periodic payment)
  const handleAmountChange = (value) => {
    setCustomAmount(value);
    const winAmt = getWinAmount(selectedTicket);
    const amt = parseFloat(value);
    if (!isNaN(amt) && amt > 0) {
      const computedCount = Math.min(100, Math.max(1, Math.ceil(winAmt / amt)));
      setInstallmentsCount(computedCount);
      setInstallments(createInstallmentRows({
        count: computedCount,
        amountPerInstallment: value,
        winAmount: winAmt,
        agreementDate,
        frequency
      }));
    }
  };

  // Handler for total number of installments change
  const handleInstallmentCountChange = (count) => {
    const nextCount = parseInt(count, 10) || 1;
    const winAmt = getWinAmount(selectedTicket);
    setInstallmentsCount(nextCount);
    const perInst = (winAmt / nextCount).toFixed(2);
    setCustomAmount(perInst);
    setInstallments(createInstallmentRows({
      count: nextCount,
      amountPerInstallment: perInst,
      winAmount: winAmt,
      agreementDate,
      frequency
    }));
  };

  const handleFrequencyChange = (nextFrequency) => {
    setFrequency(nextFrequency);
    setInstallments(createInstallmentRows({
      count: installmentsCount,
      amountPerInstallment: customAmount,
      winAmount: getWinAmount(selectedTicket),
      agreementDate,
      frequency: nextFrequency,
      preserveExisting: true,
      existingRows: installments
    }));
  };

  const handleAgreementDateChange = (nextAgreementDate) => {
    setAgreementDate(nextAgreementDate);
    setInstallments(createInstallmentRows({
      count: installmentsCount,
      amountPerInstallment: customAmount,
      winAmount: getWinAmount(selectedTicket),
      agreementDate: nextAgreementDate,
      frequency,
      preserveExisting: true,
      existingRows: installments
    }));
  };

  const handleTicketChange = (ticketId) => {
    const nextTicket = availableTickets.find((item) => getSelectedTicketId(item) === ticketId) || selectedTicket;
    setSelectedTicketId(ticketId);
    const winAmt = getWinAmount(nextTicket);
    const perInst = (winAmt / installmentsCount).toFixed(2);
    setCustomAmount(perInst);
    setInstallments(createInstallmentRows({
      count: installmentsCount,
      amountPerInstallment: perInst,
      winAmount: winAmt,
      agreementDate,
      frequency
    }));
  };

  // Handler for updating a single installment row
  const handleRowChange = (index, field, value) => {
    const updated = [...installments];
    updated[index][field] = value;
    setInstallments(updated);
  };

  const handleSave = () => {
    if (onSaveAgreement) {
      const totalAmountVal = installments.reduce((sum, item) => sum + parseFloat(item.amountDue || 0), 0);
      const chosenSubOffice = selectedTicket.sub_office || selectedTicket.subOffice || (selectedSubOfficeFilter !== 'ALL' ? selectedSubOfficeFilter : (currentUser?.sub_office || 'Mandaue Central'));
      
      onSaveAgreement({
        transactionId: selectedTicket.transactionId || selectedTicket.transId || selectedTicket.receipt_no,
        ticket: { ...selectedTicket, sub_office: chosenSubOffice },
        sub_office: chosenSubOffice,
        agreementDate,
        reason,
        frequency,
        customAmount,
        installmentsCount: installments.length,
        installments,
        signatories: {
          claimant: selectedTicket.fullName || selectedTicket.username || 'Accountable Payer',
          hrManager: hrManagerName,
          supervisor: supervisorName
        },
        isUnderSettlement: true,
        settlementTerms: JSON.stringify({ 
          reason, 
          frequency, 
          sub_office: chosenSubOffice,
          installmentsCount: installments.length, 
          installments 
        }),
        totalInstallmentAmount: totalAmountVal,
        settlementStatus: 'PENDING'
      });
    } else {
      console.warn('onSaveAgreement callback is not provided!');
    }
  };

  const handlePrint = () => {
    openSettlementAgreementPrint();
  };

  // Helper to parse settlementTerms JSONB (stored on returned_winnings)
  const parseSettlementTerms = (terms) => {
    if (!terms) return null;
    try {
      return typeof terms === 'string' ? JSON.parse(terms) : terms;
    } catch {
      return null;
    }
  };

  // Fetch settlement tickets from returned_winnings where isUnderSettlement = true
  useEffect(() => {
    let isMounted = true;
    const fetchAgreements = async () => {
      setIsLoadingAgreements(true);
      try {
        let query = supabase
          .from('returned_winnings')
          .select('*')
          .eq('isUnderSettlement', true)
          .order('created_at', { ascending: false });

        if (selectedSubOfficeFilter !== 'ALL') {
          query = query.eq('sub_office', selectedSubOfficeFilter);
        }

        const { data, error } = await query;
        if (!isMounted) return;
        if (error) {
          console.warn('Failed to load settlement tickets:', error.message);
        } else {
          setSavedAgreementsList(data || []);
        }
      } catch (err) {
        console.warn('Failed to load settlement tickets:', err);
      } finally {
        if (isMounted) setIsLoadingAgreements(false);
      }
    };

    fetchAgreements();

    // Realtime subscription on returned_winnings
    const channel = supabase
      .channel('settlement_returned_winnings_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returned_winnings' }, () => {
        fetchAgreements();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedSubOfficeFilter]);

  // Fetch payment history for visible agreements
  const displayedAgreementIds = savedAgreementsList.map((item) => item.id).filter(Boolean);
  const displayedAgreementIdsKey = displayedAgreementIds.join(',');

  useEffect(() => {
    let isMounted = true;

    const fetchPayments = async () => {
      const agreementIds = displayedAgreementIdsKey ? displayedAgreementIdsKey.split(',') : [];
      if (!agreementIds.length) {
        setPaymentsByAgreement({});
        return;
      }

      setIsLoadingPayments(true);
      setPaymentError('');
      const { data, error } = await supabase
        .from('settlement_payments')
        .select('*')
        .in('returnedWinningsId', agreementIds)
        .order('paymentDate', { ascending: false });

      if (!isMounted) return;
      if (error) {
        setPaymentError(`Unable to load payment history: ${error.message}`);
        setIsLoadingPayments(false);
        return;
      }

      setPaymentsByAgreement((data || []).reduce((payments, payment) => {
        const agreementPayments = payments[payment.returnedWinningsId] || [];
        payments[payment.returnedWinningsId] = [...agreementPayments, payment];
        return payments;
      }, {}));
      setIsLoadingPayments(false);
    };

    fetchPayments();
    return () => { isMounted = false; };
  }, [displayedAgreementIdsKey]);

  const getPaymentSummary = (item) => {
    const payments = paymentsByAgreement[item.id] || [];
    const paidAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.paymentAmount || 0), 0);
    // All amounts come from returned_winnings camelCase fields
    const totalAmount = parseFloat(item.totalInstallmentAmount || item.winAmount || 0);
    const status = paidAmount >= totalAmount && totalAmount > 0
      ? 'FULLY PAID'
      : paidAmount > 0
        ? 'PARTIAL'
        : item.settlementStatus || 'PENDING';
    return { payments, paidAmount, remainingAmount: Math.max(totalAmount - paidAmount, 0), totalAmount, status };
  };

  const openPaymentForm = (item) => {
    setPaymentModalItem(item);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReceivedBy('');
    setPaymentNotes('');
    setPaymentError(item.id ? '' : 'This agreement has no database ID, so a payment cannot be recorded.');
  };

  const handlePaymentSave = async (event) => {
    event.preventDefault();
    if (isSavingPayment) return;
    if (!paymentModalItem?.id) {
      setPaymentError('This agreement has no database ID, so a payment cannot be recorded.');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Enter a payment amount greater than zero.');
      return;
    }
    if (!paymentDate) {
      setPaymentError('Select a payment date.');
      return;
    }

    setIsSavingPayment(true);
    setPaymentError('');
    const { error } = await supabase.from('settlement_payments').insert([{
      returnedWinningsId: paymentModalItem.id,
      paymentAmount: amount.toFixed(2),
      paymentDate: `${paymentDate}T00:00:00.000Z`,
      receivedBy: receivedBy.trim() || null,
      notes: paymentNotes.trim() || null
    }]);

    if (error) {
      setPaymentError(`Unable to save payment: ${error.message}`);
      setIsSavingPayment(false);
      return;
    }

    const { paidAmount, totalAmount } = getPaymentSummary(paymentModalItem);
    const updatedPaidAmount = paidAmount + amount;
    const settlementStatus = updatedPaidAmount >= totalAmount && totalAmount > 0 ? 'FULLY PAID' : 'PARTIAL';
    // Update settlementStatus on the returned_winnings row directly
    const { error: statusError } = await supabase
      .from('returned_winnings')
      .update({ settlementStatus })
      .eq('id', paymentModalItem.id);

    if (statusError) {
      setPaymentError(`Payment saved, but settlement status could not be updated: ${statusError.message}`);
      setIsSavingPayment(false);
      return;
    }

    const { data: refreshedPayments, error: refreshError } = await supabase
      .from('settlement_payments')
      .select('*')
      .eq('returnedWinningsId', paymentModalItem.id)
      .order('paymentDate', { ascending: false });
    if (refreshError) {
      setPaymentError(`Payment saved, but payment history could not be refreshed: ${refreshError.message}`);
      setIsSavingPayment(false);
      return;
    }

    setPaymentsByAgreement((current) => ({ ...current, [paymentModalItem.id]: refreshedPayments || [] }));
    setPaymentModalItem(null);
    setIsSavingPayment(false);
  };

  const steps = [
    { number: 1, label: 'Select Ticket' },
    { number: 2, label: 'Agreement Details' },
    { number: 3, label: 'Payment Schedule' },
    { number: 4, label: 'Review & Actions' }
  ];

  return (
    <div className="space-y-4 w-full pb-12 print:max-w-none print:pb-0 print:space-y-0">
      
      {/* SUB-TABS NAVIGATION & SUB-OFFICE FILTER (Hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'create'
                ? 'bg-[#002B66] text-[#FFD700] shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <PlusCircle size={16} />
            <span>Create Agreement</span>
          </button>

          <button
            onClick={() => setActiveSubTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'list'
                ? 'bg-[#002B66] text-[#FFD700] shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ListOrdered size={16} />
            <span>Saved Agreements List</span>
            {savedAgreementsList.length > 0 && (
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-mono">
                {savedAgreementsList.length}
              </span>
            )}
          </button>
        </div>

        {/* Sub-Office Filter Dropdown */}
        {(!currentUser?.sub_office || currentUser.sub_office === 'All') && dbSubOffices.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-2xs">
            <Building2 size={15} className="text-[#002B66] shrink-0" />
            <span className="text-[10px] font-black uppercase text-slate-400">Sub-Office Scope:</span>
            <select
              value={selectedSubOfficeFilter}
              onChange={(e) => setSelectedSubOfficeFilter(e.target.value)}
              className="bg-transparent font-bold text-[#002B66] outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Sub-Offices ({dbSubOffices.length})</option>
              {dbSubOffices.map((so) => (
                <option key={so.id || so.name} value={so.name}>
                  {so.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* CONDITIONAL RENDERING BASED ON ACTIVE SUB-TAB */}
      {activeSubTab === 'list' ? (
        /* SAVED AGREEMENTS LIST VIEW */
        <div className="space-y-4 print:block">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#002B66] text-[#FFD700] p-2 rounded-lg">
                <ListOrdered size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black text-[#002B66] uppercase tracking-wider">Saved Settlement Agreements</h3>
                <p className="text-[11px] text-slate-500 font-semibold">List of recorded settlement agreements retrieved from the database.</p>
              </div>
            </div>
            {paymentError && !paymentModalItem && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{paymentError}</p>
            )}
          </div>

          {savedAgreementsList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Saved Agreements Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No database records are currently tagged with <code className="text-blue-600 font-mono">isUnderSettlement = true</code> or settlement terms. Create and save an agreement first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedAgreementsList.map((item, index) => {
                // All data comes from returned_winnings; nested settlement info is in settlementTerms JSONB
                const parsedTerms = parseSettlementTerms(item.settlementTerms);
                const { payments, paidAmount, remainingAmount, status } = getPaymentSummary(item);
                const agreementKey = item.id || item.transactionId || index;
                const isExpanded = expandedAgreementId === agreementKey;

                return (
                  <div key={agreementKey} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-blue-50 text-[#002B66] border border-blue-200 font-mono font-bold px-2.5 py-1 rounded-lg text-xs">
                          {item.transactionId}
                        </span>
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 font-sans font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase flex items-center gap-1">
                          <Building2 size={11} className="text-amber-700" />
                          {item.sub_office || 'Mandaue Central'}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          Accountable Payer: <span className="text-slate-900">{item.fullName || item.username || 'N/A'}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`${status === 'FULLY PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'} border px-2.5 py-1 rounded-lg text-[10px] font-black uppercase`}>
                          {status}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1">
                          <Calendar size={12} /> {formatTransactionDate(parsedTerms?.agreementDate || item.updated_at || item.created_at)}
                        </span>
                        <button type="button" onClick={() => setExpandedAgreementId(isExpanded ? null : agreementKey)} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#002B66] hover:bg-blue-100 cursor-pointer">
                          {isExpanded ? 'Hide Details' : 'View Details'} {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Reason</span>
                        <p className="font-medium text-slate-800 line-clamp-2">
                          {parsedTerms?.reason || 'No reason provided'}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Total Amount</span>
                        <p className="font-mono font-bold text-emerald-700 text-sm">
                          ₱{parseFloat(item.totalInstallmentAmount || item.winAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase block">Payment Terms</span>
                        <p className="font-medium text-slate-700">{Array.isArray(parsedTerms?.installments) ? parsedTerms.installments.length : (parsedTerms?.installmentsCount || 0)} Terms Scheduled</p>
                      </div>
                    </div>

                    {isExpanded && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-y border-slate-100 py-3 text-xs">
                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase">Paid to Date</span>
                        <span className="font-mono font-bold text-emerald-700">PHP {paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase">Remaining Balance</span>
                        <span className="font-mono font-bold text-[#002B66]">PHP {remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-end justify-start sm:justify-end">
                        <button
                          type="button"
                          onClick={() => openPaymentForm(item)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#002B66] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#FFD700] shadow-sm transition-all hover:bg-blue-900 cursor-pointer"
                        >
                          <CreditCard size={14} /> Record Payment
                        </button>
                      </div>
                    </div>}

                    {isExpanded && <div className="space-y-2">
                      <h4 className="text-[11px] font-black text-[#002B66] uppercase tracking-wider">Payment History</h4>
                      {isLoadingPayments ? (
                        <p className="text-xs text-slate-500">Loading payment history...</p>
                      ) : payments.length === 0 ? (
                        <p className="text-xs text-slate-500">No payments recorded yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse border border-slate-200">
                            <thead><tr className="bg-slate-100 text-left text-[10px] font-bold text-slate-700"><th className="border border-slate-200 p-1.5">Date</th><th className="border border-slate-200 p-1.5">Amount</th><th className="border border-slate-200 p-1.5">Received By</th><th className="border border-slate-200 p-1.5">Notes</th></tr></thead>
                            <tbody>{payments.map((payment) => <tr key={payment.id} className="hover:bg-slate-50"><td className="border border-slate-200 p-1.5 font-mono">{formatTransactionDate(payment.paymentDate)}</td><td className="border border-slate-200 p-1.5 font-mono font-bold text-emerald-700">PHP {parseFloat(payment.paymentAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td><td className="border border-slate-200 p-1.5">{payment.receivedBy || 'N/A'}</td><td className="border border-slate-200 p-1.5">{payment.notes || 'N/A'}</td></tr>)}</tbody>
                          </table>
                        </div>
                      )}
                    </div>}

                  </div>
                );
              })}
            </div>
          )}

          {paymentModalItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:hidden" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
              <form onSubmit={handlePaymentSave} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div><h3 id="payment-modal-title" className="text-sm font-black uppercase tracking-wider text-[#002B66]">Record New Payment</h3><p className="text-xs text-slate-500">{paymentModalItem.transactionId || 'Selected agreement'}</p></div>
                  <button type="button" onClick={() => setPaymentModalItem(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Close form"><X size={18} /></button>
                </div>
                {paymentError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{paymentError}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="space-y-1 font-bold text-slate-700">Payment Amount (₱)<input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono outline-none focus:border-[#002B66]" required /></label>
                  <label className="space-y-1 font-bold text-slate-700">Payment Date<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono outline-none focus:border-[#002B66]" required /></label>
                  <label className="space-y-1 font-bold text-slate-700 sm:col-span-2">Received By<input type="text" value={receivedBy} onChange={(event) => setReceivedBy(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#002B66]" placeholder="e.g. Supervisor / Cashier" /></label>
                  <label className="space-y-1 font-bold text-slate-700 sm:col-span-2">Notes / Details<textarea rows={3} value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#002B66]" placeholder="e.g. Payment for installment #1" /></label>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setPaymentModalItem(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancel</button><button type="submit" disabled={isSavingPayment} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">{isSavingPayment ? 'Saving...' : 'Save Payment'}</button></div>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* CREATE AGREEMENT VIEW */
        <>
          <div className="print:hidden bg-[#002B66] rounded-xl shadow-lg p-4 sm:p-5 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Settlement Processing Workflow</p>
                <h3 className="text-sm font-black uppercase tracking-wider">Agreement Preparation</h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FFD700]">Step {currentStep} of {steps.length}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {steps.map((step) => (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                    currentStep === step.number ? 'bg-[#FFD700] text-[#002B66] shadow-md' : 'bg-white/10 text-blue-100 hover:bg-white/20'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0">{step.number}</span>
                  <span>{step.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Control Panel (Hidden when printing) */}
          <div className="print:hidden bg-white p-4 sm:p-5 rounded-xl border border-blue-100 shadow-md ring-1 ring-blue-100/60 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 text-[#002B66] p-2.5 rounded-lg border border-blue-100">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black text-[#002B66] uppercase tracking-wider">Settlement Agreement Generator</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Complete each section in order before saving or printing.</p>
              </div>
            </div>
            {currentStep === 4 && (
              <div className="flex items-center gap-2">
                <button onClick={handleSave} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95">
                  <Save size={14} />
                  <span>Save Agreement</span>
                </button>
                <button onClick={handlePrint} className="flex items-center gap-1.5 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95">
                  <Printer size={14} />
                  <span>Print Form</span>
                </button>
              </div>
            )}
          </div>

          {/* Selector for Ticket from Returned Winnings */}
          <div className={`${currentStep === 1 ? '' : 'hidden'} print:hidden bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-3 md:items-center justify-between text-xs`}>
            <div>
              <span className="block font-black uppercase tracking-wider text-[#002B66]">1. Select Ticket</span>
              <span className="text-[11px] text-slate-500">Choose the returned winning record for this agreement.</span>
            </div>
            <select
              value={selectedTicketId || (availableTickets[0]?.transactionId || availableTickets[0]?.transId || '')}
              onChange={(e) => handleTicketChange(e.target.value)}
              className="w-full md:w-auto bg-white border border-blue-200 px-3 py-2 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-[#002B66] focus:ring-2 focus:ring-blue-200"
            >
              {availableTickets.length > 0 ? (
                availableTickets.map((item, idx) => {
                  const tid = item.transactionId || item.transId || item.receipt_no || `TID-${idx}`;
                  return (
                    <option key={idx} value={tid}>
                      {tid} - {item.fullName || item.outlet || item.username || 'Accountable Payer'} (₱{parseFloat(item.winAmount || 0).toLocaleString()})
                    </option>
                  );
                })
              ) : (
                <option value="">No returned tickets available (Using Sample)</option>
              )}
            </select>
          </div>

          <div className={`${currentStep === 4 ? '' : 'hidden'} print:hidden bg-white border border-slate-200 rounded-xl shadow-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs`}>
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Ticket Number</span><strong className="font-mono text-[#002B66]">{selectedTicket.transactionId || selectedTicket.transId || selectedTicket.receipt_no}</strong></div>
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Accountable Payer</span><strong>{selectedTicket.fullName || selectedTicket.username || 'Accountable Payer'}</strong></div>
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Frequency & Schedule</span><strong>{installments.length}x ({getFrequencyLabel(frequency)})</strong></div>
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Total Settlement</span><strong className="text-emerald-700">PHP {installments.reduce((sum, item) => sum + parseFloat(item.amountDue || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
          </div>

          {/* PRINTABLE DOCUMENT CONTAINER / STEP CARD CONTAINER */}
          <div id="settlement-agreement-print-area" className={`${currentStep === 4 ? 'bg-white border border-slate-300 rounded-xl shadow-md p-6 sm:p-8 max-w-4xl mx-auto' : 'bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs'} space-y-6 text-slate-900 font-sans w-full print:w-full print:max-w-none print:rounded-none print:border-none print:shadow-none print:p-0`}>
            
            {/* HEADER WITH LOGOS */}
            <div className={`${currentStep === 4 ? '' : 'hidden'} flex justify-between items-center border-b-2 border-[#002B66] pb-4`}>
              <div className="flex items-center gap-3">
                <img 
                  src="/lbp.png" 
                  alt="Centralized Logo" 
                  className="w-12 h-12 object-contain rounded" 
                />
                <div>
                  <h1 className="text-xs font-black text-[#002B66] tracking-wide">CENTRALIZED UNCLAIMED WINNINGS</h1>
                  <p className="text-[9.5px] text-slate-700 font-bold uppercase tracking-wider">SUB-OFFICE: {ticketSubOffice}</p>
                  <p className="text-[8.5px] text-slate-400 font-semibold">#257 BARLAPS, A.S. FORTUNA STREET, BAKILID, MANDAUE CITY, CEBU 6014</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <img 
                  src="/stl.jpg" 
                  alt="STL Logo" 
                  className="w-10 h-10 object-contain rounded border border-slate-200 shadow-sm" 
                />
              </div>
            </div>

            <div className={`${currentStep === 4 ? '' : 'hidden'} text-center space-y-1`}>
              <h2 className="text-sm font-black text-[#002B66] tracking-wider uppercase">SETTLEMENT AGREEMENT</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">UNCLAIMED WINNING & PAYMENT SCHEDULE</p>
            </div>

            <p className={`${currentStep === 2 || currentStep === 4 ? '' : 'hidden'} print:block text-xs text-slate-700 leading-relaxed`}>
                This Settlement Agreement ("Agreement") is made on{' '}
              <input
                type="date"
                value={agreementDate}
                onChange={(e) => handleAgreementDateChange(e.target.value)}
                className="border-b border-slate-400 px-1 font-bold text-slate-900 bg-slate-50 outline-none text-xs"
              />{' '}
              regarding the accountable party's repayment of company liability described below.
            </p>

            {/* 1. DETAILS OF ACCOUNTABILITY */}
            <div className={`${currentStep === 1 || currentStep === 4 ? '' : 'hidden'} print:block space-y-2`}>
              <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2">
                1. DETAILS OF ACCOUNTABILITY
              </h3>
              <table className="w-full text-xs border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50 w-1/3">Transaction ID</td>
                    <td className="border border-slate-300 px-3 py-1.5 font-mono font-bold text-slate-900">
                      {selectedTicket.transactionId || selectedTicket.transId || selectedTicket.receipt_no || '081628-OIIIRA0CN'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50">Transaction Date</td>
                    <td className="border border-slate-300 px-3 py-1.5 font-mono text-slate-900">
                      {formatTransactionDate(selectedTicket.drawDate || selectedTicket.transactionDate || selectedTicket.created_at)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50">Winning Combination / Bet No.</td>
                    <td className="border border-slate-300 px-3 py-1.5 font-mono font-bold text-slate-900">
                      {selectedTicket.betNo || selectedTicket.CombiNo || '784'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50">Total Winning Amount</td>
                    <td className="border border-slate-300 px-3 py-1.5 font-mono font-extrabold text-emerald-700">
                      PHP {parseFloat(selectedTicket.winAmount || 5000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. SUMMARY / REASON OF SETTLEMENT */}
            <div className={`${currentStep === 2 || currentStep === 4 ? '' : 'hidden'} print:block space-y-2`}>
              <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2">
                2. SUMMARY / REASON FOR SETTLEMENT
              </h3>
              <div className="bg-amber-50/90 border border-amber-300 p-3.5 rounded-xl text-xs space-y-2.5 shadow-sm">
                
                {/* QUICK CLICKABLE TEMPLATES (Hidden when printing) */}
                <div className="print:hidden space-y-1.5 border-b border-amber-200/80 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-950 uppercase tracking-wider">
                      Quick Reason Templates (Click to Auto-fill):
                    </span>
                    <span className="text-[10px] text-amber-800 font-semibold">
                      Click any option below to fill the reason field
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {REASON_TEMPLATES.map((tmpl, idx) => {
                      const isSelected = reason === tmpl.text;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReason(tmpl.text)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-700 text-white border-amber-800 shadow-sm ring-2 ring-amber-400/50'
                              : 'bg-white text-slate-800 border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-950'
                          }`}
                        >
                          {tmpl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-950 uppercase">Reason:</span>
                    <span className="text-[10px] text-slate-500 font-medium print:hidden">You can also edit or type custom text below</span>
                  </div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-amber-300 p-2.5 text-xs font-medium rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 leading-relaxed shadow-inner"
                    placeholder="Enter or select the reason for the settlement agreement..."
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    (The original ticket was lost, damaged, or expired, preventing standard automated terminal validation).
                  </p>
                </div>
              </div>
            </div>

            {/* 3. PAYMENT SCHEDULE & BREAKDOWN */}
            <div className={`${currentStep === 3 || currentStep === 4 ? '' : 'hidden'} print:block space-y-3`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2">
                  3. PAYMENT SCHEDULE & BREAKDOWN
                </h3>
                <div className="text-[11px] font-bold text-slate-500 print:hidden">
                  Total Liability: <strong className="text-emerald-700 font-mono">PHP {getWinAmount(selectedTicket).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* SCHEDULE CONTROLS (Hidden when printing) */}
              <div className="print:hidden bg-blue-50/80 border border-blue-200 p-4 rounded-xl space-y-3 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#002B66] mb-1">
                      Payment Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => handleFrequencyChange(e.target.value)}
                      className="w-full bg-white border border-blue-200 px-3 py-2 rounded-lg font-bold text-slate-800 outline-none focus:border-[#002B66] focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="weekly">Weekly (Every 7 Days)</option>
                      <option value="semi-monthly">2x a Month (15th & 30th)</option>
                      <option value="daily">Daily (Every Day)</option>
                      <option value="monthly">Monthly (Every Month)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#002B66] mb-1">
                      Amount per Payment (₱)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-mono font-bold text-xs">₱</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={customAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="Payment amount per term"
                        className="w-full bg-white border border-blue-200 pl-7 pr-3 py-2 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-[#002B66] focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#002B66] mb-1">
                      Installments Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={installmentsCount}
                      onChange={(e) => handleInstallmentCountChange(e.target.value)}
                      className="w-full bg-white border border-blue-200 px-3 py-2 rounded-lg font-mono font-bold text-center text-slate-800 outline-none focus:border-[#002B66] focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-700">
                The total winning liability of <span className="font-bold">PHP {getWinAmount(selectedTicket).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> will be paid in <span className="font-bold">{installments.length} installments</span> ({getFrequencyLabel(frequency)}) scheduled accordingly below:
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
                  {installments.map((inst, index) => (
                    <tr key={inst.id} className="odd:bg-white even:bg-slate-50">
                      <td className="border border-slate-300 p-2 font-bold font-mono">{inst.id}</td>
                      <td className="border border-slate-300 p-1.5">
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => handleRowChange(index, 'dueDate', e.target.value)}
                          className="w-full bg-transparent font-mono text-xs text-center outline-none cursor-pointer"
                        />
                      </td>
                      <td className="border border-slate-300 p-1.5">
                        <input
                          type="text"
                          value={inst.amountDue}
                          onChange={(e) => handleRowChange(index, 'amountDue', e.target.value)}
                          className="w-full bg-transparent font-mono font-bold text-center outline-none text-emerald-800"
                        />
                      </td>
                      <td className="border border-slate-300 p-1.5">
                        <input
                          type="text"
                          value={inst.status || ''}
                          onChange={(e) => handleRowChange(index, 'status', e.target.value)}
                          placeholder="Signature / Date"
                          className="w-full bg-transparent text-center outline-none text-slate-700 text-[11px] placeholder:text-slate-300 print:placeholder:text-transparent"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. TERMS & ACKNOWLEDGMENT */}
            <div className={`${currentStep === 4 ? '' : 'hidden'} print:block space-y-1 text-xs text-slate-700`}>
              <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2 mb-2">
                4. TERMS & ACKNOWLEDGMENT
              </h3>
              <p>1. Payments shall be remitted strictly according to the schedule specified above.</p>
              <p>
                2. Upon full receipt of the final payment, the entire liability amount of **PHP {parseFloat(selectedTicket.winAmount || 5000).toLocaleString('en-US', { minimumFractionDigits: 2 })}** shall be deemed fully satisfied and settled.
              </p>
            </div>

            {/* 5. SIGNATURES & ACKNOWLEDGMENT */}
            <div className={`${currentStep === 2 || currentStep === 4 ? '' : 'hidden'} print:block space-y-4 pt-4 border-t border-slate-300`}>
              <h3 className="text-xs font-black text-[#002B66] uppercase border-l-4 border-[#002B66] pl-2">
                5. SIGNATURES & ACKNOWLEDGMENT
              </h3>
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                {/* Accountable Payer Signature */}
                <div className="space-y-8">
                  <div className="border-b border-slate-900 pb-1 font-bold uppercase text-slate-900">
                    {selectedTicket.fullName || selectedTicket.username || 'Accountable Payer Name'}
                  </div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-600">
                    [ ACCOUNTABLE PAYER ]<br />
                    <span className="font-normal normal-case text-slate-500">Signature over Printed Name</span><br />
                    <span className="font-mono mt-1 block">Date: {formatTransactionDate(agreementDate)}</span>
                  </div>
                </div>

                {/* HR / Management Signature (Editable) */}
                <div className="space-y-8">
                  <input
                    type="text"
                    value={hrManagerName}
                    onChange={(e) => setHrManagerName(e.target.value)}
                    className="w-full border-b border-slate-900 pb-1 font-bold uppercase text-slate-900 text-center bg-slate-50 outline-none"
                    placeholder="Enter Representative Name"
                  />
                  <div className="text-[10px] font-extrabold uppercase text-slate-600">
                    [ AUTHORIZED COMPANY REPRESENTATIVE ]<br />
                    <span className="font-normal normal-case text-slate-500">Company Representative / Signature over Printed Name</span><br />
                    <span className="font-mono mt-1 block">Date: {formatTransactionDate(agreementDate)}</span>
                  </div>
                </div>
              </div>

              {/* Supervisor Signature (Editable) */}
              <div className="w-1/2 mx-auto pt-6 text-center text-xs">
                <div className="space-y-8">
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="w-full border-b border-slate-900 pb-1 font-bold uppercase text-slate-900 text-center bg-slate-50 outline-none"
                    placeholder="Enter Supervisor Name"
                  />
                  <div className="text-[10px] font-extrabold uppercase text-slate-600">
                    [ SALES SUPERVISOR ]<br />
                    <span className="font-normal normal-case text-slate-500">Witness / Signature over Printed Name</span><br />
                    <span className="font-mono mt-1 block">Date: {formatTransactionDate(agreementDate)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="print:hidden flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step {currentStep} of {steps.length}</span>
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={() => setCurrentStep((step) => Math.min(steps.length, step + 1))}
                className="flex items-center gap-1.5 rounded-lg bg-[#002B66] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#FFD700] shadow-sm hover:bg-blue-900 cursor-pointer"
              >
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <span className="rounded-lg bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-700">Ready to Save or Print</span>
            )}
          </div>
        </>
      )}

    </div>
  );
}
