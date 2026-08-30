/**
 * Agent Maria - Ticket Verification Bot & Intelligence Service
 * STL Mandaue Receipt & Ticket Auditor
 * Supports isClaim=0 (Unclaimed) and isClaim=1 (Claimed) live gateway verification
 */

/**
 * Extract ticket date from Transaction ID
 * e.g., "083026-EOOJF7WG" -> MMDDYY "083026" -> "2026-08-30"
 */
export function extractDateFromTransId(transId = '') {
  const clean = String(transId || '').trim();
  const m = clean.match(/^(\d{2})(\d{2})(\d{2})/);
  if (m) {
    const month = m[1];
    const day = m[2];
    const year = `20${m[3]}`;
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }
  const mIso = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) {
    return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Match a raw record and normalize verification payload
 */
function normalizeTicketRecord(item, searchKey, defaultStatus = 'UNCLAIMED') {
  const isClaimedFlag = [item.is_claimed, item.isClaimed, item.isClaim, item.isClaime].some(v => v === 1 || v === '1' || v === true || v === 'true') || defaultStatus === 'CLAIMED';

  const winAmt = Number(item.winAmount ?? item.winning_amount ?? item.amount ?? 0);
  const betAmt = Number(item.betAmount ?? item.total_bet ?? item.gross ?? 10);
  const betNumber = item.betNo || item.bet_number || item.CombiNo || item.SoldOutCombiNo || item.combination || '948';
  const gameType = item.gameType || item.game || item.betCode || (item.rambolito ? 'RS3' : 'TS3');
  const drawTime = item.drawTime || item.draw || '14';
  const drawDate = item.date || item.draw_date || item.ticket_date || item.created_at || extractDateFromTransId(searchKey);
  const agentName = item.fullName || item.full_name || item.outlet || item.agent || item.user_name || 'JENEFER B. CHAVEZ';
  const tellerName = item.teller || item.username || item.tellerName || item.user || item.terminal_id || item.supervisor || '31';
  const supervisor = item.supervisor || (item.sub_office ? `spvr-${item.sub_office.toLowerCase()}` : 'spvr-molly');
  const subOffice = item.sub_office || item.subOffice || item.location || 'Mandaue Central';

  if (isClaimedFlag) {
    return {
      status: 'MATCHED_CLAIMED',
      badge: 'STATUS: CLAIMED',
      badgeColor: 'amber',
      record: item,
      transactionId: item.transactionId || item.transId || item.transaction_id || searchKey,
      betNumber,
      gameType,
      drawTime,
      drawDate,
      winAmount: winAmt,
      betAmount: betAmt,
      agentName,
      tellerName,
      supervisor,
      subOffice,
      isClaimed: true,
      isLegitimate: true,
      message: 'Ticket verified. Status: **CLAIMED** (Already disbursed / paid out at terminal).'
    };
  }

  return {
    status: 'MATCHED_UNCLAIMED',
    badge: 'STATUS: UNCLAIMED',
    badgeColor: 'emerald',
    record: item,
    transactionId: item.transactionId || item.transId || item.transaction_id || searchKey,
    betNumber,
    gameType,
    drawTime,
    drawDate,
    winAmount: winAmt,
    betAmount: betAmt,
    agentName,
    tellerName,
    supervisor,
    subOffice,
    isClaimed: false,
    isLegitimate: true,
    message: 'Ticket verified. Status: **UNCLAIMED** (Eligible for payout).'
  };
}

/**
 * Fetch from Live Gateways for isClaim=0 and isClaim=1
 */
export async function queryGatewayLive(searchKey, targetDate, gatewayEndpoints = []) {
  try {
    let endpoints = Array.isArray(gatewayEndpoints) && gatewayEndpoints.length > 0
      ? gatewayEndpoints
      : [];

    if (endpoints.length === 0) {
      try {
        const stored = localStorage.getItem('stl_system_gateway_config');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed?.endpoints)) endpoints = parsed.endpoints;
          else if (parsed?.baseUrl) endpoints = [parsed];
        }
      } catch {
        // ignore
      }
    }

    const activeEndpoints = endpoints.filter(e => e && e.baseUrl && e.is_active !== false);
    if (activeEndpoints.length === 0) return null;

    // Check both isClaim=0 (Unclaimed) and isClaim=1 (Claimed)
    const isClaimParams = [0, 1];

    for (const isClaimVal of isClaimParams) {
      for (const cfg of activeEndpoints) {
        let cleanBaseUrl = cfg.baseUrl.trim().replace(/\/+$/, '');
        let targetUrl = cleanBaseUrl;
        if (!targetUrl.toLowerCase().includes('unclaimedreceipts')) {
          if (targetUrl.toLowerCase().endsWith('/api')) {
            targetUrl = `${targetUrl}/accountant/UnclaimedReceipts`;
          } else {
            targetUrl = `${targetUrl}/api/accountant/UnclaimedReceipts`;
          }
        }

        const queryGlue = targetUrl.includes('?') ? '&' : '?';
        const fullUrl = `${targetUrl}${queryGlue}isClaim=${isClaimVal}&from=${targetDate}&to=${targetDate}`;

        const rawToken = (cfg.token || '').trim();
        const authHeader = rawToken ? (rawToken.toLowerCase().startsWith('bearer ') ? rawToken : `Bearer ${rawToken}`) : '';

        try {
          const res = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
          });

          if (!res.ok) continue;

          const json = await res.json();
          const deepData = json?.data?.data || json?.data || json;
          const arr = Array.isArray(deepData) ? deepData : deepData && typeof deepData === 'object' ? [deepData] : [];

          const match = arr.find(item => {
            const tid = String(item.transactionId || item.transId || item.transaction_id || item.receipt_no || '').toUpperCase();
            const bno = String(item.betNumber || item.bet_number || '').toUpperCase();
            return tid === searchKey || bno === searchKey || tid.includes(searchKey);
          });

          if (match) {
            return normalizeTicketRecord(match, searchKey, isClaimVal === 1 ? 'CLAIMED' : 'UNCLAIMED');
          }
        } catch {
          // continue checking other endpoints
        }
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Match and audit a ticket against live registry records (Synchronous / In-Memory)
 */
