import React, { useState } from 'react';
import {
  X, ZoomIn, ZoomOut, RotateCw, Download, ExternalLink,
  FileCheck, ShieldAlert, AlertTriangle, UserCheck, Check, Ban,
  Building2, Calendar, Ticket, Loader2
} from 'lucide-react';
import { getTicketTransId } from '../../utils/formatters';
import { canApproveDeletionRequests, isAdminRole, isSuperAdminRole } from '../../utils/permissions';

export default function ViewHardCopyTicketModal({
  isOpen,
  onClose,
  ticket,
  currentUser,
  onApprove,
  onReject,
  isProcessingAction = false
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !ticket) return null;

  const transId = getTicketTransId(ticket, 'N/A');
  const winAmount = parseFloat(ticket.winAmount ?? 0);
  const betAmount = parseFloat(ticket.betAmount ?? 0);
  const displayAccount = ticket.fullName || ticket.outlet || ticket.username || 'Accountable Teller';
  const reason = ticket.deletion_request_reason || ticket.reason || 'Requested deletion for verified claimed winning ticket.';
  const requestedBy = ticket.deletion_request_by || ticket.username || 'SSR / Specialist';
  const requestDate = ticket.updated_at || ticket.created_at;

  // Extract ticket attachment image
  const ticketImage = ticket.deletion_request_attachment || 
                      ticket.hard_copy_ticket_url || 
                      ticket.deletion_attachment_url || 
                      ticket.receipt_url || 
                      ticket.proof_url ||
                      ticket.ocr_data?.hard_copy_image || 
                      ticket.ocr_data?.ticket_image ||
                      ticket.image_url;

  const isAdmin = isAdminRole(currentUser?.role) || isSuperAdminRole(currentUser?.role);
  const canApprove = canApproveDeletionRequests(currentUser?.role) || isAdmin;
  const isPending = ticket.deletion_request_status === 'PENDING_ADMIN_APPROVAL';

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = () => {
    if (!ticketImage) return;
    const link = document.createElement('a');
    link.href = ticketImage;
    link.download = `HardCopy_Ticket_${transId}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = () => {
    if (!ticketImage) return;
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${ticketImage}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="bg-[#002B66] text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-900/80 rounded-xl border border-blue-400/40 text-[#FFD700] shrink-0">
              <Ticket size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider truncate">
                  Hard Copy Ticket Verification
                </h3>
                {isPending && (
                  <span className="bg-amber-400 text-amber-950 text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse shrink-0">
                    Pending Approval
                  </span>
                )}
              </div>
              <p className="text-[10px] text-blue-200 font-mono truncate">
                Trans SRN: <span className="text-[#FFD700] font-bold">{transId}</span> • Claimant: <span className="uppercase text-white font-bold">{displayAccount}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split view (Image Preview Canvas + Metadata Sidebar) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-100">
          
          {/* Main Inspection Canvas (7 cols on large screens) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-900 relative min-h-[340px] sm:min-h-[420px] max-h-[550px] lg:max-h-none overflow-hidden select-none">
            
            {/* Top Toolbar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-950/80 backdrop-blur-md text-white border border-slate-700/80 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-lg pointer-events-auto">
                <span>Zoom: {Math.round(zoom * 100)}%</span>
                {rotation !== 0 && <span>• {rotation}°</span>}
              </div>

              <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl flex items-center gap-1 shadow-lg pointer-events-auto">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Reset Zoom & Orientation"
                >
                  Reset
                </button>
                {ticketImage && (
                  <>
                    <div className="w-px h-4 bg-slate-700 mx-0.5"></div>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      title="Download Image"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenNewTab}
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      title="Open full size in new tab"
                    >
                      <ExternalLink size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Image Viewport */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-0">
              {ticketImage ? (
                <div
                  className="transition-transform duration-150 ease-out flex items-center justify-center"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center'
                  }}
                >
                  <img
                    src={ticketImage}
                    alt={`Hard copy ticket proof for ${transId}`}
                    className="max-w-full max-h-[460px] object-contain rounded-lg shadow-2xl border border-slate-700/50"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 space-y-2">
                  <AlertTriangle size={36} className="mx-auto text-amber-500 opacity-80" />
                  <p className="font-bold text-xs">No Hard Copy Image Attached</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    This request did not include an attached ticket image or the image link is unavailable.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Metadata & Audit Verification Panel (5 cols on large screens) */}
          <div className="lg:col-span-5 bg-white p-5 flex flex-col justify-between space-y-4 overflow-y-auto text-xs">
            
            <div className="space-y-4">
              {/* Deletion Request Status Banner */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                isPending 
                  ? 'bg-amber-50 border-amber-200 text-amber-900' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <span>Claim Deletion Request</span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-amber-300 text-amber-800">
                      {ticket.deletion_request_status || 'PENDING'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Unclaimed Specialists must inspect this hard copy ticket before approving removal and collection deduction.
                  </p>
                </div>
              </div>

              {/* Ticket Key Figures */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-sans text-slate-500 font-bold">Win Amount:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    ₱{winAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-sans text-slate-500 font-bold">Bet Amount:</span>
                  <span className="font-bold text-slate-700">
                    ₱{betAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-sans text-slate-500 font-bold">Bet / Combination:</span>
                  <span className="font-extrabold text-[#002B66] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {ticket.betNo || ticket.combination || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-sans text-slate-500 font-bold">Sub-Office:</span>
                  <span className="font-bold text-slate-800 uppercase">
                    {ticket.sub_office || currentUser?.sub_office || 'All'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-sans text-slate-500 font-bold">Draw Date & Time:</span>
                  <span className="font-semibold text-slate-700">
                    {ticket.drawDate || ticket.drawTime || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="font-sans text-slate-500 font-bold">Claimant / Teller:</span>
                  <span className="font-bold text-slate-800 uppercase truncate max-w-[170px]" title={displayAccount}>
                    {displayAccount}
                  </span>
                </div>
              </div>

              {/* SSR Deletion Justification & Reason */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                    SSR Deletion Justification
                  </label>
                  <span className="text-[9.5px] text-slate-400 font-medium">
                    By: <strong className="text-slate-700 font-bold">{requestedBy}</strong>
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-[11px] leading-relaxed italic">
                  "{reason}"
                </div>
              </div>
            </div>

            {/* Action Buttons for Approver / Viewer */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              {isPending && canApprove ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onApprove && onApprove(ticket);
                      onClose();
                    }}
                    disabled={isProcessingAction}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isProcessingAction ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={14} className="stroke-[3]" />
                    )}
                    <span>Approve & Deduct</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onReject && onReject(ticket);
                      onClose();
                    }}
                    disabled={isProcessingAction}
                    className="flex items-center justify-center gap-1 px-3.5 py-2.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 font-bold uppercase text-[11px] rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Ban size={13} />
                    <span>Reject</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 rounded-xl border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close Inspection
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
