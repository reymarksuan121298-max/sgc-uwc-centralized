import { getTicketTransId } from './formatters';

/**
 * Resolve normalized grouping transcode key for settlement tickets.
 */
export const getSettlementTranscodeKey = (item) => {
  if (!item) return '';
  return String(getTicketTransId(item, '') || '').trim();
};

/**
 * Safely parse numeric win amount from camelCase or snake_case ticket fields.
 */
export const getTicketWinAmount = (item) => {
  const val = parseFloat(item?.winAmount ?? item?.win_amount ?? 0);
  return Number.isFinite(val) ? val : 0;
};

/**
 * Round currency value to 2 decimal places to avoid floating-point drift.
 */
const roundCurrency = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

/**
 * Format ordered list of Bet Nos. across multiple rows of the same transcode.
 * Appends betCode if the same bet number appears more than once with distinct codes.
 */
const formatCombinedBetNumbers = (rows) => {
  const rawEntries = rows
    .map((r) => ({
      betNo: String(r?.betNo ?? r?.bet_no ?? r?.CombiNo ?? '').trim(),
      betCode: String(r?.betCode ?? r?.bet_code ?? '').trim()
    }))
    .filter((entry) => entry.betNo);

  if (rawEntries.length === 0) return '';

  const countsByBetNo = rawEntries.reduce((acc, entry) => {
    acc[entry.betNo] = (acc[entry.betNo] || 0) + 1;
    return acc;
  }, {});

  const labels = [];
  rawEntries.forEach(({ betNo, betCode }) => {
    const label = countsByBetNo[betNo] > 1 && betCode ? `${betNo} (${betCode})` : betNo;
    if (!labels.includes(label)) {
      labels.push(label);
    }
  });

  return labels.join(', ');
};

/**
 * Group returned_winnings rows sharing the same transcode into bundled settlement records.
 * Combines bet numbers, unique transaction dates/transcodes, and sums win amounts.
 */
export const groupTicketsByTranscode = (tickets = []) => {
  if (!Array.isArray(tickets) || tickets.length === 0) return [];

  const groups = new Map();

  tickets.forEach((row, index) => {
    if (!row) return;
    const key = getSettlementTranscodeKey(row) || `__ROW_${row.id || index}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(row);
  });

  const bundled = [];

  groups.forEach((rows, transcode) => {
    const base = rows.find((r) => Boolean(r?.settlementTerms)) || rows[0];
    const groupedRowIds = Array.from(new Set(rows.map((r) => r?.id).filter(Boolean)));

    const rawTranscodes = [];
    rows.forEach((r) => {
      const tid = String(r?.transactionId || r?.transId || r?.receipt_no || r?.ticket_no || transcode).trim();
      if (tid) rawTranscodes.push(tid);
    });
    const uniqueTranscodes = Array.from(new Set(rawTranscodes));

    const combinedBetNo = formatCombinedBetNumbers(rows);
    const betNumbers = rows
      .map((r) => String(r?.betNo ?? r?.bet_no ?? r?.CombiNo ?? '').trim())
      .filter(Boolean);

    const transactionDates = Array.from(
      new Set(
        rows
          .map((r) => r?.drawDate || r?.transactionDate || r?.drawTime || r?.created_at)
          .filter(Boolean)
      )
    );

    const totalWinAmount = roundCurrency(
      rows.reduce((sum, r) => sum + getTicketWinAmount(r), 0)
    );

    const primaryOffice =
      base?.sub_office ||
      base?.subOffice ||
      base?.branch ||
      rows.map((r) => r?.sub_office || r?.subOffice || r?.branch).find(Boolean);

    const primaryPayer =
      base?.fullName ||
      base?.outlet ||
      base?.username ||
      rows.map((r) => r?.fullName || r?.outlet || r?.username).find(Boolean);

    bundled.push({
      ...base,
      sub_office: primaryOffice ?? base?.sub_office,
      fullName: primaryPayer ?? base?.fullName,
      transactionId: base?.transactionId || base?.transId || base?.receipt_no || uniqueTranscodes[0] || transcode,
      transcode,
      groupedTickets: rows,
      groupedRowIds,
      ticketCount: rows.length,
      rawTranscodes,
      uniqueTranscodes,
      betNumbers,
      combinedBetNo,
      betNo: combinedBetNo || base?.betNo || base?.CombiNo || '',
      transactionDates,
      winAmount: totalWinAmount,
      totalWinAmount
    });
  });

  return bundled;
};

/**
 * Normalize an individual ticket row into a compact snapshot for storage in settlementTerms
 * and rendering inside the Details of Accountability breakdown table.
 */
const normalizeTicketEntry = (row = {}) => ({
  id: row.id || null,
  transactionId: String(row.transactionId || row.transId || row.receipt_no || row.ticket_no || '').trim(),
  betNo: String(row.betNo ?? row.bet_no ?? row.CombiNo ?? '').trim() || '—',
  betCode: String(row.betCode ?? row.bet_code ?? '').trim(),
  winAmount: roundCurrency(getTicketWinAmount(row)),
  drawTime: row.drawTime || row.draw_time || row.draw || '',
  drawDate: row.drawDate || row.draw_date || row.transactionDate || row.created_at || ''
});

/**
 * Build ordered itemized ticket entries from either live groupedTickets, persisted settlementTerms.bundledTickets,
 * or a fallback single ticket record.
 */
export const buildBundledTicketSnapshot = (source, parsedTerms = null) => {
  if (Array.isArray(source?.groupedTickets) && source.groupedTickets.length > 0) {
    return source.groupedTickets.map(normalizeTicketEntry);
  }
  if (Array.isArray(parsedTerms?.bundledTickets) && parsedTerms.bundledTickets.length > 0) {
    return parsedTerms.bundledTickets.map(normalizeTicketEntry);
  }
  if (source) {
    return [normalizeTicketEntry(source)];
  }
  return [];
};

/**
 * Collect deduplicated payment rows across all returned_winnings row IDs in a bundled agreement.
 */
export const getGroupedPaymentsList = (rowIds = [], paymentsByRowId = {}) => {
  const uniqueIds = Array.from(new Set((rowIds || []).filter(Boolean)));
  const seenPaymentKeys = new Set();
  const collected = [];

  uniqueIds.forEach((id) => {
    const list = paymentsByRowId[id] || [];
    list.forEach((payment, idx) => {
      const pKey = payment?.id || `${id}_${payment?.paymentDate || ''}_${payment?.paymentAmount || ''}_${idx}`;
      if (!seenPaymentKeys.has(pKey)) {
        seenPaymentKeys.add(pKey);
        collected.push(payment);
      }
    });
  });

  return collected.sort((a, b) => new Date(b?.paymentDate || 0) - new Date(a?.paymentDate || 0));
};

/**
 * Sum total payments recorded across all returned_winnings row IDs in a bundled agreement.
 */
export const sumGroupedPayments = (rowIds = [], paymentsByRowId = {}) => {
  const list = getGroupedPaymentsList(rowIds, paymentsByRowId);
  return roundCurrency(list.reduce((sum, p) => sum + (parseFloat(p?.paymentAmount || 0) || 0), 0));
};

