/**
 * Daily Supervisor Unclaimed Winnings Bot
 * Scheduled: Everyday at 9:00 AM Philippine Standard Time (0 9 * * *)
 * Target Messenger Thread: https://www.facebook.com/messages/t/1654605116231296
 *
 * Requirements:
 * npm install node-cron puppeteer @supabase/supabase-js dotenv form-data node-fetch
 *
 * To run:
 * node scripts/dailySupervisorMessengerBot.js
 */

import cron from 'node-cron';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const GROUP_THREAD_ID = process.env.MESSENGER_GROUP_THREAD_ID || '1654605116231296';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

/**
 * Map supervisor internal names / keys to their exact Facebook Messenger display names
 */
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

/**
 * Optional: Map supervisor names to their Facebook User IDs or Profile tags
 * This allows Facebook Messenger to highlight them in blue and trigger direct push notifications.
 */
export const SUPERVISOR_FB_IDS = {
  "molly layaw": process.env.FB_ID_MOLLY || "",
  "molly batubalanos": process.env.FB_ID_MOLLY || "",
  "raffy rbags": process.env.FB_ID_RAFFY || "",
  "raffy baguio": process.env.FB_ID_RAFFY || "",
  "joel estorco": process.env.FB_ID_JOEL || "",
  "arlfred saberon": process.env.FB_ID_ARLFRED || "",
  "roel catalan": process.env.FB_ID_ROEL || "",
  "michael de guzman": process.env.FB_ID_MICHAEL || "",
  "harry eya": process.env.FB_ID_EYA || "",
  "vinsor carl mangruban": process.env.FB_ID_CARL || "",
  "carl mangruban": process.env.FB_ID_CARL || "",
  "jed b. melendres": process.env.FB_ID_JED || "",
  "jed melendres": process.env.FB_ID_JED || "",
  "jed melendrez": process.env.FB_ID_JED || "",
  "aman mashiach": process.env.FB_ID_AMAN || process.env.FB_ID_NYOR || "",
  "nyor sesaldo": process.env.FB_ID_AMAN || process.env.FB_ID_NYOR || "",
  "jason montero": process.env.FB_ID_JASON || "",
  "narciso tagud jr.": process.env.FB_ID_JASON || "",
};

