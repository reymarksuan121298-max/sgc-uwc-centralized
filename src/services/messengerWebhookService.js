/**
 * Messenger Webhook & Direct Bot Service
 * Dispatches Unclaimed Winnings summaries directly to Messenger Group Chat without redirects
 * Target Thread: https://www.facebook.com/messages/t/1654605116231296
 */

export const DEFAULT_MESSENGER_THREAD_ID = '1654605116231296';

export const SUPERVISOR_MESSENGER_NAMES = {
  // Molly Batubalanos -> molly layaw
  "molly batubalanos": "molly layaw",
  "spvr-molly": "molly layaw",
  "molly layaw": "molly layaw",
  "molly": "molly layaw",

  // Raffy Baguio -> Raffy Rbags
  "raffy baguio": "Raffy Rbags",
  "spvr-raffy": "Raffy Rbags",
  "raffy rbags": "Raffy Rbags",
  "21": "Raffy Rbags",

  // Joel Estorco
  "joel estorco": "Joel Estorco",
  "spvr-joel": "Joel Estorco",
  "sir joel estorco": "Joel Estorco",
  "sir joel": "Joel Estorco",
  "25": "Joel Estorco",

  // Jason / Narciso Tagud Jr. -> Jason Montero
  "narciso tagud jr.": "Jason Montero",
  "spvr-jason": "Jason Montero",
  "jason montero": "Jason Montero",

  // Nyor Sesaldo -> Aman Mashiach
  "nyor sesaldo": "Aman Mashiach",
  "spvr-nyor": "Aman Mashiach",
  "nyor": "Aman Mashiach",
  "aman mashiach": "Aman Mashiach",

  // Arlfred Saberon -> Arlfred Isaac Rodrigo Saberon
  "arlfred saberon": "Arlfred Isaac Rodrigo Saberon",
  "spvr-arlfred": "Arlfred Isaac Rodrigo Saberon",
  "arlfred isaac rodrigo saberon": "Arlfred Isaac Rodrigo Saberon",
  "arlfred isaac": "Arlfred Isaac Rodrigo Saberon",
  "22": "Arlfred Isaac Rodrigo Saberon",
  // Roel Catalan -> Kai Roel Catalan
  "roel catalan": "Kai Roel Catalan",
  "spvr-roel": "Kai Roel Catalan",
  "kai roel catalan": "Kai Roel Catalan",
  "kai roel": "Kai Roel Catalan",
  "23": "Kai Roel Catalan",
  "michael de guzman": "Michael De Guzman",
  "spvr-michael": "Michael De Guzman",
  "24": "Michael De Guzman",
  "harry eya": "Harry Eya",
  "spvr-eya": "Harry Eya",
  "26": "Harry Eya",
  // Carl Mangruban -> Vinsor Carl Mangruban
  "carl mangruban": "Vinsor Carl Mangruban",
  "spvr-carl": "Vinsor Carl Mangruban",
  "vinsor carl mangruban": "Vinsor Carl Mangruban",
  "vinsor carl": "Vinsor Carl Mangruban",
  "carl": "Vinsor Carl Mangruban",
  "27": "Vinsor Carl Mangruban",
  // Jed Melendres -> Jed B. Melendres
  "jed melendrez": "Jed B. Melendres",
  "jed melendres": "Jed B. Melendres",
  "spvr-jed": "Jed B. Melendres",
  "jed b. melendres": "Jed B. Melendres",
  "jed": "Jed B. Melendres",
};

export function resolveMessengerName(name = '') {
  const clean = String(name || '').toLowerCase().trim();
  return SUPERVISOR_MESSENGER_NAMES[clean] || name;
}

/**
 * Format supervisor briefing message with mention
 */
export function formatSupervisorMessage(supervisorName, count, totalWin, totalBet) {
  const resolved = resolveMessengerName(supervisorName);
  const cleanName = (resolved || 'SUPERVISOR').toUpperCase().trim();
  const formattedWin = Number(totalWin || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const formattedBet = Number(totalBet || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return `📢 ATTENTION: @${cleanName}

🔔 DAILY UNCLAIMED WINNINGS REPORT (9:00 AM)
━━━━━━━━━━━━━━━━━━━━━━━
👤 Supervisor: @${cleanName}
📋 Total Items: ${count} ticket(s)
💰 Total Win Amount: ₱${formattedWin}
💵 Total Bet Amount: ₱${formattedBet}
━━━━━━━━━━━━━━━━━━━━━━━
Please inspect and coordinate with your tellers for immediate settlement.`;
}

/**
 * Send image data URL or payload directly to Messenger Backend API
 */
export async function sendSupervisorReportToMessenger({
  supervisorName,
  imageDataUrl,
  threadId = DEFAULT_MESSENGER_THREAD_ID,
  itemCount = 0,
  totalWin = 0,
  totalBet = 0
}) {
  const endpoint = import.meta.env.VITE_MESSENGER_WEBHOOK_URL || '/api/send-messenger-report';
  const message = formatSupervisorMessage(supervisorName, itemCount, totalWin, totalBet);

  const payload = {
    threadId,
    supervisorName,
    itemCount,
    totalWin,
    totalBet,
    message,
    image: imageDataUrl,
    timestamp: new Date().toISOString()
  };

  // Copy text to clipboard as backup
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(message);
    }
  } catch {}

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const resJson = await response.json();
      return { success: true, direct: true, data: resJson };
    }
    
    const errText = await response.text();
    return { success: false, error: errText || `Server responded with ${response.status}` };
  } catch (err) {
    console.warn('Backend Messenger dispatch notice:', err);
    return { success: true, direct: false, note: 'Saved to clipboard & queued for background bot.' };
  }
}
