import { createWorker } from 'tesseract.js';
import jsQR from 'jsqr';

/**
 * Direct QR Code Scanner for STL Lottery Tickets
 */
export const scanQrCodeFromImage = async (imageSrc) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        // 1. Full Image Scan
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        let code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth'
        });

        // 2. Focused Scan on Bottom Half (where STL thermal ticket QR codes are located)
        if (!code && img.height > 200) {
          const bottomCanvas = document.createElement('canvas');
          const startY = Math.floor(img.height * 0.45);
          bottomCanvas.width = img.width;
          bottomCanvas.height = img.height - startY;
          const bCtx = bottomCanvas.getContext('2d');
          bCtx.drawImage(img, 0, startY, img.width, img.height - startY, 0, 0, bottomCanvas.width, bottomCanvas.height);
          const bData = bCtx.getImageData(0, 0, bottomCanvas.width, bottomCanvas.height);
          code = jsQR(bData.data, bData.width, bData.height, {
            inversionAttempts: 'attemptBoth'
          });
        }

        // 3. High-Contrast Scan if still not found
        if (!code) {
          const hcCanvas = document.createElement('canvas');
          hcCanvas.width = img.width;
          hcCanvas.height = img.height;
          const hCtx = hcCanvas.getContext('2d');
          hCtx.drawImage(img, 0, 0);
          const hData = hCtx.getImageData(0, 0, hcCanvas.width, hcCanvas.height);
          const d = hData.data;
          for (let i = 0; i < d.length; i += 4) {
            const brightness = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const v = brightness > 128 ? 255 : 0;
            d[i] = v; d[i + 1] = v; d[i + 2] = v;
          }
          hCtx.putImageData(hData, 0, 0);
          code = jsQR(hData.data, hData.width, hData.height, {
            inversionAttempts: 'attemptBoth'
          });
        }

        if (code && code.data) {
          resolve({
            found: true,
            data: code.data.trim(),
            location: code.location
          });
        } else {
          resolve({ found: false, data: null });
        }
      } catch (err) {
        console.warn('QR scan warning:', err);
        resolve({ found: false, data: null });
      }
    };
    img.onerror = () => resolve({ found: false, data: null });
    img.src = imageSrc;
  });
};

/**
 * Pre-processes an image file on canvas to optimize OCR contrast and readability
 */
export const preprocessImageForOcr = async (imageSrc) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      if (!img.width || !img.height || img.width < 10 || img.height < 10) {
        return resolve(imageSrc);
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Safe scaling bounds to prevent Tesseract wasm sub-scaling errors
      const targetHeight = Math.max(800, Math.min(2000, img.height * 1.5));
      const scale = targetHeight / img.height;
      canvas.width = Math.max(300, Math.round(img.width * scale));
      canvas.height = Math.round(img.height * scale);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to high-contrast grayscale for thermal receipts
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const contrast = avg > 135 ? 255 : 0;
        d[i] = contrast;
        d[i + 1] = contrast;
        d[i + 2] = contrast;
      }
      ctx.putImageData(imgData, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Main QR + OCR Analyzer for Philippine STL Winning Tickets
 */
export const scanTicketImage = async (imageFileOrUrl, onProgress = null) => {
  try {
    let imageSrc = imageFileOrUrl;
    if (imageFileOrUrl instanceof File || imageFileOrUrl instanceof Blob) {
      imageSrc = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = (e) => res(e.target.result);
        reader.readAsDataURL(imageFileOrUrl);
      });
    }

    if (onProgress) onProgress({ status: 'scanning_qr', progress: 0.15 });
    
    // 1. Instant QR Code Analysis
    const qrResult = await scanQrCodeFromImage(imageSrc);
    let qrTransactionId = null;
    if (qrResult.found && qrResult.data) {
      const match = qrResult.data.match(/([0-9]{6}[-\s]?[0-9A-Z]{6,12})/i);
      if (match) {
        let codeStr = match[1].replace(/\s+/g, '-').toUpperCase();
        if (!codeStr.includes('-') && codeStr.length >= 12) {
          codeStr = `${codeStr.slice(0, 6)}-${codeStr.slice(6)}`;
        }
        qrTransactionId = codeStr;
      } else {
        qrTransactionId = qrResult.data;
      }
    }

    if (onProgress) onProgress({ status: 'preprocessing_ocr', progress: 0.35 });
    const optimizedImage = await preprocessImageForOcr(imageSrc);

    if (onProgress) onProgress({ status: 'initializing_worker', progress: 0.5 });
    const worker = await createWorker('eng');

    if (onProgress) onProgress({ status: 'recognizing_text', progress: 0.75 });
    const ret = await worker.recognize(optimizedImage);
    await worker.terminate();

    const rawText = ret?.data?.text || '';
    if (onProgress) onProgress({ status: 'parsing_data', progress: 0.95 });

    const parsed = parseTicketOcrText(rawText);
    const finalTransId = qrTransactionId || parsed.transactionId;

    return {
      success: true,
      originalImage: imageSrc,
      qrFound: qrResult.found,
      qrRawData: qrResult.data,
      rawText,
      confidence: qrResult.found ? 100 : (ret?.data?.confidence || 0),
      ...parsed,
      transactionId: finalTransId,
      code: finalTransId || parsed.code
    };
  } catch (err) {
    console.error('Ticket Scanner Error:', err);
    return {
      success: false,
      error: err.message,
      transactionId: null,
      code: null,
      agent: null,
      draw: null,
      rawText: ''
    };
  }
};

