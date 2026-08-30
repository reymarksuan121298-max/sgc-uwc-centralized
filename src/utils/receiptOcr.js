import Tesseract from 'tesseract.js';

/**
 * Normalizes text lines and cleans up OCR artifacts
 */
const cleanOcrText = (rawText) => {
  if (!rawText) return '';
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .trim();
};

/**
 * Extracts candidate Reference / Control Number from OCR text
 */
export const extractReferenceNumber = (text) => {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Pattern 1: Explicit labels (Ref No, Reference Number, Control No, KPTN, Transaction ID, etc.)
  const labelRegex = /(?:ref(?:erence)?\s*(?:no\.?|id|#|number|code)?|control\s*(?:no\.?|#|code)?|kptn|txn\s*(?:id|no\.?)|transaction\s*(?:id|no\.?|code|#)|trace\s*no\.?|approval\s*code|confirmation\s*(?:no\.?|#))[:\s#\-]*([A-Z0-9\s\-]{5,30})/i;

  for (const line of lines) {
    const match = line.match(labelRegex);
    if (match && match[1]) {
      const candidate = match[1].trim().replace(/\s+/g, ' ');
      // Filter out common false positives like "PHP", "SUCCESS", "COMPLETED"
      if (!/^(php|amount|success|completed|total|pending|paid|sent)$/i.test(candidate) && candidate.length >= 6) {
        return candidate.toUpperCase();
      }
    }
  }

  // Pattern 2: GCash 13-digit standard reference number (e.g. 0001 234 56789 or 0012 345 678901)
  const gcashMatch = text.match(/\b(\d{4}\s*\d{3,4}\s*\d{4,6})\b/);
  if (gcashMatch && gcashMatch[1]) {
    const digitsOnly = gcashMatch[1].replace(/\s+/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 16) {
      return gcashMatch[1].trim();
    }
  }

  // Pattern 3: Palawan / Bank control codes (e.g. PEP-1234567, BDO-89214, PE-98124)
  const codeMatch = text.match(/\b([A-Z]{2,4}[-\s]?[0-9]{5,14})\b/i);
  if (codeMatch && codeMatch[1]) {
    return codeMatch[1].toUpperCase().trim();
  }

  // Pattern 4: Standalone uppercase alphanumeric string of 8-18 chars
  const standaloneMatch = text.match(/\b([A-Z0-9]{8,18})\b/);
  if (standaloneMatch && standaloneMatch[1] && /\d/.test(standaloneMatch[1]) && /[A-Z]/i.test(standaloneMatch[1])) {
    return standaloneMatch[1].toUpperCase().trim();
  }

  return null;
};

/**
 * Extracts candidate payment amount from OCR text
 */
export const extractRemittanceAmount = (text) => {
  if (!text) return null;
  // Match PHP 1,234.00, P 1234.50, Amount: 1,500.00, etc.
  const amountRegex = /(?:php|php\.|p|₱|amount|total(?:\s*amount)?)\s*[:]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/i;
  const match = text.match(amountRegex);
  if (match && match[1]) {
    const cleanNum = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(cleanNum) && cleanNum > 0) {
      return cleanNum;
    }
  }
  return null;
};

/**
 * Extracts PH mobile number (09XXXXXXXXX or +639XXXXXXXXX)
 */
export const extractMobileNumber = (text) => {
  if (!text) return null;
  const mobileMatch = text.match(/(?:\+63|0)9\d{2}[\s\-]?\d{3}[\s\-]?\d{4}/);
  if (mobileMatch && mobileMatch[0]) {
    const cleaned = mobileMatch[0].replace(/[\s\-]/g, '');
    return cleaned.startsWith('+63') ? `0${cleaned.slice(3)}` : cleaned;
  }
  return null;
};

/**
 * Full OCR scan runner on an image File or Base64 / URL
 */
export const scanReceiptProof = async (imageInput, onProgress) => {
  if (!imageInput) return null;

  try {
    const result = await Tesseract.recognize(
      imageInput,
      'eng',
      {
        logger: (m) => {
          if (onProgress && m.status === 'recognizing text' && m.progress) {
            onProgress(Math.round(m.progress * 100));
          }
        }
      }
    );

    const rawText = cleanOcrText(result?.data?.text || '');
    const referenceNumber = extractReferenceNumber(rawText);
    const amount = extractRemittanceAmount(rawText);
    const mobile = extractMobileNumber(rawText);

    return {
      rawText,
      referenceNumber,
      amount,
      mobile,
      confidence: result?.data?.confidence || 0
    };
  } catch (error) {
    console.warn('OCR Scan failed:', error);
    return null;
  }
};
