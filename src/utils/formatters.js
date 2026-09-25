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
 * - "STL-MANDAUE" / "Mandaue Central" / "Mandaue" -> "MAN"
 * - "STL-CONSOLACION" / "Consolacion" -> "CON"
 * - "Tipolo" -> "TIP"
 * - "Canduman" -> "CAN"
 * - "Ibabao-Estancia" -> "IBA"
 * - "Pagsabungan" -> "PAG"
 * - "Centro" -> "CEN"
 */
export const getSubOfficeAbbreviation = (subOfficeName = '') => {
  if (!subOfficeName || subOfficeName === 'All' || subOfficeName === 'ALL') return 'MAN';
  
  let cleanName = String(subOfficeName).trim();
  
  // Remove leading generic prefixes like "STL-", "STL ", "STL_", "BRANCH-", "SUB-OFFICE-", "OFFICE-"
  cleanName = cleanName.replace(/^(STL|BRANCH|SUB[-_\s]*OFFICE|OFFICE)[\s-_]+/i, '').trim();

  // If the string became empty or was just STL, fallback to alpha characters of original
  if (!cleanName) {
    cleanName = String(subOfficeName).replace(/[^a-zA-Z]/g, '');
  }

  // Get first alphabetical word
  const words = cleanName.split(/[\s-_]+/);
  const firstWord = words.find(w => w.replace(/[^a-zA-Z]/g, '').length > 0) || cleanName;
  const alphaOnly = firstWord.replace(/[^a-zA-Z]/g, '').toUpperCase();
  
  if (alphaOnly.length >= 3) {
    return alphaOnly.slice(0, 3);
  }
  
  const allAlpha = cleanName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (allAlpha.length >= 3) {
    return allAlpha.slice(0, 3);
  }
  
  return (allAlpha + 'MAN').slice(0, 3);
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
  
  // If it's in the format [ABBR]-[YYMMDD]-[6DIGITS] or contains a 6-digit trailer after a hyphen
  const parts = cleanStr.split('-');
  const lastPart = parts[parts.length - 1];
  if (/^\d{6}$/.test(lastPart)) {
    return lastPart;
  }

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
  
  // If seed is in [ABBR]-[YYMMDD]-[6DIGITS] format, extract date and sequence to re-anchor with current sub-office abbreviation
  if (typeof seed === 'string') {
    const match = seed.trim().match(/^([A-Z]{2,4})-(\d{6})-(\d{6})$/i);
    if (match) {
      const [, origAbbr, origDate, origSeq] = match;
      if (origAbbr.toUpperCase() === 'STL' || origAbbr.toUpperCase() !== abbr) {
        return `${abbr}-${origDate}-${origSeq}`;
      }
      return `${abbr}-${origDate}-${origSeq}`;
    }
  }

  // Safely parse date parameter whether passed as Date, ISO string, timestamp, or fallback to now
  const parsedDate = dateObj ? new Date(dateObj) : new Date();
  const d = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yymmdd = `${yy}${mm}${dd}`;

  const sequence = getNumericSequenceCode(seed);
  return `${abbr}-${yymmdd}-${sequence}`;
};

/**
 * Helper to identify inactive/separated teller records (AWOL, Pull-out, Terminated, Pending HR approval)
 */
export const isInactiveTellerRecord = (item) => {
  if (!item) return false;
  const ts = String(
    item.teller_status ||
    item.tellerStatus ||
    item.raw_data?.teller_status ||
    item.raw_data?.tellerStatus ||
    ''
  ).toUpperCase().trim();

  return (
    ts === 'PULL-OUT' ||
    ts === 'AWOL' ||
    ts === 'TERMINATED' ||
    ts === 'PULLOUT' ||
    ts === 'PULLOUTS' ||
    ts === 'APPROVE TELLER STATUS' ||
    item.unclaimed_approval_status === 'PENDING' ||
    item.raw_data?.unclaimed_approval_status === 'PENDING'
  );
};

/**
 * Helper to identify records with pending deletion requests or approved deletions
 */
export const isPendingDeletionRecord = (item) => {
  if (!item) return false;
  const ds = String(item.deletion_request_status || item.deletionRequestStatus || '').toUpperCase().trim();
  return ds === 'PENDING_ADMIN_APPROVAL' || ds === 'PENDING' || ds === 'APPROVED';
};

/**
 * Helper to determine if a returned winning ticket is eligible for attaching remittance proof
 * (Excludes AWOL/Pull-out/Terminated/Inactive, Pending Approval for Deletion, Under Settlement, and Already Remitted)
 */
export const isEligibleForRemittanceProof = (item) => {
  if (!item) return false;
  if (item.receipt_status && item.receipt_status !== 'NO_RECEIPT') return false;
  if (item.isUnderSettlement) return false;
  if (isInactiveTellerRecord(item)) return false;
  if (isPendingDeletionRecord(item)) return false;
  return true;
};


