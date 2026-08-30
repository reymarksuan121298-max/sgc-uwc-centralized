import React from 'react';
import { QrCode, X, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDrawTime, getTicketTransId } from '../../utils/formatters';

export default function TicketQrModal({
  isOpen,
  ticket,
  isCopied = false,
  copiedTransIds = new Set(),
  onCopyTransId,
  onClose
}) {
  const [internalCopied, setInternalCopied] = React.useState(false);

  if (!isOpen || !ticket) return null;

  const targetTransId = getTicketTransId(ticket);
  const isQrTicketCopied = Boolean(internalCopied || isCopied || (targetTransId && copiedTransIds?.has?.(targetTransId)));

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
  const betNo = ticket.betNo || ticket.CombiNo || ticket.SoldOutCombiNo || 'N/A';
  const betCode = ticket.betCode || (ticket.rambolito ? 'RS3' : 'TS3');
  const drawFormatted = formatDrawTime(ticket.drawTime || ticket.draw, ticket.drawDate || ticket.created_at);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* 1. Header */}
        <div className="bg-[#002B66] text-white px-5 py-3.5 flex justify-between items-center border-b-2 border-[#FFD700]">
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs sm:text-sm">
            <QrCode size={18} className="text-[#FFD700]" />
            <span>TICKET QR CODE</span>
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

        {/* 2. Body */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs bg-white">
          
          {/* QR Code Container */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border-2 border-slate-100 flex items-center justify-center">
            <QRCodeSVG
              value={String(targetTransId)}
              size={195}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Transaction ID & Copy Button Box */}
          <div className="w-full bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                TRANSACTION ID
              </span>
              <span className="font-mono text-xs sm:text-sm font-black text-[#002B66] block mt-0.5">
                {targetTransId}
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => handleCopy(targetTransId)}
              className="bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-3.5 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Copy size={13} />
              <span>{isQrTicketCopied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Ticket Summary Specs Box */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 space-y-2 text-xs font-sans shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-semibold text-[11px]">
                Combination:
              </span>
              <span className="font-mono font-bold text-slate-900">
                {betNo} ({betCode})
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-semibold text-[11px]">
                Win Liability:
              </span>
              <span className="font-mono font-black text-[#047857] text-sm">
                ₱{winAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-slate-500 font-semibold text-[11px]">
                Draw Schedule:
              </span>
              <span className="font-mono font-bold text-slate-800">
                {drawFormatted}
              </span>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs text-[#002B66] text-center font-medium leading-relaxed">
            Point the <strong className="font-bold underline text-blue-950">STL Mandaue QR Scanner Mobile App</strong> at this QR code to authenticate and execute payout.
          </div>

        </div>

        {/* 3. Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 sm:p-4 flex justify-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#002B66] hover:bg-blue-900 text-white font-extrabold py-2.5 sm:py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-[0.99] text-center"
          >
            CLOSE QR CODE
          </button>
        </div>

      </div>
    </div>
  );
}
