import { useState } from 'react';
import { 
  X, UploadCloud, CheckCircle2, AlertCircle, FileText, Smartphone, 
  Building2, Landmark, Image as ImageIcon, Check, Loader2, Sparkles,
  ShieldCheck, Eye
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { isAdminRole, isSuperAdminRole } from '../../utils/permissions';
import { scanReceiptProof } from '../../utils/receiptOcr';
import { getTicketTransId, formatDrawTime } from '../../utils/formatters';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

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

  const handleInitiateSubmit = (e) => {
    e.preventDefault();
    if (!referenceNumber.trim()) {
      setErrorMessage('Please enter the official transaction reference / control number.');
      return;
    }
    if (!remittanceAmount || parseFloat(remittanceAmount) <= 0) {
      setErrorMessage('Please enter a valid remittance amount.');
      return;
    }

    setErrorMessage('');
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
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

      setShowConfirmModal(false);
      if (onUploadSuccess) {
        onUploadSuccess(receiptData ? receiptData[0] : payload);
      }
      onClose();
    } catch (err) {
      console.error('Receipt upload failed:', err);
      setErrorMessage(err.message || 'Failed to submit remittance receipt.');
      setShowConfirmModal(false);
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
        <form onSubmit={handleInitiateSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Ticket Bet</span>
              <span className="font-mono font-bold text-slate-800">
                {ticket.betNo || 'N/A'} <span className="text-slate-500">({ticket.betCode || 'RS3'})</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Draw Details</span>
              <span className="font-mono font-medium text-slate-700 truncate block">
                {formatDrawTime(ticket.drawTime || ticket.draw, ticket.drawDate || ticket.date || ticket.created_at)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Teller / Outlet</span>
              <span className="font-medium text-slate-700 truncate block">
                {ticket.fullName || ticket.outlet || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Winning</span>
              <span className="font-mono font-extrabold text-emerald-700">
                ₱{parseFloat(ticket.winAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment Channel Selection */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
              Select Remittance Payment Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'GCASH', name: 'GCash', icon: Smartphone, color: 'text-blue-600' },
                { id: 'CEBUANA', name: 'Cebuana', icon: Building2, color: 'text-rose-600' },
                { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: Landmark, color: 'text-emerald-600' },
                { id: 'CASH_PALAWAN', name: 'Palawan / Cash', icon: FileText, color: 'text-amber-600' }
              ].map(channel => {
                const Icon = channel.icon;
                const isSelected = paymentChannel === channel.id;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setPaymentChannel(channel.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#002B66] text-white border-[#002B66] shadow-sm' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-[#FFD700]' : channel.color} />
                    <span className="truncate">{channel.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI OCR Scanning Banner */}
          {isScanningOcr && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl flex items-center justify-between text-xs font-bold animate-pulse">
              <div className="flex items-center gap-2.5">
                <Loader2 size={16} className="animate-spin text-[#002B66]" />
                <span>AI scanning receipt image for Reference / Control No...</span>
              </div>
              <span className="font-mono text-xs bg-blue-100 px-2 py-0.5 rounded-full text-[#002B66]">{ocrProgress}%</span>
            </div>
          )}

          {ocrDetectionNote && !isScanningOcr && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs font-bold animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-emerald-600" />
                <span>{ocrDetectionNote}</span>
              </div>
              <span className="text-[10px] text-emerald-700 uppercase font-sans font-black bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                Auto-Detected ✨
              </span>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Official Reference / Control No. *
                </label>
                {referenceNumber && ocrDetectionNote && (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <Check size={11} /> Detected
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. 10029384758 / CEB-9982"
                value={referenceNumber}
                onChange={(e) => {
                  setReferenceNumber(e.target.value);
                  if (ocrDetectionNote) setOcrDetectionNote('');
                }}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-mono font-bold text-[#002B66] uppercase focus:bg-white focus:border-[#002B66] outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Remittance Amount (₱) *
                </label>
                <button
                  type="button"
                  onClick={() => setRemittanceAmount(parseFloat(ticket.winAmount || 0).toFixed(2))}
                  className="text-[10px] text-[#002B66] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={11} className="text-amber-500" /> Match Winning
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                required
                value={remittanceAmount}
                onChange={(e) => setRemittanceAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-mono font-bold text-emerald-700 focus:bg-white focus:border-[#002B66] outline-none"
              />
            </div>
          </div>

          {paymentChannel === 'BANK_TRANSFER' && (
            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                Beneficiary Bank Name
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
              >
                <option value="BDO Unibank">BDO Unibank</option>
                <option value="BPI">Bank of the Philippine Islands (BPI)</option>
                <option value="Metrobank">Metrobank</option>
                <option value="UnionBank">UnionBank of the Philippines</option>
                <option value="Landbank">Landbank</option>
                <option value="Security Bank">Security Bank</option>
                <option value="RCBC">RCBC</option>
                <option value="Other Bank">Other Local Bank</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                Sender Name
              </label>
              <input
                type="text"
                placeholder="Full Name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                Sender Mobile
              </label>
              <input
                type="text"
                placeholder="0917XXXXXXX"
                value={senderMobile}
                onChange={(e) => setSenderMobile(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg font-mono text-xs text-slate-800 focus:bg-white focus:border-[#002B66] outline-none"
              />
            </div>

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
                  className="max-h-48 rounded-lg shadow-md object-contain mb-2 border border-slate-200 cursor-pointer hover:opacity-95" 
                  onClick={() => setIsImageZoomed(true)}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsImageZoomed(true)}
                    className="text-xs font-bold text-[#002B66] hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs"
                  >
                    <Eye size={12} /> View Large
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Remove / Change Photo
                  </button>
                </div>
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
              <CheckCircle2 size={16} />
              <span>Review & Attach Proof →</span>
            </button>
          </div>
        </form>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white border-2 border-[#002B66] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
              
              <div className="bg-[#002B66] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#FFD700]">
                <div className="flex items-center gap-2.5 font-black uppercase text-xs sm:text-sm tracking-wider">
                  <ShieldCheck size={18} className="text-[#FFD700]" />
                  <span>Confirm Remittance Proof</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs overflow-y-auto">
                <div className="bg-blue-50 border border-blue-200 text-blue-900 px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
                  <Sparkles size={16} className="text-[#002B66] shrink-0" />
                  <span>Please verify if the attached receipt and details are correct.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 mb-2 block tracking-wider">
                      Attached Proof
                    </span>
                    {previewImage ? (
                      <div className="w-full flex flex-col items-center">
                        <img
                          src={previewImage}
                          alt="Proof Preview"
                          className="max-h-40 w-full object-contain rounded-lg border border-slate-300 cursor-pointer"
                          onClick={() => setIsImageZoomed(true)}
                        />
                        <button
                          type="button"
                          onClick={() => setIsImageZoomed(true)}
                          className="mt-2 text-[10px] font-bold text-[#002B66] flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-full"
                        >
                          <Eye size={11} /> Expand
                        </button>
                      </div>
                    ) : (
                      <div className="py-4 text-slate-400 text-center">
                        <ImageIcon size={28} className="mx-auto mb-1 text-slate-300" />
                        <span className="text-[10px] font-bold">No Image Attached</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-7 space-y-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 font-mono">
                      <div>
                        <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">Reference Number</span>
                        <span className="font-mono font-black text-sm text-[#002B66] block break-all">{referenceNumber.toUpperCase()}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">Amount</span>
                          <span className="font-mono font-black text-emerald-700 text-sm block">₱{parseFloat(remittanceAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">Channel</span>
                          <span className="font-sans font-bold text-slate-800 text-xs block">{paymentChannel}</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">Trans ID</span>
                          <span className="font-mono font-bold text-slate-700 text-[11px] block truncate">{targetTransId}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-sans font-extrabold text-slate-400 uppercase block">Date</span>
                          <span className="font-sans font-bold text-slate-700 text-[11px] block">{receiptDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-200 transition-colors text-xs"
                >
                  ← Edit Details
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-black transition-all shadow-md active:scale-95 disabled:opacity-50 text-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Yes, Confirm & Submit</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Enlarged Zoom Image Modal */}
        {isImageZoomed && previewImage && (
          <div 
            className="fixed inset-0 z-70 bg-black/90 flex items-center justify-center p-4 animate-in fade-in cursor-zoom-out"
            onClick={() => setIsImageZoomed(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <img 
                src={previewImage} 
                alt="Enlarged Proof" 
                className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/20"
              />
              <button
                type="button"
                onClick={() => setIsImageZoomed(false)}
                className="mt-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-1.5 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
              >
                Close Zoom View
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