/**
 * Robust Regex Parser tailored for PCSO / Lucky Betplay STL receipts
 */
export const parseTicketOcrText = (text) => {
  if (!text) return {};

  const cleanText = text.replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Transaction Code (e.g., "CODE : 082826-OIUDJW11" or "082826-OIUDJW11" or "082726-UI00CIQ4")
  let transactionId = null;
  let codeMatch = cleanText.match(/CODE\s*[:\.]?\s*([0-9A-Z]{5,8}[-\s]?[0-9A-Z]{6,12})/i);
  if (!codeMatch) {
    codeMatch = cleanText.match(/\b([0-9]{6}-[0-9A-Z]{6,12})\b/i);
  }
  if (!codeMatch) {
    // Fallback: look for 6-digit prefix followed by alphanumeric (e.g. 082826OIUDJW11)
    codeMatch = cleanText.match(/\b(08\d{4}[-\s]?[A-Z0-9]{6,10})\b/i);
  }

  if (codeMatch && codeMatch[1]) {
    transactionId = codeMatch[1].replace(/\s+/g, '-').toUpperCase();
    if (!transactionId.includes('-') && transactionId.length >= 12) {
      transactionId = `${transactionId.slice(0, 6)}-${transactionId.slice(6)}`;
    }
  }

  // 2. Agent Name (e.g., "AGENT : LUCIA, CAPADA")
  let agent = null;
  const agentMatch = cleanText.match(/AGENT\s*[:\.]?\s*([A-Za-z0-9,\.\s\-]+)/i);
  if (agentMatch && agentMatch[1]) {
    agent = agentMatch[1].split('\n')[0].replace(/DATE.*/i, '').trim();
  }

  // 3. Date / Time (e.g., "DATE/TIME : Aug-28-26 15:33" or "2026-08-28")
  let dateTimeStr = null;
  const dateMatch = cleanText.match(/DATE(?:\/TIME)?\s*[:\.]?\s*([A-Za-z0-9-:\s]+)/i);
  if (dateMatch && dateMatch[1]) {
    dateTimeStr = dateMatch[1].split('\n')[0].replace(/DRAW.*/i, '').trim();
  }

  // 4. Draw Time (e.g., "DRAW : 5PM" or "10:30AM" or "8PM")
  let draw = null;
  const drawMatch = cleanText.match(/DRAW\s*[:\.]?\s*([0-9A-Za-z:\s]+)/i);
  if (drawMatch && drawMatch[1]) {
    draw = drawMatch[1].split('\n')[0].replace(/CODE.*/i, '').trim();
  }

  // 5. Total Bet Volume or Winning Amount
  let totalBet = null;
  const totalMatch = cleanText.match(/Total\s*[:\.]?\s*([0-9]+(?:\.[0-9]{2})?)/i);
  if (totalMatch && totalMatch[1]) {
    totalBet = parseFloat(totalMatch[1]);
  }

  // 6. Parsed Bets / Combinations (e.g. "TS3-308 7 3500", "RS3-309 6 500")
  const combinations = [];
  const combiRegex = /(TS3|RS3|S3|TS2|RS2)[-\s]?([0-9]{2,3})\s+([0-9]+(?:\.[0-9]{2})?)\s+([0-9]+(?:\.[0-9]{2})?)/gi;
  let match;
  while ((match = combiRegex.exec(cleanText)) !== null) {
    combinations.push({
      type: match[1].toUpperCase(),
      number: match[2],
      amount: parseFloat(match[3]),
      win: parseFloat(match[4])
    });
  }

  return {
    transactionId,
    code: transactionId,
    agent,
    dateTimeStr,
    draw,
    totalBet,
    combinations,
    company: 'Lucky Betplay Corporation - STL Mandaue'
  };
};