export function getMessengerSupervisorName(name = '') {
  const clean = String(name || '').toLowerCase().trim();
  return SUPERVISOR_MESSENGER_NAMES[clean] || name;
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️ Warning: Supabase credentials not found in environment variables. Please check your .env file.');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

/**
 * Fetch unresolved unclaimed winnings records
 */
async function fetchUnclaimedTickets() {
  try {
    const { data, error } = await supabase
      .from('returned_winnings')
      .select('*')
      .neq('unclaimed_approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error querying returned_winnings:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Failed to fetch unclaimed tickets:', err);
    return [];
  }
}

/**
 * Build HTML table matching UnclaimedRegistry.jsx design
 */
function buildHtmlCard(supervisorName, tickets) {
  const totalWin = tickets.reduce((sum, t) => sum + Number(t.winning_amount || t.win_amount || t.winAmount || 0), 0);
  const totalBet = tickets.reduce((sum, t) => sum + Number(t.total_bet || t.bet_amount || t.betAmount || 10), 0);

  const rows = tickets.map((t, idx) => {
    const isWarning = t.is_two_days || t.incident_report_eligible || (idx % 2 === 0);
    const rowBg = isWarning ? '#fff1f2' : '#ffffff';
    const borderCol = isWarning ? '#fecdd3' : '#f1f5f9';

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid ${borderCol}; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px;">
        <td style="padding: 10px 14px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
          ${t.teller || t.agent || t.terminal_id || 'TELLER'}
        </td>
        <td style="padding: 10px 14px; font-weight: 800; color: #002B66;">
          ${t.transaction_id || t.trans_id || t.transId || '000000-XXXXXX'}
          <span style="display: inline-block; margin-left: 4px; color: #ef4444; font-size: 12px;">⚠️</span>
        </td>
        <td style="padding: 10px 14px; color: #334155;">
          ${t.draw_time || '5PM'} ${t.draw_date || t.date || '2026-09-14'}
        </td>
        <td style="padding: 10px 14px; font-weight: 800; color: #0f172a;">
          ${t.bet_number || t.betNo || '825'}
        </td>
        <td style="padding: 10px 14px; color: #475569;">
          ${t.game_type || t.game || 'RS3'}
        </td>
        <td style="padding: 10px 14px; font-weight: 800; color: #0f172a;">
          ₱${Number(t.total_bet || t.bet_amount || 10).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </td>
        <td style="padding: 10px 14px; font-weight: 900; color: #047857;">
          ₱${Number(t.winning_amount || t.win_amount || 833).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            padding: 16px;
            width: 1000px;
          }
          .card {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          }
          .header {
            background-color: #f1f5f9;
            padding: 12px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
            font-family: monospace;
          }
          .header-title {
            color: #002B66;
            font-weight: 900;
            font-size: 13px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .badge {
            background: #dbeafe;
            color: #002B66;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead tr {
            background-color: #002B66;
            color: #ffffff;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          th {
            padding: 10px 14px;
            text-align: left;
            border-right: 1px solid #001f4d;
          }
          th:last-child { border-right: none; }
          .footer {
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 10px 18px;
            display: flex;
            justify-content: space-between;
            font-family: monospace;
            font-size: 12px;
            font-weight: 800;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="header-title">🧑‍💼 SUPERVISOR: ${supervisorName.toUpperCase()}</div>
            <div class="badge">${tickets.length} ITEMS</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 22%;">TELLER</th>
                <th style="width: 20%;">TRANS. ID</th>
                <th style="width: 18%;">DRAW</th>
                <th style="width: 10%;">BET NO.</th>
                <th style="width: 8%;">CODE</th>
                <th style="width: 11%;">BET AMOUNT</th>
                <th style="width: 11%;">WIN AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">
            <span style="color: #002B66; text-transform: uppercase;">SUBTOTAL - ${supervisorName.toUpperCase()}</span>
            <div>
              <span style="color: #334155; margin-right: 16px;">Bet: ₱${totalBet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span style="color: #047857; font-weight: 900;">Win: ₱${totalWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Capture high-res screenshot
 */
async function captureTableImage(html) {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : null
  ];
  let execPath;
  for (const p of possiblePaths) {
    if (p && (await import('fs')).default.existsSync(p)) {
      execPath = p;
      break;
    }
  }

  const launchOpts = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  if (execPath) launchOpts.executablePath = execPath;

  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1040, height: 800, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const cardEl = await page.$('.card');
    const imageBuffer = await cardEl.screenshot({ type: 'png' });
    return imageBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Dispatch message and attachment to Messenger Group Chat
 */
async function dispatchToMessenger(supervisorName, imageBuffer, itemCount, totalWin) {
  const messengerDisplayName = getMessengerSupervisorName(supervisorName);
  const cleanName = messengerDisplayName.trim().toUpperCase();
  const fbUserId = SUPERVISOR_FB_IDS[messengerDisplayName.toLowerCase().trim()] || SUPERVISOR_FB_IDS[supervisorName.toLowerCase().trim()] || '';

  const mentionHeader = `📢 ATTENTION: @${cleanName}`;
  const mentionText = `${mentionHeader}\n\nGood morning! Here is your daily Unclaimed Winnings Report for today at 9:00 AM.\n\n📊 SUMMARY:\n• Supervisor: @${cleanName}\n• Pending Tickets: ${itemCount}\n• Total Win Amount: ₱${Number(totalWin).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\nPlease review the attached breakdown below and follow up with your assigned tellers.`;

  console.log(`\n======================================================`);
  console.log(`[MESSENGER DISPATCH] Target Thread: ${GROUP_THREAD_ID}`);
  console.log(`Tagging: @${cleanName} ${fbUserId ? `(FB User ID: ${fbUserId})` : ''}`);
  console.log(`Items: ${itemCount} | Win: ₱${totalWin}`);
  console.log(`======================================================`);

  if (FB_PAGE_ACCESS_TOKEN) {
    try {
      // Send message via Meta Graph API
      const FormData = (await import('form-data')).default;
      const fetch = (await import('node-fetch')).default;

      const messagePayload = {
        text: mentionText
      };

      // If FB User ID is known, add explicit mention object
      if (fbUserId) {
        messagePayload.mentions = [
          {
            offset: mentionText.indexOf(`@${cleanName}`),
            length: cleanName.length + 1,
            id: fbUserId
          }
        ];
      }

      const form = new FormData();
      form.append('recipient', JSON.stringify({ thread_key: GROUP_THREAD_ID }));
      form.append('message', JSON.stringify(messagePayload));
      form.append('filedata', imageBuffer, { filename: `unclaimed_${cleanName.replace(/\s+/g, '_')}.png` });

      const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
        method: 'POST',
        body: form
      });

      const json = await res.json();
      console.log('Graph API response:', json);
    } catch (err) {
      console.error('Failed to dispatch via Graph API, trying direct automation:', err);
      try {
        const { sendDirectToMessengerGroup } = await import('./messengerDirectAutomation.js');
        await sendDirectToMessengerGroup({
          threadId: GROUP_THREAD_ID,
          message: mentionText,
          imageBuffer
        });
      } catch (autoErr) {
        console.error('Direct automation error:', autoErr);
      }
    }
  } else {
    // Direct Puppeteer browser automation
    try {
      const { sendDirectToMessengerGroup } = await import('./messengerDirectAutomation.js');
      await sendDirectToMessengerGroup({
        threadId: GROUP_THREAD_ID,
        message: mentionText,
        imageBuffer
      });
    } catch (autoErr) {
      console.error('Direct automation error:', autoErr);
    }
  }
}

/**
 * Main Daily Execution Workflow
 */
export async function executeDailyWorkflow() {
  console.log(`[${new Date().toLocaleString()}] 🚀 Initiating Daily 9:00 AM Unclaimed Registry Bot Workflow...`);

  const tickets = await fetchUnclaimedTickets();
  if (!tickets || tickets.length === 0) {
    console.log('No unclaimed tickets found today.');
    return;
  }

  // Group tickets per supervisor
  const grouped = {};
  for (const t of tickets) {
    const rawSpvr = t.supervisor_name || t.supervisor || (t.sub_office ? `spvr-${t.sub_office.toLowerCase()}` : 'MOLLY BATUBALANOS');
    const spvr = getMessengerSupervisorName(rawSpvr);
    if (!grouped[spvr]) grouped[spvr] = [];
    grouped[spvr].push(t);
  }

  for (const [supervisorName, spvrTickets] of Object.entries(grouped)) {
    console.log(`Processing report for Supervisor: ${supervisorName} (${spvrTickets.length} items)...`);
    const html = buildHtmlCard(supervisorName, spvrTickets);
    const imageBuffer = await captureTableImage(html);
    const totalWin = spvrTickets.reduce((sum, t) => sum + Number(t.winning_amount || t.win_amount || t.winAmount || 0), 0);

    await dispatchToMessenger(supervisorName, imageBuffer, spvrTickets.length, totalWin);
  }

  console.log('✅ Daily 9:00 AM Workflow completed successfully.');
}

// ⏰ Scheduled to run daily at 9:00 AM Philippine Standard Time (0 9 * * *)
cron.schedule('0 9 * * *', () => {
  executeDailyWorkflow().catch(console.error);
}, {
  timezone: "Asia/Manila"
});

console.log(`🤖 Daily Supervisor Messenger Bot is active and scheduled for 9:00 AM daily (Asia/Manila).`);
console.log(`Target Group Chat: https://www.facebook.com/messages/t/${GROUP_THREAD_ID}`);

// If run directly with `node scripts/dailySupervisorMessengerBot.js --now`, trigger immediately
if (process.argv.includes('--now')) {
  executeDailyWorkflow();
}
