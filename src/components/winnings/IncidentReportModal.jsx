import React from 'react';
import { AlertTriangle, FileText, Printer, X, ShieldAlert } from 'lucide-react';
import { formatDrawTime, getTicketTransId } from '../../utils/formatters';
import { getTicketAgeInDays, getTicketDate } from '../../utils/ticketAge';
import { openIncidentReportPrint } from '../../utils/incidentReportPrint';

export default function IncidentReportModal({ ticket, onClose }) {
  if (!ticket) return null;

  const transId = getTicketTransId(ticket, 'N/A');
  const ticketDate = getTicketDate(ticket);
  const ageInDays = getTicketAgeInDays(ticket);
  const reportNumber = `IR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(transId).replace(/[^a-zA-Z0-9]/g, '').slice(-6) || '000000'}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-[#002B66] bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-[#FFD700] bg-[#002B66] px-5 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#FFD700] p-2 text-[#002B66] shadow-xs">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">CENTRALIZED PORTAL • SUB-OFFICE: {ticket.sub_office || ticket.subOffice || 'MANDAUE CENTRAL'}</p>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider">Operational Incident Report Issuance</h2>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer" 
            aria-label="Close modal"
          >
            <X size={19} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-800">
          
          {/* Overdue Alert Banner */}
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-rose-900 shadow-2xs">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold text-rose-950 text-xs">
                Unclaimed Holding Period Exceeded: <span className="underline font-black">{ageInDays} Days Old</span>
              </p>
              <p className="mt-0.5 text-[11px] text-rose-800 leading-relaxed">
                This winning ticket has remained unclaimed beyond the standard 3-day claiming window and is officially flagged for compliance review.
              </p>
            </div>
          </div>

          {/* Ticket Information Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 font-mono text-xs shadow-2xs">
            <div className="border-b border-blue-100 sm:border-b-0 sm:border-r pb-2 sm:pb-0 pr-2">
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 block">Report Number</span>
              <p className="mt-0.5 font-black text-[#002B66] text-xs">{reportNumber}</p>
            </div>

            <div>
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 block">Date Issued</span>
              <p className="mt-0.5 font-bold text-slate-800 text-xs">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>

            <div className="border-b border-blue-100 sm:border-b-0 sm:border-r pb-2 sm:pb-0 pr-2">
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 block">Transaction ID</span>
              <p className="mt-0.5 font-black text-[#002B66] text-xs truncate">{transId}</p>
            </div>

            <div>
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 block">Ticket Date</span>
              <p className="mt-0.5 font-bold text-slate-800 text-xs">{ticketDate || 'N/A'}</p>
            </div>

            <div className="border-b border-blue-100 sm:border-b-0 sm:border-r pb-2 sm:pb-0 pr-2">
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 block">Teller / Outlet</span>
              <p className="mt-0.5 font-bold text-slate-800 text-xs truncate uppercase font-sans">{ticket.fullName || ticket.outlet || ticket.username || 'N/A'}</p>
            </div>

            <div>
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 block">Draw Schedule</span>
              <p className="mt-0.5 font-bold text-slate-800 text-xs">{formatDrawTime(ticket.drawTime || ticket.draw, ticket.drawDate || ticket.created_at)}</p>
            </div>

            <div className="border-b border-blue-100 sm:border-b-0 sm:border-r pb-2 sm:pb-0 pr-2">
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 block">Bet Combination</span>
              <p className="mt-0.5 font-bold text-slate-900 text-xs">
                {ticket.betNo || ticket.CombiNo || ticket.SoldOutCombiNo || 'N/A'} <span className="text-slate-500 font-normal">({ticket.betCode || (ticket.rambolito ? 'RS3' : 'TS3')})</span>
              </p>
            </div>

            <div>
              <span className="text-[10px] font-sans font-extrabold uppercase text-slate-400 block">Win Liability</span>
              <p className="mt-0.5 font-black text-emerald-700 text-sm">
                ₱{parseFloat(ticket.winAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Statement of Incident */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
            <p className="font-extrabold uppercase tracking-wider text-[#002B66] text-[11px] flex items-center gap-1.5">
              <FileText size={14} /> Official Incident Disposition
            </p>
            <p className="leading-relaxed text-slate-600 text-xs">
              The listed winning ticket remains unclaimed beyond the prescribed 3-day holding period. This document is officially generated for branch monitoring, audit verification, and compliance filing in accordance with company standard operating procedures.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button 
            type="button" 
            onClick={() => openIncidentReportPrint(ticket)} 
            className="flex items-center gap-2 rounded-xl bg-[#002B66] hover:bg-blue-900 text-[#FFD700] px-5 py-2 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={15} />
            <span>Open Print Preview (A4)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
