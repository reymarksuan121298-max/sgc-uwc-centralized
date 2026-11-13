import { buildBundledTicketSnapshot, getTicketWinAmount } from '../../utils/settlementAggregation';

/**
 * Shared 1. DETAILS OF ACCOUNTABILITY section rendered in both SettlementAgreement
 * (Create / Print) and SettlementDetailsModal (View Saved Agreement).
 * Displays combined summary fields plus an itemized breakdown when multiple rows share a transcode.
 */
export default function AccountabilityDetailsTable({
  ticket,
  parsedTerms = null,
  formatTransactionDate,
  emptyFallback = '—'
}) {
  const entries = buildBundledTicketSnapshot(ticket, parsedTerms);
  const isBundled = entries.length > 1;

  const uniqueTranscodes = Array.from(
    new Set(
      entries
        .map((e) => e.transactionId)
        .filter(Boolean)
    )
  );
  const fallbackTid = ticket?.transactionId || ticket?.transId || ticket?.receipt_no || emptyFallback;
  const transcodeDisplay = uniqueTranscodes.length > 0 ? uniqueTranscodes.join(', ') : fallbackTid;

  const formattedDates = Array.from(
    new Set(
      entries
        .map((e) => e.drawDate || e.drawTime)
        .filter(Boolean)
        .map((d) => (formatTransactionDate ? formatTransactionDate(d) : d))
    )
  );
  const fallbackDate = formatTransactionDate
    ? formatTransactionDate(ticket?.drawDate || ticket?.transactionDate || ticket?.drawTime || ticket?.created_at)
    : (ticket?.drawDate || ticket?.transactionDate || ticket?.created_at || emptyFallback);
  const dateDisplay = formattedDates.length > 0 ? formattedDates.join(' / ') : fallbackDate;

  const betLabels = [];
  const betCounts = entries.reduce((acc, e) => {
    if (e.betNo && e.betNo !== '—') acc[e.betNo] = (acc[e.betNo] || 0) + 1;
    return acc;
  }, {});
  entries.forEach((e) => {
    if (!e.betNo || e.betNo === '—') return;
    const label = betCounts[e.betNo] > 1 && e.betCode ? `${e.betNo} (${e.betCode})` : e.betNo;
    if (!betLabels.includes(label)) betLabels.push(label);
  });
  const combinedBetDisplay = betLabels.length > 0
    ? betLabels.join(', ')
    : (ticket?.combinedBetNo || ticket?.betNo || ticket?.CombiNo || emptyFallback);

  const summedTotal = entries.length > 0
    ? entries.reduce((sum, e) => sum + getTicketWinAmount(e), 0)
    : getTicketWinAmount(ticket);
  const resolvedTotal = Math.round(
    (parseFloat(entries.length > 1 ? summedTotal : (ticket?.totalWinAmount ?? summedTotal)) || 0) * 100
  ) / 100;

  return (
    <div className="space-y-2.5">
      <table className="w-full text-xs border-collapse border border-slate-300">
        <tbody>
          <tr>
            <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50 w-1/3">
              Transaction ID
            </td>
            <td className="border border-slate-300 px-3 py-1.5 font-mono font-bold text-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <span>{transcodeDisplay}</span>
                {isBundled && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-[#002B66] border border-blue-200 font-sans text-[10px] font-black uppercase print:hidden">
                    {entries.length} Entries Bundled
                  </span>
                )}
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50">
              Transaction Date
            </td>
            <td className="border border-slate-300 px-3 py-1.5 font-mono text-slate-900">
              {dateDisplay}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50">
              Winning Combination / Bet No.
            </td>
            <td className="border border-slate-300 px-3 py-1.5 font-mono font-bold text-slate-900">
              {combinedBetDisplay}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-600 bg-slate-50">
              Total Winning Amount
            </td>
            <td className="border border-slate-300 px-3 py-1.5 font-mono font-extrabold text-emerald-700">
              PHP {resolvedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
