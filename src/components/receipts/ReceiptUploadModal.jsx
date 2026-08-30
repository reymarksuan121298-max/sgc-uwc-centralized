import { useState } from 'react';
import { 
  X, UploadCloud, CheckCircle2, AlertCircle, FileText, Smartphone, 
  Building2, Landmark, Image as ImageIcon, Check, Loader2, Sparkles 
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { isAdminRole, isSuperAdminRole } from '../../utils/permissions';
import { scanReceiptProof } from '../../utils/receiptOcr';
import { getTicketTransId } from '../../utils/formatters';

export default function ReceiptUploadModal({ 
  isOpen, 
  onClose, 
  ticket, 
  currentUser, 
  onUploadSuccess 
}) {
  const isAdmin = isAdminRole(currentUser?.role) || isSuperAdminRole(currentUser?.role);
  const [paymentChannel, setPaymentChannel] = useState('GCASH'); // 'GCASH', 'CEBUANA', 'BANK_TRANSFER', 'CASH_PALAWAN'
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remittanceAmount, setRemittanceAmount] = useState(
    ticket ? (ticket.winAmount || ticket.return_amount_out || 0) : ''
  );
  const [senderName, setSenderName] = useState(currentUser?.full_name || '');
  const [senderMobile, setSenderMobile] = useState('');
  const [bankName, setBankName] = useState('BDO Unibank');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrDetectionNote, setOcrDetectionNote] = useState('');

  if (!isOpen || !ticket) return null;

  const targetTransId = getTicketTransId(ticket);
  const subOfficeName = currentUser?.sub_office && currentUser.sub_office !== 'All' 
    ? currentUser.sub_office 
    : (ticket.sub_office || ticket.location || 'Mandaue Central');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size should be less than 5MB.');
      return;
    }

    setErrorMessage('');
    setOcrDetectionNote('');
    const reader = new FileReader();
    reader.onloadend = async () => {
      setPreviewImage(reader.result);

      // Trigger automatic AI OCR
      setIsScanningOcr(true);
      setOcrProgress(15);
      try {
        const ocrResult = await scanReceiptProof(file, (pct) => setOcrProgress(pct));
        if (ocrResult?.referenceNumber) {
          setReferenceNumber(ocrResult.referenceNumber);
          setOcrDetectionNote(`Auto-detected: ${ocrResult.referenceNumber}`);
        }
        if (ocrResult?.mobile && !senderMobile) {
          setSenderMobile(ocrResult.mobile);
        }
      } catch (err) {
        console.warn('OCR error:', err);
      } finally {
        setIsScanningOcr(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!referenceNumber.trim()) {
      setErrorMessage('Please enter the official transaction reference / control number.');
      return;
    }
    if (!remittanceAmount || parseFloat(remittanceAmount) <= 0) {
      setErrorMessage('Please enter a valid remittance amount.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        batch_serial_no: targetTransId,
        sub_office: subOfficeName,
        uploaded_by_user: currentUser?.username || 'sub_office_user',
        payment_channel: paymentChannel,
        reference_number: referenceNumber.trim().toUpperCase(),
        sender_name: senderName.trim() || null,
        sender_mobile: senderMobile.trim() || null,
        bank_name: paymentChannel === 'BANK_TRANSFER' ? bankName : null,
        remittance_amount: parseFloat(remittanceAmount),
        receipt_date: receiptDate,
        receipt_image_url: previewImage || null,
        verification_status: 'PENDING',
        notes: notes.trim() || null
      };

      // 1. Insert into remittance_receipts
      const { data: receiptData, error: receiptError } = await supabase
        .from('remittance_receipts')
        .insert([payload])
        .select();

      if (receiptError) throw receiptError;

      // 2. Update returned_winnings status to PENDING_VERIFICATION and update return_amount_out
      await supabase
        .from('returned_winnings')
        .update({
          receipt_status: 'PENDING_VERIFICATION',
          return_amount_out: parseFloat(remittanceAmount),
          sub_office: subOfficeName
        })
        .eq('transactionId', targetTransId);

      // 3. Log into audit trail
      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'user',
        actor_role: currentUser?.role || 'Staff',
        action: 'RECEIPT_UPLOADED',
        target_type: 'RECEIPT',
        target_id: targetTransId,
        sub_office: subOfficeName,
        details: {
          channel: paymentChannel,
          ref: referenceNumber.trim(),
          amount: parseFloat(remittanceAmount)
        }
      }]);

      if (onUploadSuccess) {
        onUploadSuccess(receiptData ? receiptData[0] : payload);
      }
      onClose();
    } catch (err) {
      console.error('Receipt upload failed:', err);
      setErrorMessage(err.message || 'Failed to submit remittance receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#002B66] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#FFD700]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD700] text-[#002B66] p-2 rounded-lg font-black">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
                Upload Return Remittance Proof
              </h3>
              <p className="text-[11px] text-blue-200 font-mono">
                Trans ID: <span className="text-[#FFD700] font-bold">{targetTransId}</span> • Branch: <span className="text-white font-bold">{subOfficeName}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Channel Selector Tabs (Hidden on Admin side) */}
          {!isAdmin && (
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2">
                Select Remittance / Payment Channel:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'GCASH', label: 'GCash', icon: Smartphone, color: 'border-blue-500 text-blue-600 bg-blue-50/50' },
                  { id: 'CEBUANA', label: 'Cebuana', icon: Building2, color: 'border-amber-500 text-amber-700 bg-amber-50/50' },
                  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark, color: 'border-emerald-500 text-emerald-700 bg-emerald-50/50' },
                  { id: 'CASH_PALAWAN', label: 'Cash / Palawan', icon: FileText, color: 'border-purple-500 text-purple-700 bg-purple-50/50' }
                ].map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentChannel(id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer text-xs font-black ${
                      paymentChannel === id 
                        ? `${color} ring-2 ring-[#002B66] shadow-sm` 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={18} className="mb-1" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI OCR Scanning & Auto-Detect Banner */}
          {isScanningOcr && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 size={15} className="animate-spin text-[#002B66]" />
                <span>AI scanning image for Official Reference / Control No...</span>
              </div>
              <span className="font-mono text-xs bg-blue-100 px-2 py-0.5 rounded-full text-[#002B66]">{ocrProgress}%</span>
            </div>
          )}

          {ocrDetectionNote && !isScanningOcr && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-bold animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600" />
                <span>{ocrDetectionNote}</span>
              </div>
              <span className="text-[9px] text-emerald-700 uppercase font-sans font-black bg-emerald-100 px-2 py-0.5 rounded-full">
                Auto-Fetched ✨
              </span>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Reference Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  {paymentChannel === 'GCASH' ? 'GCash Ref No. (e.g. 1029384756)' :
                   paymentChannel === 'CEBUANA' ? 'KPTN / Control Number' :
                   paymentChannel === 'BANK_TRANSFER' ? 'Bank Reference / Trace No.' : 'Remittance / Receipt No.'} *
                </label>
                {referenceNumber && ocrDetectionNote && (
                  <span className="text-[9px] text-emerald-700 font-bold flex items-center gap-0.5">
                    <Check size={10} /> Auto-Fetched
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="Enter Reference Number..."
                value={referenceNumber}
                onChange={(e) => {
                  setReferenceNumber(e.target.value);
                  if (ocrDetectionNote) setOcrDetectionNote('');
                }}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-mono font-bold text-[#002B66] uppercase focus:bg-white focus:border-[#002B66] focus:ring-1 focus:ring-[#002B66] outline-none"
              />
            </div>

            {/* Remittance Amount */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                Remitted Return Amount Out (₱) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={remittanceAmount}
                onChange={(e) => setRemittanceAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-mono font-extrabold text-emerald-700 focus:bg-white focus:border-[#002B66] outline-none"
              />
            </div>

            {/* Channel specific: Bank Name */}
            {paymentChannel === 'BANK_TRANSFER' && (
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Bank Name
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                >
                  <option value="BDO Unibank">BDO Unibank</option>
                  <option value="BPI">BPI (Bank of the Philippine Islands)</option>
                  <option value="UnionBank">UnionBank of the Philippines</option>
                  <option value="Metrobank">Metrobank</option>
                  <option value="Landbank">Landbank</option>
                  <option value="RCBC">RCBC</option>
                  <option value="Security Bank">Security Bank</option>
                  <option value="Maya Bank / Other">Maya Bank / Other Digital Bank</option>
                </select>
              </div>
            )}

            {/* Sender / Depositor Name */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                Sender / Sub-Office Depositor Name
              </label>
              <input
                type="text"
                placeholder="Name of Sub-Office Officer"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
              />
            </div>

            {/* GCash Sender Mobile */}
            {paymentChannel === 'GCASH' && (
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  GCash Sender Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="09XX XXX XXXX"
                  value={senderMobile}
                  onChange={(e) => setSenderMobile(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
                />
              </div>
            )}

            {/* Date */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                Remittance Date
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
              />
            </div>
          </div>

          {/* Image Upload Area */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
              Attach Screenshot / Official Receipt Image
            </label>
            
            {previewImage ? (
              <div className="relative border-2 border-dashed border-emerald-400 bg-emerald-50/40 rounded-xl p-3 flex flex-col items-center">
                <img 
                  src={previewImage} 
                  alt="Receipt Preview" 
                  className="max-h-48 rounded-lg shadow-md object-contain mb-2 border border-slate-200" 
                />
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                >
                  Remove / Change Photo
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 hover:border-[#002B66] bg-slate-50 hover:bg-blue-50/40 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <ImageIcon size={28} className="text-slate-400 group-hover:text-[#002B66] mb-1.5 transition-colors" />
                <span className="text-xs font-bold text-[#002B66]">Click to browse or drop receipt screenshot</span>
                <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, or JPEG up to 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
              Additional Remarks / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Paid via branch GCash account, collector verified."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-5 py-2 rounded-lg text-xs font-black tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting Proof...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirm & Submit Remittance</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
