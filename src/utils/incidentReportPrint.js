import { formatDrawTime } from './formatters';
import { getTicketAgeInDays, getTicketDate } from './ticketAge';

const escapeHtml = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const reportValue = (label, value) => `
  <div class="field">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value ?? 'N/A')}</strong>
  </div>
`;

const controlValue = (label, value) => `
  <div class="control">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value ?? 'N/A')}</strong>
  </div>
`;

export const openIncidentReportPrint = (ticket) => {
  if (!ticket) return;

  const transId = ticket.computedTransId || ticket.transactionId || ticket.transId || ticket.receipt_no || ticket.ticket_no || 'N/A';
  const ticketDate = getTicketDate(ticket);
  const ageInDays = getTicketAgeInDays(ticket);
  const reportNumber = `IR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(transId).replace(/[^a-zA-Z0-9]/g, '').slice(-6) || '000000'}`;
  const issuedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const drawSchedule = formatDrawTime(ticket.drawTime || ticket.draw, ticket.drawDate || ticket.created_at);
  const betCombination = `${ticket.betNo || ticket.CombiNo || ticket.SoldOutCombiNo || 'N/A'} (${ticket.betCode || (ticket.rambolito ? 'RS3' : 'TS3')})`;
  
  const reportWindow = window.open('', '_blank', 'width=950,height=950');

  if (!reportWindow) {
    window.print();
    return;
  }

  reportWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(reportNumber)} - Incident Report</title><style>
    :root { color: #172033; font-family: Arial, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e9eff7; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 22px; background: #002b66; color: white; font: 700 12px Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
    .toolbar button { border: 0; border-radius: 6px; padding: 9px 14px; background: #ffd700; color: #002b66; font-weight: 800; cursor: pointer; }
    .paper { width: min(210mm, calc(100% - 32px)); min-height: 297mm; margin: 24px auto; padding: 18mm 18mm 14mm; background: white; box-shadow: 0 4px 20px #002b6626; display: flex; flex-direction: column; }
    .letterhead { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 2px solid #002b66; padding-bottom: 12px; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-logo { width: 68px; height: 50px; object-fit: contain; }
    .company { color: #002b66; font-size: 15px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
    .company-detail { margin-top: 3px; color: #475569; font-size: 10.5px; line-height: 1.35; }
    .stl-logo { width: 68px; height: 50px; object-fit: contain; }
    .classification { align-self: start; padding: 4px 8px; border: 1.5px solid #002b66; color: #002b66; font-size: 9px; font-weight: 900; letter-spacing: .1em; text-align: center; text-transform: uppercase; }
    .heading { display: flex; justify-content: space-between; gap: 16px; margin-top: 14px; padding-bottom: 10px; border-bottom: 2px solid #002b66; }
    .eyebrow { margin: 0 0 3px; color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 0; color: #002b66; font-size: 22px; letter-spacing: .04em; text-transform: uppercase; }
    .report-number { color: #002b66; font: 700 11.5px monospace; line-height: 1.45; text-align: right; }
    .document-control { display: grid; grid-template-columns: 1fr 1fr 1fr; margin-top: 12px; border: 1px solid #cbd5e1; }
    .control { padding: 7px 12px; border-right: 1px solid #cbd5e1; }
    .control:last-child { border-right: 0; }
    .control span { display: block; color: #64748b; font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
    .control strong { display: block; margin-top: 3px; color: #172033; font: 700 11px monospace; }
    .status { margin: 12px 0; padding: 11px 14px; border: 1px solid #fca5a5; border-left: 5px solid #dc2626; background: #fef2f2; color: #991b1b; font-size: 12.5px; line-height: 1.5; }
    .fields { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #cbd5e1; }
    .field { min-height: 52px; padding: 8px 12px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
    .field:nth-child(even) { border-right: 0; }
    .field span { display: block; margin-bottom: 3px; color: #64748b; font-size: 9px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
    .field strong { color: #172033; font-size: 12.5px; }
    .section-title { margin: 14px 0 6px; color: #002b66; font-size: 11.5px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    .section { padding: 11px 14px; border: 1px solid #cbd5e1; }
    .section p { margin: 0; color: #475569; font-size: 12px; line-height: 1.55; text-align: justify; }
    .certification { margin-top: 12px; padding: 11px 14px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-size: 11px; line-height: 1.55; text-align: justify; }
    .signatures-wrap { margin-top: 38px; page-break-inside: avoid; }
    .signatures-top { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .signatures-bottom { display: flex; justify-content: center; margin-top: 24px; }
    .signatures-bottom .signature { width: 50%; max-width: 290px; }
    .signature { display: flex; flex-direction: column; justify-content: space-between; }
    .sig-role { color: #002b66; font-size: 11.5px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 42px; }
    .signatures-bottom .sig-role { text-align: center; }
    .sig-line { border-top: 2px solid #172033; padding-top: 6px; text-align: center; }
    .sig-label { display: block; font-family: 'Times New Roman', Times, Georgia, serif; font-size: 11.5px; font-style: italic; color: #334155; letter-spacing: .01em; }
    .sig-date { display: block; margin-top: 4px; font-family: Arial, sans-serif; color: #64748b; font-size: 9.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
    .footer { margin-top: auto; padding-top: 14px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 9px; font-weight: 700; letter-spacing: .05em; text-align: center; text-transform: uppercase; }
    @media (max-width: 600px) { .toolbar { padding: 10px; } .paper { width: calc(100% - 16px); margin: 8px auto; padding: 16px 12px; } .letterhead, .heading, .fields, .signatures-top, .document-control { grid-template-columns: 1fr; display: grid; } .signatures-bottom .signature { width: 100%; max-width: none; } .classification, .report-number { text-align: left; } .field, .field:nth-child(even) { border-right: 0; } .control { border-right: 0; border-bottom: 1px solid #cbd5e1; } .control:last-child { border-bottom: 0; } }
    @media print { 
      @page { size: A4 portrait; margin: 10mm 14mm 8mm 14mm; } 
      html, body { background: white; margin: 0; padding: 0; height: 100%; } 
      .toolbar { display: none !important; } 
      .paper { 
        width: 100%; 
        max-width: 100%; 
        min-height: calc(297mm - 18mm);
        height: calc(297mm - 18mm);
        margin: 0; 
        padding: 0; 
        box-shadow: none; 
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        page-break-after: avoid; 
        page-break-inside: avoid; 
      } 
      .footer {
        margin-top: auto;
        padding-top: 10px;
      }
    }
  </style></head><body><div class="toolbar"><strong>Incident Report Print Preview</strong><button onclick="window.print()">Print Report</button></div><main class="paper">
    <header class="letterhead"><div class="brand"><img class="brand-logo" src="${window.location.origin}/lbp.png" alt="Lucky Betplay Corporation"><div><div class="company">Lucky Betplay Corporation</div><div class="company-detail">#257 Barlaps, A.S. Fortuna Street,<br>Bakilid, Mandaue City, Cebu 6014</div></div></div><div class="brand"><div class="classification">Confidential<br>Internal Use</div><img class="stl-logo" src="${window.location.origin}/stl.jpg" alt="STL"></div></header>
    <header class="heading"><div><p class="eyebrow">Compliance and Operations</p><h1>Incident Report Issuance</h1></div><div class="report-number">REPORT NO.<br>${escapeHtml(reportNumber)}<br><br>DATE ISSUED<br>${escapeHtml(issuedDate)}</div></header>
    <div class="document-control">${controlValue('Document Type', 'Operational Incident Report')}${controlValue('Classification', 'Internal Compliance Record')}${controlValue('Status', 'For Review and Appropriate Action')}</div>
    <div class="status">This ticket has remained unclaimed for <strong>${escapeHtml(ageInDays)} days</strong> and is eligible for incident report issuance.</div>
    <h2 class="section-title">I. Ticket Identification and Particulars</h2><section class="fields">${reportValue('Transaction ID', transId)}${reportValue('Ticket Date', ticketDate)}${reportValue('Teller / Outlet', ticket.fullName || ticket.outlet || ticket.username)}${reportValue('Draw Schedule', drawSchedule)}${reportValue('Bet Combination', betCombination)}${reportValue('Win Liability', `PHP ${parseFloat(ticket.winAmount ?? 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`)}</section>
    <h2 class="section-title">II. Statement of Incident</h2><section class="section"><p>The listed winning ticket remains unclaimed beyond the prescribed three-day period. This report is issued for monitoring, verification, and appropriate operational follow-up.</p></section>
    <div class="certification"><strong>Certification and Disposition:</strong> This document records the operational finding based on the ticket information available at the time of issuance. It is submitted for review, verification, and determination of the appropriate succeeding action in accordance with applicable company procedures.</div>
    <div class="signatures-wrap">
      <div class="signatures-top">
        <div class="signature">
          <div class="sig-role">Prepared / Issued By:</div>
          <div class="sig-line">
            <span class="sig-label">Signature over Printed Name</span>
            <span class="sig-date">Date: _______________</span>
          </div>
        </div>
        <div class="signature">
          <div class="sig-role">Received / Verified By:</div>
          <div class="sig-line">
            <span class="sig-label">Signature over Printed Name</span>
            <span class="sig-date">Date: _______________</span>
          </div>
        </div>
      </div>
      <div class="signatures-bottom">
        <div class="signature">
          <div class="sig-role">Noted By:</div>
          <div class="sig-line">
            <span class="sig-label">Signature over Printed Name</span>
            <span class="sig-date">Date: _______________</span>
          </div>
        </div>
      </div>
    </div>
    <div class="footer">Lucky Betplay Corporation | STL Mandaue Operations Division | Controlled Internal Record</div>
  </main></body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
};
