/**
 * Direct Facebook Messenger Automation Engine (Puppeteer)
 * Automates sending messages + images directly to Messenger Group Chat (1654605116231296)
 *
 * Commands:
 * 1. One-time FB Login setup:
 *    node scripts/messengerDirectAutomation.js --login
 *
 * 2. Send test message:
 *    node scripts/messengerDirectAutomation.js --test
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USER_DATA_DIR = path.resolve(__dirname, '.fb_profile');
const DEFAULT_THREAD_ID = '1654605116231296';

// Ensure user data directory exists
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

/**
 * Detect locally installed Chrome or Edge on Windows
 */
export function getExecutablePath() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : null
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

/**
 * Launches Puppeteer with persistent Facebook session
 */
export async function launchBrowser({ headless = true } = {}) {
  const execPath = getExecutablePath();
  const launchOptions = {
    headless: headless ? 'new' : false,
    userDataDir: USER_DATA_DIR,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-notifications',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800'
    ]
  };

  if (execPath) {
    launchOptions.executablePath = execPath;
  }

  return await puppeteer.launch(launchOptions);
}

/**
 * One-time Login Helper
 * Opens Chrome visibly so you can log in to Facebook once.
 */
export async function setupLogin() {
  console.log('🚀 Opening Chrome for Facebook login...');
  console.log('👉 Please log in to Facebook in the opened browser window.');
  console.log('👉 Once logged in and on Messenger, close the browser window.');

  const browser = await launchBrowser({ headless: false });
  const page = await browser.newPage();
  await page.goto(`https://www.facebook.com/messages/t/${DEFAULT_THREAD_ID}`, {
    waitUntil: 'networkidle2'
  });

  console.log('✅ Browser opened. Log in to Facebook now.');
}

/**
 * Directly sends a message and image buffer to Facebook Messenger Group Chat
 */
export async function sendDirectToMessengerGroup({
  threadId = DEFAULT_THREAD_ID,
  message = '',
  imageBuffer = null
}) {
  console.log(`\n🤖 [AUTOMATION] Starting direct send to Messenger thread: ${threadId}...`);
  const browser = await launchBrowser({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Go directly to Messenger Group Chat
    const threadUrl = `https://www.facebook.com/messages/t/${threadId}`;
    await page.goto(threadUrl, { waitUntil: 'networkidle2', timeout: 45000 });

    // Check if redirected to login page
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('checkpoint')) {
      console.error('❌ Facebook is not logged in! Please run `node scripts/messengerDirectAutomation.js --login` once to log in.');
      await browser.close();
      return { success: false, error: 'Facebook session not logged in. Please run login setup.' };
    }

    // Wait for the message input box
    console.log('🔍 Locating Messenger chat input...');
    await page.waitForSelector('[role="textbox"], [contenteditable="true"], div[aria-label="Message"]', { timeout: 20000 });

    // 1. Attach image if provided
    if (imageBuffer) {
      console.log('📸 Uploading image attachment...');
      const tempImgPath = path.resolve(__dirname, `temp_report_${Date.now()}.png`);
      fs.writeFileSync(tempImgPath, imageBuffer);

      try {
        const fileInputSelector = 'input[type="file"][accept*="image"], input[type="file"]';
        const fileInput = await page.$(fileInputSelector);
        if (fileInput) {
          await fileInput.uploadFile(tempImgPath);
          // Allow time for image preview upload
          await new Promise(r => setTimeout(r, 2500));
        }
      } catch (uploadErr) {
        console.warn('⚠️ File input upload notice:', uploadErr.message);
      } finally {
        if (fs.existsSync(tempImgPath)) {
          fs.unlinkSync(tempImgPath);
        }
      }
    }

    // 2. Type text message
    if (message) {
      console.log('✍️ Typing supervisor mention and summary...');
      const inputEl = await page.$('[role="textbox"], [contenteditable="true"], div[aria-label="Message"]');
      if (inputEl) {
        await inputEl.click();
        await page.keyboard.sendCharacter('');
        
        // Type the lines
        const lines = message.split('\n');
        for (let i = 0; i < lines.length; i++) {
          await page.keyboard.type(lines[i], { delay: 10 });
          if (i < lines.length - 1) {
            await page.keyboard.down('Shift');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Shift');
          }
        }
      }
    }

    // 3. Send message
    console.log('🚀 Dispatching to Messenger Group Chat...');
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 3000));

    console.log('✅ Successfully sent report directly into Messenger group chat!');
    await browser.close();
    return { success: true };
  } catch (err) {
    console.error('❌ Direct send error:', err);
    await browser.close();
    return { success: false, error: err.message };
  }
}

// CLI Triggers
if (process.argv.includes('--login')) {
  setupLogin();
} else if (process.argv.includes('--test')) {
  sendDirectToMessengerGroup({
    message: '🤖 Test automation message from SGC UWC System'
  });
}
