export * from './dateFormatting';
export { default as dateFormatting } from './dateFormatting';

export const formatCurrency = (val) => {
  return `₱${parseFloat(val ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const superClean = (val) => String(val || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export const getTicketTransId = (item, fallback = '') => {
  if (!item) return fallback;
  return String(item.computedTransId || item.transactionId || item.transId || item.receipt_no || item.ticket_no || item.id || fallback).trim();
};

/**
 * Computes a clean 3-letter abbreviation for a sub-office branch.
 * Example:
 * - "Mandaue Central" / "Mandaue" -> "MAN"
 * - "Tipolo" -> "TIP"
 * - "Canduman" -> "CAN"
 * - "Ibabao-Estancia" -> "IBA"
 * - "Pagsabungan" -> "PAG"
 * - "Centro" -> "CEN"
 */
export const getSubOfficeAbbreviation = (subOfficeName = '') => {
  if (!subOfficeName || subOfficeName === 'All') return 'MAN';
  const cleanName = String(subOfficeName).trim();
  const firstWord = cleanName.split(/[\s-_]+/)[0];
  const alphaOnly = firstWord.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (alphaOnly.length >= 3) {
    return alphaOnly.slice(0, 3);
  }
  return (alphaOnly + 'MAN').slice(0, 3);
};

/**
 * Converts any ticket transId or seed into a clean, deterministic 6-digit sequential numeric transaction code.
 * Example: '082326-UAEVIPTU' -> '892301' (or 6-digit unique code)
 */
export const getNumericSequenceCode = (seed = '') => {
  if (!seed || seed === 'NONE' || seed === 'DEFAULT') {
    return '892301';
  }
  const cleanStr = String(seed).trim();
  
  // If already exactly 6 digits (e.g. '892301'), keep it
  if (/^\d{6}$/.test(cleanStr)) {
    return cleanStr;
  }

  // Create a clean, consistent 6-digit numeric sequence from the string
  let hash = 0;
  for (let i = 0; i < cleanStr.length; i++) {
    hash = (hash * 31 + cleanStr.charCodeAt(i)) % 900000;
  }
  const codeNum = Math.abs(hash) + 100000; // Guarantees 100000 to 999999
  return String(codeNum);
};

/**
 * Generates remittance proof serial number conforming strictly to:
 * [SUB-OFFICE]-[YYMMDD]-[6-DIGIT SEQUENTIAL CODE]
 * Example: MAN-260901-892301
 * - MAN = Sub-office abbreviation (e.g. Mandaue)
 * - 260901 = Actual Current Date (YYMMDD)
 * - 892301 = Unique sequential 6-digit transaction code
 */
export const generateRemittanceSerial = (subOfficeName = 'Mandaue Central', seed = '', dateObj = new Date()) => {
  const abbr = getSubOfficeAbbreviation(subOfficeName);
  
  // Actual current date in YYMMDD format
  const d = dateObj instanceof Date && !isNaN(dateObj.getTime()) ? dateObj : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yymmdd = `${yy}${mm}${dd}`;

  // If already in strict [ABBR]-[YYMMDD]-[6DIGITS] format, return as-is
  if (typeof seed === 'string' && /^[A-Z]{3}-\d{6}-\d{6}$/i.test(seed.trim())) {
    return seed.trim().toUpperCase();
  }

  const sequence = getNumericSequenceCode(seed);
  return `${abbr}-${yymmdd}-${sequence}`;
};