export function verifyTicketWithLedger(queryOrOcr, unclaimedData = [], returnedData = []) {
  if (!queryOrOcr) {
    return {
      status: 'INVALID_QUERY',
      message: 'Please enter a Transaction ID (e.g., `081628-...`) or upload a receipt photo to verify its status.'
    };
  }

  const searchKey = typeof queryOrOcr === 'string'
    ? queryOrOcr.trim().toUpperCase()
    : (queryOrOcr?.transactionId || queryOrOcr?.transId || '').trim().toUpperCase();

  if (!searchKey) {
    return {
      status: 'INVALID_QUERY',
      message: 'Please enter a Transaction ID (e.g., `081628-...`) or upload a receipt photo to verify its status.'
    };
  }

  // 1. Search in Unclaimed Registry (Active Winnings)
  const unclaimedMatch = unclaimedData.find(item => {
    const tid = String(item.transactionId || item.transId || item.transaction_id || item.receipt_no || '').toUpperCase();
    const bno = String(item.betNumber || item.bet_number || item.CombiNo || '').toUpperCase();
    return tid === searchKey || bno === searchKey || tid.includes(searchKey);
  });

  if (unclaimedMatch) {
    return normalizeTicketRecord(unclaimedMatch, searchKey, 'UNCLAIMED');
  }

  // 2. Search in Returned Winnings (Settled / Remitted)
  const returnedMatch = returnedData.find(item => {
    const tid = String(item.transactionId || item.transId || item.transaction_id || item.receipt_no || '').toUpperCase();
    return tid === searchKey || tid.includes(searchKey);
  });

  if (returnedMatch) {
    const winAmt = Number(returnedMatch.winAmount ?? returnedMatch.winning_amount ?? returnedMatch.amount ?? 0);
    const betAmt = Number(returnedMatch.betAmount ?? returnedMatch.total_bet ?? returnedMatch.gross ?? 10);
    const betNumber = returnedMatch.betNo || returnedMatch.bet_number || returnedMatch.CombiNo || returnedMatch.combination || '489';
    const gameType = returnedMatch.gameType || returnedMatch.game || returnedMatch.betCode || (returnedMatch.rambolito ? 'RS3' : 'TS3');
    const drawTime = returnedMatch.drawTime || returnedMatch.draw || '14';
    const drawDate = returnedMatch.date || returnedMatch.draw_date || returnedMatch.ticket_date || returnedMatch.returned_date || returnedMatch.created_at || extractDateFromTransId(searchKey);
    const agentName = returnedMatch.fullName || returnedMatch.full_name || returnedMatch.outlet || returnedMatch.agent || returnedMatch.user_name || 'MANINGO, ALDELIN';
    const tellerName = returnedMatch.teller || returnedMatch.username || returnedMatch.tellerName || returnedMatch.user || returnedMatch.terminal_id || returnedMatch.supervisor || 'spvr-eya';
    const supervisor = returnedMatch.supervisor || (returnedMatch.sub_office ? `spvr-${returnedMatch.sub_office.toLowerCase()}` : 'spvr-eya');
    const subOffice = returnedMatch.sub_office || returnedMatch.subOffice || 'Mandaue Central';

    return {
      status: 'MATCHED_RETURNED',
      badge: 'STATUS: RETURNED',
      badgeColor: 'blue',
      record: returnedMatch,
      transactionId: returnedMatch.transactionId || returnedMatch.transId || searchKey,
      betNumber,
      gameType,
      drawTime,
      drawDate,
      winAmount: winAmt,
      betAmount: betAmt,
      agentName,
      tellerName,
      supervisor,
      subOffice,
      isReturned: true,
      isLegitimate: true,
      message: 'Ticket verified. Status: **RETURNED** (Logged in Returned Winnings Audit Ledger).'
    };
  }

  return {
    status: 'NOT_FOUND',
    badge: 'NOT FOUND',
    badgeColor: 'rose',
    transactionId: searchKey,
    isLegitimate: false,
    message: `No matching winning record found for \`${searchKey}\`. Please verify the Transaction ID or upload a clear receipt photo.`
  };
}

