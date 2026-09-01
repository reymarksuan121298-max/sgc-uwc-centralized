import React from 'react';
import { Receipt, AlertTriangle, X, QrCode, Copy, Check, CheckCircle2 } from 'lucide-react';
import { formatDrawTime, getTicketTransId } from '../../utils/formatters';
import { isSSRRole } from '../../utils/permissions';

export default function ConfirmReturnModal({
  isOpen,
  ticket,
  commissionConfig,
  isSaving = false,
  copiedTransIds = new Set(),
  openedQrTransIds = new Set(),
  isCopied = false,
  onCopyTransId,
  onOpenQrModal,
  canCopyTransaction = true,
  canOpenQrModal = true,
  currentUser,
  onClose,
  onConfirm
}) {
  const [internalCopied, setInternalCopied] = React.useState(false);

  if (!isOpen || !ticket) return null;

  const isSSR = isSSRRole(currentUser?.role);

  const targetTransId = getTicketTransId(ticket);
  const isTransIdCopied = Boolean(internalCopied || isCopied || (targetTransId && copiedTransIds?.has?.(targetTransId)));
  const isQrOpened = Boolean(targetTransId && openedQrTransIds?.has?.(targetTransId));
  const isTransferDisabled = (isTransIdCopied || isQrOpened);

  const handleCopy = (text) => {
    if (onCopyTransId) {
      onCopyTransId(text);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setInternalCopied(true);
    setTimeout(() => setInternalCopied(false), 2000);
  };

  const winAmt = parseFloat(ticket.winAmount ?? 0);
  const betAmt = parseFloat(ticket.betAmount ?? ticket.amount ?? ticket.gross ?? 0);
  const betNo = ticket.betNo || ticket.CombiNo || ticket.SoldOutCombiNo || 'N/A';
  const betCode = ticket.betCode || (ticket.rambolito ? 'RS3' : 'TS3');
  const drawFormatted = formatDrawTime(ticket.drawTime || ticket.draw, ticket.drawDate || ticket.created_at);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* 1. Modal Header */}
        <div className="bg-[#002B66] text-white px-5 py-3.5 flex justify-between items-center border-b-2 border-[#FFD700] shrink-0">
          <div className="flex items-center gap-2.5 font-black uppercase tracking-wider text-xs sm:text-sm">
            <div className="bg-[#FFD700] text-[#002B66] p-1.5 rounded-lg font-black shadow-xs">
              <Receipt size={16} />
            </div>
            <span>Confirm Winnings Return Entry</span>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-300 hover:text-white cursor-pointer p-1 rounded-md hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto">
          
          {/* Top Notice Box */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-900 leading-relaxed font-medium">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p>
              Please review the ticket specifications below before transferring this record into the <strong className="underline text-amber-950 font-bold">Returned Winnings Audit Ledger</strong>.
            </p>
          </div>

          {/* Operational Lock Warning Banner when Copied or QR Opened */}
          {isTransferDisabled && (
            <div className="bg-amber-100/95 border-2 border-amber-400 text-amber-950 p-3 rounded-xl flex items-center gap-2.5 font-bold animate-in fade-in duration-200 text-xs shadow-xs">
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
              <span>
                {isTransIdCopied && isQrOpened
                  ? "Transaction ID copied & QR Code opened. "
                  : isQrOpened
                  ? "QR Code modal opened. "
                  : "Transaction ID copied to clipboard. "}
                <u>Execute Transfer is disabled</u> for this ticket.
              </span>
            </div>
          )}

          {/* Ticket Specifications Box */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-2.5 shadow-2xs font-sans text-xs">
            
            {/* Row 1: Assigned Username */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
              <span className="text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                ASSIGNED USERNAME:
              </span>
              <span className="font-bold text-[#002B66] font-mono">
                {ticket.username ? (ticket.username.startsWith('@') ? ticket.username : `@${ticket.username}`) : 'N/A'}
              </span>
            </div>

            {/* Row 2: Full Name / Outlet */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
              <span className="text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                FULL NAME / OUTLET:
              </span>
              <span className="font-bold text-slate-800 uppercase truncate max-w-[240px] text-right">
                {ticket.fullName || ticket.outlet || 'N/A'}
              </span>
            </div>

            {/* Row 3: Transaction ID with Copy & QR pill buttons */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                <QrCode size={13} className="text-[#002B66]" />
                <span>TRANSACTION ID:</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#002B66] font-mono underline text-xs">
                  {targetTransId}
                </span>

                {/* Copy and QR buttons rendered dynamically based on permissions */}
                {canCopyTransaction && (
                  <button
                    type="button"
                    onClick={() => handleCopy(targetTransId)}
                    className="bg-[#002B66] hover:bg-blue-900 text-[#FFD700] text-[10px] font-black px-2.5 py-1 rounded-md cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
                    title="Copy Transaction ID"
                  >
                    <Copy size={11} />
                    <span>{isTransIdCopied ? "Copied" : "Copy"}</span>
                  </button>
                )}

                {canOpenQrModal && onOpenQrModal && (
                  <button
                    type="button"
                    onClick={() => onOpenQrModal(ticket)}
                    className="bg-[#002B66] hover:bg-blue-900 text-[#FFD700] text-[10px] font-black px-2.5 py-1 rounded-md cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
                    title="Open Ticket QR Code"
                  >
                    <QrCode size={11} />
                    <span>QR</span>
                  </button>
                )}
              </div>
            </div>

            {/* Row 4: Draw Schedule */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
              <span className="text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                DRAW SCHEDULE:
              </span>
              <span className="font-mono font-bold text-slate-800">
                {drawFormatted}
              </span>
            </div>

            {/* Row 5: Bet Combination */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
              <span className="text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                BET COMBINATION:
              </span>
              <span className="font-mono font-bold text-slate-800">
                {betNo} ({betCode})
              </span>
            </div>

            {/* Row 6: Bet Amount */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
              <span className="text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                BET AMOUNT:
              </span>
              <span className="font-mono font-bold text-slate-800">
                ₱{betAmt.toFixed(2)}
              </span>
            </div>

            {/* Row 7: Win Liability */}
            <div className="flex items-center justify-between pt-1 gap-2">
              <span className="text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                WIN LIABILITY:
              </span>
              <span className="font-mono font-black text-[#047857] text-sm sm:text-base">
                ₱{winAmt.toFixed(2)}
              </span>
            </div>

          </div>

        </div>

        {/* 3. Modal Footer */}
        <div className="bg-slate-50/90 border-t border-slate-200 px-5 py-3.5 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-black px-5 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving || isTransferDisabled}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 ${
              isTransferDisabled
                ? "bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300 shadow-none"
                : "bg-[#002B66] hover:bg-blue-900 text-white cursor-pointer hover:shadow-lg disabled:opacity-50"
            }`}
            title={
              isTransferDisabled
                ? `Transfer is disabled because ${isQrOpened ? "QR Code modal was opened" : "Transaction ID was copied"}`
                : "Execute transfer to returned ledger"
            }
          >
            <Check size={14} className={isTransferDisabled ? "text-slate-400" : "text-[#FFD700]"} />
            <span>
              {isSaving
                ? "PROCESSING..."
                : isTransferDisabled
                ? `TRANSFER DISABLED (${isTransIdCopied && isQrOpened ? "ID & QR" : isQrOpened ? "QR OPENED" : "ID COPIED"})`
                : "EXECUTE TRANSFER"}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