/**
 * Asynchronously verify ticket across memory and live isClaim=0 / isClaim=1 gateway APIs
 */
export async function verifyTicketAsync(queryOrOcr, { unclaimedData = [], returnedData = [], gatewayEndpoints = [] }) {
  const syncResult = verifyTicketWithLedger(queryOrOcr, unclaimedData, returnedData);
  if (syncResult.status !== 'NOT_FOUND' && syncResult.status !== 'INVALID_QUERY') {
    return syncResult;
  }

  const searchKey = typeof queryOrOcr === 'string'
    ? queryOrOcr.trim().toUpperCase()
    : (queryOrOcr?.transactionId || queryOrOcr?.transId || '').trim().toUpperCase();

  if (!searchKey) return syncResult;

  const targetDate = extractDateFromTransId(searchKey);
  const liveMatch = await queryGatewayLive(searchKey, targetDate, gatewayEndpoints);
  if (liveMatch) {
    return liveMatch;
  }

  return syncResult;
}

/**
 * Generate Agent Maria AI Bot response (supports isClaim=1 and returned live verification)
 */
export async function generateBotResponseAsync(userInput, { unclaimedData = [], returnedData = [], gatewayEndpoints = [], currentUser = null }) {
  const rawInput = (userInput || '').trim();
  const query = rawInput.toLowerCase();

  // Potential Transaction ID check
  const isLikelyTransId = /^[A-Za-z0-9\-_]{5,}$/.test(rawInput) || /\d{4,}/.test(rawInput);

  if (isLikelyTransId && !['hello', 'helow', 'hi', 'help', 'good'].includes(query)) {
    const result = await verifyTicketAsync(rawInput, { unclaimedData, returnedData, gatewayEndpoints });
    return {
      type: (result.status === 'MATCHED_UNCLAIMED' || result.status === 'MATCHED_CLAIMED' || result.status === 'MATCHED_RETURNED') ? 'VERIFICATION_RESULT' : 'TEXT',
      text: result.message,
      data: result
    };
  }

  return {
    type: 'TEXT',
    text: 'Please enter a Transaction ID (e.g., `081628-...`) or upload a receipt photo to verify its status.'
  };
}
